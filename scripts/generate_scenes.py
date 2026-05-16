"""Generate scene images for chapters via a configurable image-gen API.

Until this is run, the chapter player falls back to procedural CSS mood
plates in `src/lib/scenes.ts`. The plates look intentional, but real
generated imagery upgrades the game's polish substantially.

This script supports two providers out of the box. Pick whichever has
free credits you can burn:

  --provider fal      Fal.ai (Flux dev or schnell, ~$0.025-0.04/image)
  --provider together Together AI (FLUX.1 schnell, ~$0.0027/image)

Both are pay-as-you-go and require an API key. Together is significantly
cheaper but Fal is slightly higher quality. The free Pollinations endpoint
that this script was originally pointed at is no longer free.

Usage:
    python scripts/generate_scenes.py --lang kn --provider fal
    python scripts/generate_scenes.py --lang kn --provider fal --only kn-day-01-airport
    python scripts/generate_scenes.py --lang kn --provider together --force

Reads the scene catalog from `src/lib/scenes.ts` (parsed naively as
JSON-ish; you can also pass --catalog scenes.json with the same shape).
Writes images to `public/scenes/{chapter-id}.jpg`. After generation, set
`image: true` for the chapter in `src/lib/scenes.ts` so the component
prefers the file.

Setup:
    pip install -r scripts/requirements.txt
    # plus one of these for your chosen provider:
    pip install fal-client     # for --provider fal
    pip install requests       # already in requirements.txt
    # And set the relevant API key in scripts/.env:
    #   FAL_KEY=...            (for fal)
    #   TOGETHER_API_KEY=...   (for together)

The prompt for each chapter is derived from its `note` field in the
scene catalog, with consistent style suffix tacked on so the output
feels like a cohesive game art direction.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None

try:
    import requests
except ImportError:
    print(
        "Missing dependency: pip install -r scripts/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SCENES_OUT = REPO_ROOT / "public" / "scenes"
CATALOG_PATH = REPO_ROOT / "src" / "lib" / "scenes.ts"

# Style suffix appended to every prompt to enforce a cohesive look.
STYLE = (
    " oil painting, painterly, atmospheric, cinematic establishing shot,"
    " warm-dark palette, deep shadows, soft focus, no people visible,"
    " no text, no logos, 16:9"
)

WIDTH, HEIGHT = 1024, 576


def parse_catalog(path: Path) -> list[tuple[str, str]]:
    """Parse the chapter -> note pairs out of `scenes.ts` heuristically.

    The catalog is a TypeScript file but each entry follows a regular
    shape we can grep for. Returns [(chapter_id, note), ...].
    """
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'"(kn-day-\d+-[a-z-]+)"\s*:\s*\{[^}]*?note:\s*"([^"]+)"',
        re.DOTALL,
    )
    return [(cid, note) for cid, note in pattern.findall(text)]


def build_prompt(note: str) -> str:
    return note.strip().rstrip(".") + "." + STYLE


def synthesize_together(prompt: str, api_key: str) -> bytes:
    """Returns image bytes from Together AI's FLUX.1-schnell."""
    url = "https://api.together.xyz/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "black-forest-labs/FLUX.1-schnell-Free",
        "prompt": prompt,
        "width": WIDTH,
        "height": HEIGHT,
        "steps": 4,
        "n": 1,
        "response_format": "b64_json",
    }
    for attempt in range(3):
        r = requests.post(url, headers=headers, json=payload, timeout=120)
        if r.status_code == 200:
            body = r.json()
            b64 = body["data"][0]["b64_json"]
            return base64.b64decode(b64)
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2**attempt)
            continue
        raise RuntimeError(f"Together TTS {r.status_code}: {r.text[:500]}")
    raise RuntimeError("Together API failed after retries")


def synthesize_fal(prompt: str, api_key: str) -> bytes:
    """Returns image bytes from Fal.ai's FLUX.1 [dev]."""
    # Submit
    url = "https://fal.run/fal-ai/flux/dev"
    headers = {
        "Authorization": f"Key {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "image_size": {"width": WIDTH, "height": HEIGHT},
        "num_inference_steps": 28,
        "enable_safety_checker": False,
    }
    for attempt in range(3):
        r = requests.post(url, headers=headers, json=payload, timeout=180)
        if r.status_code == 200:
            body = r.json()
            image_url = body["images"][0]["url"]
            img = requests.get(image_url, timeout=60)
            img.raise_for_status()
            return img.content
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2**attempt)
            continue
        raise RuntimeError(f"Fal {r.status_code}: {r.text[:500]}")
    raise RuntimeError("Fal API failed after retries")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--provider",
        choices=["fal", "together"],
        default="together",
        help="Image gen provider (default: together — cheapest)",
    )
    parser.add_argument(
        "--only",
        help="Only generate this single chapter id (e.g. kn-day-01-airport)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if the JPG already exists",
    )
    args = parser.parse_args()

    if load_dotenv:
        load_dotenv(SCRIPT_DIR / ".env")

    if args.provider == "together":
        key = os.environ.get("TOGETHER_API_KEY")
        if not key:
            print("TOGETHER_API_KEY not set (see scripts/.env.example)", file=sys.stderr)
            sys.exit(1)
        synth = lambda p: synthesize_together(p, key)
    else:
        key = os.environ.get("FAL_KEY")
        if not key:
            print("FAL_KEY not set (see scripts/.env.example)", file=sys.stderr)
            sys.exit(1)
        synth = lambda p: synthesize_fal(p, key)

    SCENES_OUT.mkdir(parents=True, exist_ok=True)
    catalog = parse_catalog(CATALOG_PATH)
    print(f"Provider: {args.provider}, {len(catalog)} scenes in catalog")
    print()

    for chapter_id, note in catalog:
        if args.only and chapter_id != args.only:
            continue
        out = SCENES_OUT / f"{chapter_id}.jpg"
        if out.exists() and not args.force:
            print(f"  skip {chapter_id} (exists)")
            continue
        prompt = build_prompt(note)
        print(f"  synth {chapter_id}")
        print(f"      prompt: {prompt[:120]}...")
        try:
            data = synth(prompt)
            out.write_bytes(data)
            print(f"      saved {out.relative_to(REPO_ROOT)} ({len(data) // 1024} KB)")
        except Exception as e:
            print(f"      FAILED: {e}", file=sys.stderr)

    print("\nDone.")
    print(
        "Next: for each generated scene, set `image: true` on the matching "
        "entry in src/lib/scenes.ts so the component renders the JPG."
    )


if __name__ == "__main__":
    main()
