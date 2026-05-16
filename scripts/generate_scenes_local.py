"""Generate scene images locally on your own GPU.

Default model: FLUX.1 schnell in NF4 quantization. Fits in ~7GB VRAM
on the RTX 4060 mobile, produces near-cloud-FLUX quality, takes ~30-60
seconds per image. License is Apache 2.0 — no Hugging Face token
required for download.

Usage:
    # Single-image test (the right thing to do first):
    python scripts/generate_scenes_local.py --only kn-day-01-airport

    # Batch all 30 once the style is locked:
    python scripts/generate_scenes_local.py

    # Force re-generate even if file exists:
    python scripts/generate_scenes_local.py --force --only kn-day-01-airport

Setup (one time):
    1. Install GPU PyTorch matching your CUDA:
         pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
       (use cu118 if your driver is older; cu124 if newer)
    2. Install the rest:
         pip install -r scripts/requirements_local.txt
    3. First run will download ~12GB of FLUX model files to your HF
       cache (~/.cache/huggingface). Subsequent runs reuse them.

Output: /public/scenes/{chapter-id}.jpg at 1280x720, JPEG quality 92.

If FLUX is too slow or memory-tight on your hardware, pass
`--model sdxl-turbo` to fall back to SDXL Turbo (~3 sec/image,
slightly less painterly but still good for atmospheric scenes).
"""

from __future__ import annotations

import argparse
import re
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
SCENES_OUT = REPO_ROOT / "public" / "scenes"
CATALOG_PATH = REPO_ROOT / "src" / "lib" / "scenes.ts"

# Style suffix appended to every prompt to enforce a cohesive look.
# Tuned for FLUX — it follows prose-style cinematography prompts well.
STYLE = (
    " Cinematic establishing shot, no people in frame, oil painting"
    " aesthetic, painterly brushwork, warm-dark colour palette, deep"
    " shadows, soft focus, atmospheric haze, golden hour light quality"
    " even at night, 35mm lens, shallow depth of field. No text. No"
    " logos. No watermark."
)

WIDTH, HEIGHT = 1280, 720


def parse_catalog(path: Path) -> list[tuple[str, str]]:
    """Heuristic parse of scenes.ts — chapter_id → note pairs."""
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'"(kn-day-\d+-[a-z-]+)"\s*:\s*\{[^}]*?note:\s*"([^"]+)"',
        re.DOTALL,
    )
    return [(cid, note) for cid, note in pattern.findall(text)]


def build_prompt(note: str) -> str:
    """Compose the final image-gen prompt from the scene note + style."""
    return note.strip().rstrip(".") + "." + STYLE


def load_flux_pipeline():
    """Load FLUX.1 schnell with NF4 quantization for ~7GB VRAM use."""
    import torch
    from diffusers import FluxPipeline, FluxTransformer2DModel
    from diffusers import BitsAndBytesConfig as DiffusersBnbConfig
    from transformers import T5EncoderModel
    from transformers import BitsAndBytesConfig as TransformersBnbConfig

    model_id = "black-forest-labs/FLUX.1-schnell"
    print(f"  loading {model_id} (NF4)...")

    transformer_quant = DiffusersBnbConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    transformer = FluxTransformer2DModel.from_pretrained(
        model_id,
        subfolder="transformer",
        quantization_config=transformer_quant,
        torch_dtype=torch.bfloat16,
    )

    t5_quant = TransformersBnbConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    text_encoder_2 = T5EncoderModel.from_pretrained(
        model_id,
        subfolder="text_encoder_2",
        quantization_config=t5_quant,
        torch_dtype=torch.bfloat16,
    )

    pipe = FluxPipeline.from_pretrained(
        model_id,
        transformer=transformer,
        text_encoder_2=text_encoder_2,
        torch_dtype=torch.bfloat16,
    )
    # Offload unused submodules to CPU so the transformer + T5 fit on the GPU
    pipe.enable_model_cpu_offload()
    return pipe


def load_sdxl_turbo_pipeline():
    """Load SDXL Turbo — much faster, less painterly, ~6GB VRAM."""
    import torch
    from diffusers import AutoPipelineForText2Image

    print("  loading stabilityai/sdxl-turbo...")
    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=torch.float16,
        variant="fp16",
    )
    pipe.to("cuda")
    pipe.enable_attention_slicing()
    return pipe


def generate_one(pipe, prompt: str, model: str, seed: int) -> "Image":
    import torch

    generator = torch.Generator(device="cuda").manual_seed(seed)
    if model == "flux":
        # FLUX schnell needs 4 steps, no CFG (guidance_scale=0)
        result = pipe(
            prompt=prompt,
            num_inference_steps=4,
            guidance_scale=0.0,
            height=HEIGHT,
            width=WIDTH,
            generator=generator,
        )
    else:  # sdxl-turbo
        result = pipe(
            prompt=prompt,
            num_inference_steps=4,
            guidance_scale=0.0,
            height=HEIGHT,
            width=WIDTH,
            generator=generator,
        )
    return result.images[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        choices=["flux", "sdxl-turbo"],
        default="flux",
        help="Model to use (default: flux — highest quality)",
    )
    parser.add_argument(
        "--only",
        help="Generate only this chapter id (e.g. kn-day-01-airport)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if the JPG already exists",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed (default: 42 — change to vary the same prompt)",
    )
    args = parser.parse_args()

    SCENES_OUT.mkdir(parents=True, exist_ok=True)
    catalog = parse_catalog(CATALOG_PATH)
    if args.only:
        catalog = [(c, n) for c, n in catalog if c == args.only]
        if not catalog:
            print(f"No catalog entry matches {args.only!r}", file=sys.stderr)
            sys.exit(1)

    print(f"Model: {args.model}")
    print(f"Scenes to generate: {len(catalog)}")
    print()

    # Lazy-load the pipeline only if we actually have work to do
    pipe = None

    for chapter_id, note in catalog:
        out = SCENES_OUT / f"{chapter_id}.jpg"
        if out.exists() and not args.force:
            print(f"  skip {chapter_id} (exists)")
            continue

        if pipe is None:
            t0 = time.time()
            pipe = (
                load_flux_pipeline()
                if args.model == "flux"
                else load_sdxl_turbo_pipeline()
            )
            print(f"  pipeline ready in {time.time() - t0:.1f}s")
            print()

        prompt = build_prompt(note)
        print(f"  synth {chapter_id}")
        print(f"    prompt: {prompt[:140]}...")

        t0 = time.time()
        try:
            image = generate_one(pipe, prompt, args.model, args.seed)
        except Exception as e:
            print(f"    FAILED: {e}", file=sys.stderr)
            continue
        dt = time.time() - t0

        image.save(out, "JPEG", quality=92, optimize=True)
        size_kb = out.stat().st_size // 1024
        print(f"    saved {out.relative_to(REPO_ROOT)} ({size_kb} KB, {dt:.1f}s)")
        print()

    print("Done.")
    print(
        "Next: open the generated JPG in /public/scenes/, check the vibe. "
        "If it lands, set `image: true` for that chapter in src/lib/scenes.ts "
        "and the chapter player will prefer the real image over the gradient."
    )


if __name__ == "__main__":
    main()
