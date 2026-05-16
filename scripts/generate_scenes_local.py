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

# Load HF_TOKEN from scripts/.env if present so FLUX.1 schnell (gated repo)
# can authenticate without the user running `huggingface-cli login`.
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass
import os as _os
if _os.environ.get("HF_TOKEN") and not _os.environ.get("HUGGING_FACE_HUB_TOKEN"):
    _os.environ["HUGGING_FACE_HUB_TOKEN"] = _os.environ["HF_TOKEN"]

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SCENES_OUT = REPO_ROOT / "public" / "scenes"
CATALOG_PATH = REPO_ROOT / "src" / "lib" / "scenes.ts"

# Style suffixes per model. FLUX has a 256-token T5 budget and reads
# prose. SDXL Turbo has a 77-token CLIP budget — leads must be style
# keywords, not cinematography boilerplate.
STYLE_FLUX = (
    " Cinematic establishing shot, no people in frame, oil painting"
    " aesthetic, painterly brushwork, warm-dark colour palette, deep"
    " shadows, soft focus, atmospheric haze, golden hour light quality"
    " even at night, 35mm lens, shallow depth of field. No text. No"
    " logos. No watermark."
)

# For SDXL Turbo — leads with painterly keywords so they survive the
# 77-token truncation. Negative motifs (no people, no text) implicit.
STYLE_SDXL = (
    ", oil painting, painterly brushwork, atmospheric, cinematic,"
    " warm-dark palette, deep shadows, soft focus, no people, by"
    " Jeremy Mann, by Lars Lerin"
)

# For DreamShaper XL Lightning — painterly fine-tune of SDXL, supports
# higher CFG so style prompts have real influence. Leads with painterly
# keywords for safety even though the model's bias is already painterly.
# Bangalore-locality anchors live in each chapter's `note` field; the
# style suffix only carries painterly + Indian-tropical-urban cues that
# apply everywhere in the arc.
STYLE_DREAMSHAPER = (
    ", Bangalore India, South Indian tropical urban setting, oil"
    " painting, painterly brushwork, atmospheric, cinematic lighting,"
    " warm-dark colour palette, deep shadows, soft focus,"
    " brushstroke texture, gouache, moody, by Atey Ghailan, by Sparth,"
    " concept art, illustration, no text, no logos, no watermark"
)

# Comic style suffix — bold black ink, cel-shaded, flat warm colours,
# graphic-novel aesthetic. Same DreamShaper model, different style cues.
# References to Sean Murphy / Mike Mignola / Tomer Hanuka push the model
# toward moody noir graphic novel territory.
STYLE_DREAMSHAPER_COMIC = (
    ", Bangalore India, South Indian tropical urban setting, graphic"
    " novel illustration, bold black ink outlines, cel-shaded,"
    " flat colours, dramatic panel composition, atmospheric noir,"
    " warm-dark palette, deep ink shadows, by Sean Murphy, by Mike"
    " Mignola, by Tomer Hanuka, comic book art, no text, no speech"
    " bubbles, no logos, no watermark"
)

WIDTH, HEIGHT = 1024, 576


def parse_catalog(path: Path) -> list[tuple[str, str]]:
    """Heuristic parse of scenes.ts — chapter_id → note pairs."""
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'"(kn-day-\d+-[a-z-]+)"\s*:\s*\{[^}]*?note:\s*"([^"]+)"',
        re.DOTALL,
    )
    return [(cid, note) for cid, note in pattern.findall(text)]


def build_prompt(note: str, model: str = "flux", style_variant: str = "painterly") -> str:
    """Compose the final image-gen prompt from the scene note + style.

    `style_variant` only affects DreamShaper — painterly (default) gives
    oil-painting concept-art; comic gives graphic-novel ink illustration.
    """
    if model == "flux":
        style = STYLE_FLUX
    elif model == "dreamshaper":
        style = (
            STYLE_DREAMSHAPER_COMIC
            if style_variant == "comic"
            else STYLE_DREAMSHAPER
        )
    else:
        style = STYLE_SDXL
    return note.strip().rstrip(".") + style


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


