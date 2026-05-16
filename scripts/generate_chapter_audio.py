"""Generate expressive audio for a Phodi chapter.

Unlike `generate_audio.py` (which voices lessons in one neutral voice),
this script reads `voices.json` for the language and synthesizes each
NPC line with the speaker's *base profile* plus an *emotion modifier*
stacked on top:

    final_pace      = base.pace      + emotion.paceDelta
    final_pitch     = base.pitch     + emotion.pitchDelta
    final_loudness  = base.loudness  + emotion.loudnessDelta

So Ravi the pushy auto driver pricing his rip-off is the same speaker
voice as Ravi accepting your meter request — but rendered with different
Sarvam intonation parameters.

Usage:
    python scripts/generate_chapter_audio.py \\
        --lang kn --chapter-id kn-day-01-airport

Reads:   content/{lang}/voices.json
         content/{lang}/chapters/{chapter-id stripped to file}.json
Writes:  public/audio/{lang}/chapters/{chapter-id}/{slug}.wav
Patches: the chapter JSON in-place with audio paths.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
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
    print("Missing dependency: pip install -r scripts/requirements.txt", file=sys.stderr)
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CONTENT_DIR = REPO_ROOT / "content"
PUBLIC_AUDIO_DIR = REPO_ROOT / "public" / "audio"


LANG_LOCALE = {
    "kn": "kn-IN",
    "ta": "ta-IN",
    "ml": "ml-IN",
    "te": "te-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
}


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def synthesize_sarvam(
    text: str,
    profile: dict,
    emotion: dict,
    locale: str,
    api_key: str,
) -> bytes:
    """Synthesize one line through Sarvam Bulbul-v2 with intonation."""
    pace = clamp(profile.get("pace", 1.0) + emotion.get("paceDelta", 0), 0.3, 3.0)
    pitch = clamp(profile.get("pitch", 0.0) + emotion.get("pitchDelta", 0), -0.75, 0.75)
    loudness = clamp(
        profile.get("loudness", 1.0) + emotion.get("loudnessDelta", 0), 0.3, 3.0
    )

    payload = {
        "text": text,
        "target_language_code": locale,
        "speaker": profile["speaker"],
        "model": profile.get("model", "bulbul:v2"),
        "speech_sample_rate": "22050",
        "output_audio_codec": "wav",
        "enable_preprocessing": True,
        "pace": pace,
        "pitch": pitch,
        "loudness": loudness,
    }
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json",
    }
    for attempt in range(3):
        r = requests.post(
            "https://api.sarvam.ai/text-to-speech",
            headers=headers,
            json=payload,
            timeout=60,
        )
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


def hash_slug(speaker_id: str, emotion: str, text: str) -> str:
    """Deterministic filename per (speaker, emotion, text)."""
    h = hashlib.sha1(f"{speaker_id}|{emotion}|{text}".encode("utf-8")).hexdigest()[:10]
    return f"{speaker_id}-{emotion}-{h}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--chapter-id", required=True)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if audio file already exists",
    )
    args = parser.parse_args()

    if load_dotenv:
        load_dotenv(SCRIPT_DIR / ".env")
    api_key = os.environ.get("SARVAM_API_KEY")
    if not api_key:
        print("SARVAM_API_KEY must be set (see scripts/.env.example)", file=sys.stderr)
        sys.exit(1)

    locale = LANG_LOCALE.get(args.lang)
    if not locale:
        print(f"No locale mapped for {args.lang}", file=sys.stderr)
        sys.exit(1)

    voices_path = CONTENT_DIR / args.lang / "voices.json"
    voices_doc = json.loads(voices_path.read_text(encoding="utf-8"))
    profiles_by_id = {p["id"]: p for p in voices_doc["profiles"]}
    emotion_mods = voices_doc.get("emotionModifiers", {})

    # Chapter file is named after the chapter id with the lang prefix stripped
    # (kn-day-01-airport.json lives at chapters/01-airport.json, for example).
    chapters_dir = CONTENT_DIR / args.lang / "chapters"
    chapter_path = None
    for f in chapters_dir.glob("*.json"):
        try:
            doc = json.loads(f.read_text(encoding="utf-8"))
            if doc.get("id") == args.chapter_id:
                chapter_path = f
                chapter = doc
                break
        except json.JSONDecodeError:
            continue
    if not chapter_path:
        print(f"Chapter {args.chapter_id} not found in {chapters_dir}", file=sys.stderr)
        sys.exit(1)

    out_dir = PUBLIC_AUDIO_DIR / args.lang / "chapters" / args.chapter_id
    out_dir.mkdir(parents=True, exist_ok=True)

    npc_beats = [b for b in chapter["beats"] if b.get("kind") == "npc"]
    print(f"Chapter: {chapter['title']} ({len(npc_beats)} NPC lines)")
    print(f"Voices: {', '.join(p['id'] for p in voices_doc['profiles'])}")
    print()

    for beat in chapter["beats"]:
        if beat.get("kind") != "npc":
            continue
        speaker_id = beat["speakerId"]
        profile = profiles_by_id.get(speaker_id)
        if not profile:
            print(f"  WARN: no profile for {speaker_id}, skipping line", file=sys.stderr)
            continue
        emotion = beat.get("emotion", "neutral")
        modifier = emotion_mods.get(emotion, {})
        slug = hash_slug(speaker_id, emotion, beat["native"])
        wav_path = out_dir / f"{slug}.wav"
        public_url = f"/audio/{args.lang}/chapters/{args.chapter_id}/{slug}.wav"

        if wav_path.exists() and not args.force:
            print(f"  skip {slug} ({profile['name']}, {emotion})")
        else:
            print(
                f"  synth {slug} ({profile['name']}, {emotion}) "
                f"pace={profile.get('pace', 1.0) + modifier.get('paceDelta', 0):.2f} "
                f"pitch={profile.get('pitch', 0) + modifier.get('pitchDelta', 0):.2f} "
                f"loud={profile.get('loudness', 1.0) + modifier.get('loudnessDelta', 0):.2f}"
            )
            print(f"      <- {beat['native']}")
            audio_bytes = synthesize_sarvam(
                beat["native"], profile, modifier, locale, api_key
            )
            wav_path.write_bytes(audio_bytes)

        beat["audio"] = public_url

    chapter_path.write_text(
        json.dumps(chapter, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nDone. Audio in {out_dir}.")
    print(f"Updated {chapter_path}.")


if __name__ == "__main__":
    main()
