"""Generate pronunciation audio for a Phodi lesson.

Default provider: **Sarvam AI Bulbul-v2**. Sarvam is purpose-built for
Indian languages — the Kannada voices sound native, the API is one
endpoint and one header, and it's an Indian company (which is itself a
story for Indian consumer fintech audiences). Free credits on signup,
then roughly INR 0.30 per 1000 characters.

Fallback provider: Azure Speech (kn-IN-SapnaNeural etc.). Use
`--provider azure` if you've already set that up.

Usage:
    python scripts/generate_audio.py --lang kn --lesson-id kn-001-greetings
    python scripts/generate_audio.py --lang kn --lesson-id kn-001-greetings --provider azure

The script extracts every Kannada string from the lesson (vocab,
multiple-choice prompts, word-bank targets, fill-blank sentences
with the correct answer substituted) and synthesizes one audio file
per string. Output goes to public/audio/{lang}/{lesson-id}/, and
the lesson JSON is updated in place with the resulting audio paths.

Setup:
    1. Sign up at https://dashboard.sarvam.ai
    2. Copy your API key into scripts/.env:
         SARVAM_API_KEY=...
    3. pip install -r scripts/requirements.txt
    4. Run this script.

Open-source alternative if you ever blow past Sarvam's free quota:
AI4Bharat IndicTTS supports Kannada end-to-end with open weights —
requires a local GPU + PyTorch.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests python-dotenv", file=sys.stderr)
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CONTENT_DIR = REPO_ROOT / "content"
PUBLIC_AUDIO_DIR = REPO_ROOT / "public" / "audio"


# --- Sarvam Bulbul-v2 -------------------------------------------------------

SARVAM_VOICE_BY_LANG = {
    "kn": "manisha",
    "ta": "manisha",
    "ml": "manisha",
    "te": "manisha",
    "hi": "manisha",
    "mr": "manisha",
    "bn": "manisha",
    "gu": "manisha",
    "pa": "manisha",
}

SARVAM_LOCALE_BY_LANG = {
    "kn": "kn-IN",
    "ta": "ta-IN",
    "ml": "ml-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
}


def synthesize_sarvam(text: str, voice: str, locale: str, key: str) -> bytes:
    """Returns WAV bytes from Sarvam Bulbul-v2."""
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "text": text,
        "target_language_code": locale,
        "speaker": voice,
        "model": "bulbul:v2",
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "pace": 0.9,
    }
    headers = {
        "api-subscription-key": key,
        "Content-Type": "application/json",
    }
    for attempt in range(3):
        r = requests.post(url, headers=headers, json=payload, timeout=60)
        if r.status_code == 200:
            data = r.json()
            audios = data.get("audios") or []
            if not audios:
                raise RuntimeError(f"Sarvam returned no audio: {data}")
            return base64.b64decode(audios[0])
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2**attempt)
            continue
        raise RuntimeError(f"Sarvam TTS {r.status_code}: {r.text}")
    raise RuntimeError("Sarvam TTS failed after retries")


# --- Azure Speech (fallback) -----------------------------------------------

AZURE_VOICE_BY_LANG = {
    "kn": "kn-IN-SapnaNeural",
    "ta": "ta-IN-PallaviNeural",
    "ml": "ml-IN-SobhanaNeural",
    "te": "te-IN-ShrutiNeural",
    "hi": "hi-IN-SwaraNeural",
    "mr": "mr-IN-AarohiNeural",
    "bn": "bn-IN-TanishaaNeural",
}

AZURE_LOCALE_BY_LANG = {
    "kn": "kn-IN",
    "ta": "ta-IN",
    "ml": "ml-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
}


def synthesize_azure(
    text: str, voice: str, locale: str, key: str, region: str
) -> bytes:
    """Returns MP3 bytes from Azure Speech REST API."""
    endpoint = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    ssml = (
        f'<speak version="1.0" xml:lang="{locale}">'
        f'<voice name="{voice}">'
        f'<prosody rate="-15%">{text}</prosody>'
        f"</voice></speak>"
    )
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "phodi-tts",
    }
    for attempt in range(3):
        r = requests.post(endpoint, headers=headers, data=ssml.encode("utf-8"), timeout=60)
        if r.status_code == 200:
            return r.content
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(2**attempt)
            continue
        raise RuntimeError(f"Azure TTS {r.status_code}: {r.text}")
    raise RuntimeError("Azure TTS failed after retries")


# --- Native-script extraction ----------------------------------------------

SCRIPT_RANGE = {
    "kn": (0x0C80, 0x0CFF),
    "ta": (0x0B80, 0x0BFF),
    "ml": (0x0D00, 0x0D7F),
    "te": (0x0C00, 0x0C7F),
    "hi": (0x0900, 0x097F),
    "mr": (0x0900, 0x097F),
    "bn": (0x0980, 0x09FF),
    "gu": (0x0A80, 0x0AFF),
    "pa": (0x0A00, 0x0A7F),
}


def has_native(text: str, lang: str) -> bool:
    lo, hi = SCRIPT_RANGE[lang]
    return any(lo <= ord(c) <= hi for c in text)


def extract_native_chunk(text: str, lang: str) -> str | None:
    """Pull the dominant native-script substring out of a mixed prompt."""
    lo, hi = SCRIPT_RANGE[lang]
    pattern = re.compile(
        rf"[\u{lo:04X}-\u{hi:04X}]+(?:[\s,.!?।॥\-]+[\u{lo:04X}-\u{hi:04X}]+)*"
    )
    matches = [m.group(0).strip(" ,.!?-") for m in pattern.finditer(text)]
    matches = [m for m in matches if m]
    if not matches:
        return None
    return max(matches, key=len)


def slugify(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(c for c in nfkd if not unicodedata.combining(c))
    s = re.sub(r"[^A-Za-z0-9]+", "-", ascii_text).strip("-").lower()
    return s or "audio"


def find_lesson(course: dict, lesson_id: str) -> tuple[int, int, dict] | None:
    for ui, unit in enumerate(course.get("units", [])):
        for li, lesson in enumerate(unit.get("lessons", [])):
            if lesson.get("id") == lesson_id:
                return ui, li, lesson
    return None


# --- Main -------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", required=True, help="Language code (e.g. kn)")
    parser.add_argument(
        "--lesson-id", required=True, help="Lesson id (e.g. kn-001-greetings)"
    )
    parser.add_argument(
        "--provider",
        default="sarvam",
        choices=["sarvam", "azure"],
        help="TTS provider (default: sarvam)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if audio file already exists",
    )
    args = parser.parse_args()

    if load_dotenv:
        load_dotenv(SCRIPT_DIR / ".env")

    if args.provider == "sarvam":
        key = os.environ.get("SARVAM_API_KEY")
        if not key:
            print(
                "SARVAM_API_KEY must be set (see scripts/.env.example)",
                file=sys.stderr,
            )
            sys.exit(1)
        voice = SARVAM_VOICE_BY_LANG.get(args.lang)
        locale = SARVAM_LOCALE_BY_LANG.get(args.lang)
        if not voice or not locale:
            print(f"No Sarvam voice mapped for language {args.lang}", file=sys.stderr)
            sys.exit(1)
        ext = "wav"

        def synth(text: str) -> bytes:
            return synthesize_sarvam(text, voice, locale, key)

    else:  # azure
        key = os.environ.get("AZURE_SPEECH_KEY")
        region = os.environ.get("AZURE_SPEECH_REGION")
        if not key or not region:
            print(
                "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set",
                file=sys.stderr,
            )
            sys.exit(1)
        voice = AZURE_VOICE_BY_LANG.get(args.lang)
        locale = AZURE_LOCALE_BY_LANG.get(args.lang)
        if not voice or not locale:
            print(f"No Azure voice mapped for language {args.lang}", file=sys.stderr)
            sys.exit(1)
        ext = "mp3"

        def synth(text: str) -> bytes:
            return synthesize_azure(text, voice, locale, key, region)

    course_path = CONTENT_DIR / args.lang / "course.json"
    course = json.loads(course_path.read_text(encoding="utf-8"))
    found = find_lesson(course, args.lesson_id)
    if not found:
        print(f"Lesson {args.lesson_id} not found in {course_path}", file=sys.stderr)
        sys.exit(1)
    ui, li, lesson = found

    out_dir = PUBLIC_AUDIO_DIR / args.lang / args.lesson_id
    out_dir.mkdir(parents=True, exist_ok=True)

    def synth_to_file(text: str, slug: str) -> str:
        audio_path = out_dir / f"{slug}.{ext}"
        public_url = f"/audio/{args.lang}/{args.lesson_id}/{slug}.{ext}"
        if audio_path.exists() and not args.force:
            print(f"  skip {slug} (already exists)")
        else:
            print(f"  synth {slug} <- {text}")
            audio_bytes = synth(text)
            audio_path.write_bytes(audio_bytes)
        return public_url

    def hash_slug(text: str, prefix: str) -> str:
        h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
        return f"{prefix}-{h}"

    print(f"Provider: {args.provider}, voice: {voice}")
    print(f"Generating vocab audio ({len(lesson['vocabulary'])} items)...")
    for vocab in lesson["vocabulary"]:
        slug = slugify(vocab.get("translit") or vocab["native"])
        vocab["audio"] = synth_to_file(vocab["native"], slug)

    print(f"\nGenerating exercise audio ({len(lesson['exercises'])} items)...")
    for ex in lesson["exercises"]:
        if ex["type"] == "multipleChoice":
            chunk = extract_native_chunk(ex["prompt"], args.lang)
            if chunk:
                ex["audio"] = synth_to_file(chunk, hash_slug(chunk, "mc"))
        elif ex["type"] == "wordBank":
            target = ex.get("target")
            if target and has_native(target, args.lang):
                ex["targetAudio"] = synth_to_file(target, hash_slug(target, "wb"))
        elif ex["type"] == "fillBlank":
            parts = ex.get("promptParts", ["", ""])
            answer = ex["options"][ex["correctIndex"]]
            full = (parts[0] + answer + parts[1]).strip()
            full = re.sub(r"\s*\([^)]*\)\s*", " ", full).strip()
            if has_native(full, args.lang):
                ex["audio"] = synth_to_file(full, hash_slug(full, "fb"))

    course["units"][ui]["lessons"][li] = lesson
    course_path.write_text(
        json.dumps(course, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nDone. Audio in {out_dir}. {course_path} updated.")


if __name__ == "__main__":
    main()
