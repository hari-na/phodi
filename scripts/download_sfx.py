"""Download CC0 / CC-BY ambient SFX loops for chapter backgrounds.

Source: Pixabay (CC0 royalty-free sounds, no attribution required).
Each loop is ~30-60 seconds and gets played on a loop under each chapter.

Pixabay sound URLs follow the pattern:
    https://cdn.pixabay.com/audio/<yyyy>/<mm>/<dd>/audio_<id>.mp3

Where the IDs are stable per asset.

Run:
    python scripts/download_sfx.py

Files land in /public/sfx/. Re-runs skip existing files unless --force.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
SFX_OUT = REPO_ROOT / "public" / "sfx"

# (filename, description, public CC0 url)
# All Pixabay-hosted, CC0 (free for commercial use, no attribution required).
LOOPS = [
    ("rain-night.mp3",
     "heavy night rain on pavement",
     "https://cdn.pixabay.com/audio/2022/03/15/audio_4f33c45b5d.mp3"),
    ("ac-hum.mp3",
     "indoor AC hum",
     "https://cdn.pixabay.com/audio/2023/06/26/audio_27a3617cca.mp3"),
    ("chai-stall.mp3",
     "Indian street ambient with kettle",
     "https://cdn.pixabay.com/audio/2023/09/05/audio_28b3f95b27.mp3"),
    ("quiet-room.mp3",
     "near-silent indoor room tone",
     "https://cdn.pixabay.com/audio/2022/03/24/audio_4036c5d8a4.mp3"),
    ("empty-room.mp3",
     "echoing empty apartment",
     "https://cdn.pixabay.com/audio/2022/10/30/audio_0a93da0070.mp3"),
    ("birds-leaves.mp3",
     "morning birds and gentle leaves",
     "https://cdn.pixabay.com/audio/2022/03/10/audio_a82c0a2b40.mp3"),
    ("street-day.mp3",
     "Indian street traffic, distant horns",
     "https://cdn.pixabay.com/audio/2024/02/03/audio_55ee5cd00f.mp3"),
    ("market.mp3",
     "bustling Indian market",
     "https://cdn.pixabay.com/audio/2022/08/02/audio_6b25e08bef.mp3"),
    ("pub.mp3",
     "rooftop pub chatter and glasses",
     "https://cdn.pixabay.com/audio/2022/03/19/audio_3a4bab8e34.mp3"),
    ("canteen.mp3",
     "indoor cafeteria chatter and plates",
     "https://cdn.pixabay.com/audio/2022/03/19/audio_3a4bab8e34.mp3"),
    ("kitchen.mp3",
     "Indian home kitchen, gas stove and utensils",
     "https://cdn.pixabay.com/audio/2024/02/27/audio_3c8c5c5b32.mp3"),
    ("bookstore.mp3",
     "quiet bookstore, occasional page turn",
     "https://cdn.pixabay.com/audio/2022/03/24/audio_4036c5d8a4.mp3"),
    ("park-morning.mp3",
     "park birdsong with distant joggers",
     "https://cdn.pixabay.com/audio/2022/03/10/audio_a82c0a2b40.mp3"),
    ("karaga-drums.mp3",
     "Indian festival drums and crowd",
     "https://cdn.pixabay.com/audio/2022/06/15/audio_b9be3fc34a.mp3"),
    ("family-home.mp3",
     "Indian family home ambient, fan and quiet chatter",
     "https://cdn.pixabay.com/audio/2023/06/26/audio_27a3617cca.mp3"),
    ("temple.mp3",
     "South Indian temple bells and chanting",
     "https://cdn.pixabay.com/audio/2024/01/13/audio_aa6ab9c0f8.mp3"),
    ("balcony-night.mp3",
     "distant city night ambient from balcony",
     "https://cdn.pixabay.com/audio/2022/03/15/audio_4f33c45b5d.mp3"),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if the file exists",
    )
    args = parser.parse_args()

    SFX_OUT.mkdir(parents=True, exist_ok=True)
    successes, failures = 0, 0
    for filename, description, url in LOOPS:
        out = SFX_OUT / filename
        if out.exists() and not args.force:
            print(f"  skip {filename}")
            continue
        print(f"  fetch {filename}  <- {description}")
        try:
            r = requests.get(url, timeout=60, stream=True)
            r.raise_for_status()
            with out.open("wb") as f:
                for chunk in r.iter_content(64 * 1024):
                    f.write(chunk)
            size_kb = out.stat().st_size // 1024
            print(f"    saved ({size_kb} KB)")
            successes += 1
        except Exception as e:
            print(f"    FAILED: {e}", file=sys.stderr)
            failures += 1

    print(f"\nDone. {successes} downloaded, {failures} failed.")
    if failures:
        print(
            "Failed downloads can be replaced manually. Drop any CC0 MP3 "
            "into public/sfx/ with the same filename and it'll just work."
        )


if __name__ == "__main__":
    main()
