"""Generate consistent character portraits via local DreamShaper.

Each character in scripts/character_prompts.py has a fixed physical
template + a locked seed. Same template + same seed → same face across
generations. We render each character in both styles (painterly + comic).

Output: /public/portraits/{style}/{character_id}.jpg at 512x512.

Usage:
    # All characters, painterly:
    python scripts/generate_portraits_local.py --style painterly
    # One character to iterate:
    python scripts/generate_portraits_local.py --only anika --style comic
    # Both styles in one go:
    python scripts/generate_portraits_local.py --style both
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
PORTRAITS_OUT = REPO_ROOT / "public" / "portraits"

# Style suffixes — kept in sync with generate_scenes_local.py for visual
# coherence between scenes and portraits in the same style.
STYLE_PAINTERLY = (
    ", oil painting portrait, painterly brushwork, atmospheric, cinematic"
    " lighting, warm-dark palette, deep shadows, soft focus, brushstroke"
    " texture, gouache, moody, by Atey Ghailan, by Sparth, concept art,"
    " character portrait, head and shoulders, looking at viewer, no text"
)

STYLE_COMIC = (
    ", graphic novel character portrait, bold black ink outlines,"
    " cel-shaded, flat colours, dramatic shadows, by Sean Murphy, by Mike"
    " Mignola, by Tomer Hanuka, comic book art, head and shoulders, looking"
    " at viewer, no text, no speech bubbles"
)

PORTRAIT_SIZE = 512


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        help="Generate only this character id (e.g. anika)",
    )
    parser.add_argument(
        "--style",
        choices=["painterly", "comic", "both"],
        default="painterly",
        help="Style variant to render (default: painterly)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if the JPG already exists",
    )
    args = parser.parse_args()

    sys.path.insert(0, str(SCRIPT_DIR))
    from character_prompts import CHARACTERS
    from generate_scenes_local import load_dreamshaper_pipeline

    characters = CHARACTERS
    if args.only:
        characters = [c for c in characters if c[0] == args.only]
        if not characters:
            print(f"No character {args.only!r}", file=sys.stderr)
            sys.exit(1)

    styles = ["painterly", "comic"] if args.style == "both" else [args.style]
    style_suffixes = {"painterly": STYLE_PAINTERLY, "comic": STYLE_COMIC}

    print(f"Characters: {len(characters)}, styles: {', '.join(styles)}")
    print()

    pipe = None
    for style in styles:
        out_dir = PORTRAITS_OUT / style
        out_dir.mkdir(parents=True, exist_ok=True)

        for char_id, name, seed, template in characters:
            out = out_dir / f"{char_id}.jpg"
            if out.exists() and not args.force:
                print(f"  skip {char_id} {style} (exists)")
                continue

            if pipe is None:
                t0 = time.time()
                pipe = load_dreamshaper_pipeline()
                print(f"  pipeline ready in {time.time() - t0:.1f}s")
                print()

            import torch

            prompt = template + style_suffixes[style]
            generator = torch.Generator(device="cuda").manual_seed(seed)
            print(f"  synth {char_id} ({name}, {style}) seed={seed}")
            t0 = time.time()
            try:
                image = pipe(
                    prompt=prompt,
                    num_inference_steps=6,
                    guidance_scale=2.5,
                    height=PORTRAIT_SIZE,
                    width=PORTRAIT_SIZE,
                    generator=generator,
                ).images[0]
            except Exception as e:
                print(f"    FAILED: {e}", file=sys.stderr)
                continue
            dt = time.time() - t0
            image.save(out, "JPEG", quality=92, optimize=True)
            size_kb = out.stat().st_size // 1024
            print(f"    saved {out.relative_to(REPO_ROOT)} ({size_kb} KB, {dt:.1f}s)")
            print()

    print("Done.")


if __name__ == "__main__":
    main()
