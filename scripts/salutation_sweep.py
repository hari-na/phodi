"""One-shot script: replace gendered "sir" salutation in chapter dialogue.

Rules (only touches English `en` fields and the `setting` blurb — never the
Kannada native or transliteration, which are the actual recorded TTS text):

  • Casual transactional NPCs (auto driver, broker, watchman, chai vendor,
    cook, neighbour, pharmacist, market sellers, etc.) → replace with
    "boss". Bangalore-natural, gender-neutral, preserves the local register.

  • Formal family-of-Anika contexts (Days 21, 22, 27, 28) → drop the
    salutation. "Take some bisi bele bath, sir." becomes "Take some bisi
    bele bath." In-laws addressing a partner-of-their-daughter as anything
    feels off without a real relationship word.

  • Day 17 (Cubbon Park) is the meta-beat where Anika corrects the player
    for being too formal. We rewrite "sir" → "boss" inside that exchange
    too — the joke still works ("Not 'boss.' Too formal.").

The Kannada native + translit fields keep "sār" / "ಸಾರ್" — that's the
language's actual honorific and the audio files already speak it. The
English translation now says "boss"; the audio still says "sār". That
mismatch is harmless: "boss" is the right gloss for "sār" in this
casual register.

Run once:
    python scripts/salutation_sweep.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent
CHAPTERS_DIR = REPO_ROOT / "content" / "kn" / "chapters"

# Chapters where the player is being addressed by an in-law / partner's
# family — dropping the salutation reads more natural than "boss" would.
FORMAL_CHAPTERS = {
    "21-amma.json",
    "22-misstep.json",
    "27-apology.json",
    "28-ugadi.json",
}

# Compiled patterns. We do them in a specific order so commas/spaces don't
# pile up after the drop.
DROP_PATTERNS = [
    (re.compile(r",\s*[Ss]ir\b\.?"), ""),   # ", sir." or ", sir"
    (re.compile(r"\b[Ss]ir,\s*"), ""),       # "Sir, "
    (re.compile(r"\s+[Ss]ir\b\.?"), ""),     # " sir" or " sir."
    (re.compile(r"\b[Ss]ir\b\.?\s*"), ""),   # standalone "Sir"
]

# For casual chapters, we want a replacement, not a drop.
REPLACE_PATTERNS = [
    # "Sir, ..." at start of a sentence → "Boss, ..."
    (re.compile(r"\b[Ss]ir(?=,)"), lambda m: "Boss" if m.group(0)[0].isupper() else "boss"),
    # "..., sir." / "..., Sir." → "..., boss."
    (re.compile(r"(?<=,\s)[Ss]ir\b"), "boss"),
    # "...sir" preceded by a space, not followed by a letter → "boss"
    (re.compile(r"(?<=\s)[Ss]ir\b"), lambda m: "boss" if m.group(0)[0].islower() else "Boss"),
    # "Sir? ..." (sentence-start question) → "Boss?"
    (re.compile(r"\b[Ss]ir(?=\?)"), lambda m: "Boss" if m.group(0)[0].isupper() else "boss"),
    # "Sir." / "Sir!" as a standalone sentence → "Boss." / "Boss!"
    (re.compile(r"\b[Ss]ir(?=[.!])"), lambda m: "Boss" if m.group(0)[0].isupper() else "boss"),
    # "Sir " at sentence start, followed by space + something → "Boss "
    (re.compile(r"(?<![A-Za-z])[Ss]ir(?=\s)"), lambda m: "Boss" if m.group(0)[0].isupper() else "boss"),
]


def transform_en(text: str, formal: bool) -> str:
    """Apply either drop-or-replace to one English string."""
    if not text:
        return text
    patterns = DROP_PATTERNS if formal else REPLACE_PATTERNS
    out = text
    for rx, sub in patterns:
        if callable(sub):
            out = rx.sub(sub, out)
        else:
            out = rx.sub(sub, out)
    # Collapse any double spaces / orphan commas the drop may have left.
    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r"\s+([.,!?])", r"\1", out)
    out = re.sub(r",\s*\.", ".", out)
    out = re.sub(r"^\s*,\s*", "", out)
    return out.strip()


def walk_beats(beats, formal: bool) -> int:
    """Mutate beats in-place. Returns number of `en` fields changed."""
    changed = 0
    for beat in beats:
        if not isinstance(beat, dict):
            continue
        kind = beat.get("kind")
        if kind == "npc" and "en" in beat:
            new = transform_en(beat["en"], formal)
            if new != beat["en"]:
                beat["en"] = new
                changed += 1
        elif kind == "choice":
            for choice in beat.get("choices", []):
                if "en" in choice:
                    new = transform_en(choice["en"], formal)
                    if new != choice["en"]:
                        choice["en"] = new
                        changed += 1
    return changed


def main() -> None:
    if not CHAPTERS_DIR.exists():
        print(f"chapters dir not found: {CHAPTERS_DIR}", file=sys.stderr)
        sys.exit(1)

    total_files = 0
    total_changes = 0
    for path in sorted(CHAPTERS_DIR.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        formal = path.name in FORMAL_CHAPTERS
        beats = data.get("beats", [])
        changes = walk_beats(beats, formal)

        # Also sweep `setting` (the chapter intro blurb) — it's English-only.
        setting = data.get("setting")
        if isinstance(setting, str):
            new_setting = transform_en(setting, formal)
            if new_setting != setting:
                data["setting"] = new_setting
                changes += 1

        if changes:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            total_files += 1
            total_changes += changes
            tag = "drop" if formal else "boss"
            print(f"  {path.name}: {changes} change(s) [{tag}]")

    print()
    print(f"Touched {total_files} file(s), {total_changes} en-string change(s).")


if __name__ == "__main__":
    main()