def load_dreamshaper_pipeline():
    """Load DreamShaper XL Lightning from local Civitai-downloaded safetensors.

    Painterly fine-tune of SDXL Lightning. Supports CFG > 1, so style prompts
    have real influence. Uses DPM++ SDE Karras (the sampler the model is
    named for / trained on).

    Note: `from_single_file` insists on fetching SDXL base 1.0 config files
    from HF, which is unreliable. Instead we load SDXL Turbo's working
    pipeline as the architectural scaffold (it's already cached), then
    swap in DreamShaper's UNet and VAE weights via diffusers' built-in
    LDM-to-diffusers converters. Text encoders stay from SDXL Turbo
    (architecturally compatible).
    """
    import torch
    from diffusers import (
        StableDiffusionXLPipeline,
        DPMSolverSinglestepScheduler,
    )
    from diffusers.loaders.single_file_utils import (
        convert_ldm_unet_checkpoint,
        convert_ldm_vae_checkpoint,
    )
    from safetensors.torch import load_file

    path = REPO_ROOT / "models" / "dreamshaper-xl-lightning.safetensors"
    if not path.exists():
        raise FileNotFoundError(
            f"Expected DreamShaper at {path}. "
            "Download from Civitai first (see README in scripts/)."
        )

    print(f"  loading SDXL Turbo as scaffold (cached)...")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=torch.float16,
        variant="fp16",
        local_files_only=True,
    )

    print(f"  loading {path.name} weights...")
    state_dict = load_file(str(path))

    print(f"  converting UNet weights LDM → diffusers...")
    unet_converted = convert_ldm_unet_checkpoint(state_dict, pipe.unet.config)
    pipe.unet.load_state_dict(unet_converted, strict=False)

    print(f"  converting VAE weights LDM → diffusers...")
    vae_converted = convert_ldm_vae_checkpoint(state_dict, pipe.vae.config)
    pipe.vae.load_state_dict(vae_converted, strict=False)

    print(f"  setting DPM++ SDE Karras scheduler...")
    pipe.scheduler = DPMSolverSinglestepScheduler.from_config(
        pipe.scheduler.config,
        use_karras_sigmas=True,
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
    elif model == "dreamshaper":
        # DreamShaper XL Lightning: 6 steps, low CFG works
        result = pipe(
            prompt=prompt,
            num_inference_steps=6,
            guidance_scale=2.0,
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
        choices=["flux", "sdxl-turbo", "dreamshaper"],
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
    parser.add_argument(
        "--style",
        choices=["painterly", "comic"],
        default="painterly",
        help="Visual style variant (default: painterly oil/concept art)",
    )
    args = parser.parse_args()

    # Each style writes to its own subdirectory so we can ship both.
    out_dir = SCENES_OUT / args.style
    out_dir.mkdir(parents=True, exist_ok=True)
    catalog = parse_catalog(CATALOG_PATH)
    if args.only:
        catalog = [(c, n) for c, n in catalog if c == args.only]
        if not catalog:
            print(f"No catalog entry matches {args.only!r}", file=sys.stderr)
            sys.exit(1)

    print(f"Model: {args.model}, style: {args.style}")
    print(f"Output: {out_dir.relative_to(REPO_ROOT)}")
    print(f"Scenes to generate: {len(catalog)}")
    print()

    # Lazy-load the pipeline only if we actually have work to do
    pipe = None

    for chapter_id, note in catalog:
        out = out_dir / f"{chapter_id}.jpg"
        if out.exists() and not args.force:
            print(f"  skip {chapter_id} (exists)")
            continue

        if pipe is None:
            t0 = time.time()
            if args.model == "flux":
                pipe = load_flux_pipeline()
            elif args.model == "dreamshaper":
                pipe = load_dreamshaper_pipeline()
            else:
                pipe = load_sdxl_turbo_pipeline()
            print(f"  pipeline ready in {time.time() - t0:.1f}s")
            print()

        prompt = build_prompt(note, args.model, args.style)
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
