"""Download real ambient SFX from Freesound.org for each chapter.

Replaces the synthesised placeholder loops with actual recordings.
(Earlier version of this script targeted Pixabay's "API" but Pixabay
doesn't expose audio search programmatically — image/video only.
Freesound is the free CC-BY/CC0 standard for ambient recordings of
this kind.)

Setup:
    1. Get a free API key at https://freesound.org/apiv2/apply/
       (15 sec signup, click "Create new API credential").
    2. Add to scripts/.env:
         FREESOUND_API_KEY=your_key_here

Usage:
    # Download everything to public/sfx/
    python scripts/download_sfx.py
    # Just one chapter (useful when iterating on a query):
    python scripts/download_sfx.py --only kn-day-01-airport
    # Re-download even if the file already exists:
    python scripts/download_sfx.py --force

What it does for each chapter:
    1. Search Freesound for the curated query (see SFX_QUERIES below).
    2. Filter to clips between 20-120 seconds (good loop length).
    3. Pick the top-scored result.
    4. Download the high-quality MP3 preview to the target path.

If a search returns nothing or download fails, the chapter keeps its
current SFX file — the script logs and moves on.

Re-tuning a chapter:
    Edit the query string in SFX_QUERIES, run with --only --force.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SFX_DIR = REPO_ROOT / "public" / "sfx"
SFX_DIR.mkdir(parents=True, exist_ok=True)

FREESOUND_API = "https://freesound.org/apiv2/search/text/"

# Curated per-chapter mapping. `file` is the output filename (matches the
# paths in src/lib/sfx.ts). `query` is the Freesound search string —
# generic enough to return decent matches, specific enough that the top
# hit usually fits.
SFX_QUERIES: dict[str, dict[str, str]] = {
    "kn-day-01-airport":      {"file": "rain-night.mp3",     "query": "heavy rain night street"},
    "kn-day-02-hotel":        {"file": "ac-hum.mp3",         "query": "fan hum"},
    "kn-day-03-chai":         {"file": "chai-stall.mp3",     "query": "morning street ambience"},
    "kn-day-04-broker-call":  {"file": "quiet-room.mp3",     "query": "quiet room interior ambient"},
    "kn-day-05-first-flat":   {"file": "empty-room.mp3",     "query": "empty apartment ambience"},
    "kn-day-06-second-flat":  {"file": "birds-leaves.mp3",   "query": "garden birds leaves morning"},
    "kn-day-07-deposit":      {"file": "birds-leaves.mp3",   "query": "garden birds leaves morning"},
    "kn-day-08-moving-in":    {"file": "street-day.mp3",     "query": "residential street daytime"},
    "kn-day-09-neighbour":    {"file": "quiet-room.mp3",     "query": "quiet room interior ambient"},
    "kn-day-10-sunday-market":{"file": "market.mp3",         "query": "outdoor market"},
    "kn-day-11-first-friday": {"file": "pub.mp3",            "query": "bar pub crowd evening"},
    "kn-day-12-canteen":      {"file": "canteen.mp3",        "query": "cafeteria lunch"},
    "kn-day-13-hiring-cook":  {"file": "kitchen.mp3",        "query": "kitchen cooking ambience"},
    "kn-day-14-gas-cylinder": {"file": "kitchen.mp3",        "query": "kitchen cooking ambience"},
    "kn-day-15-pharmacy":     {"file": "quiet-room.mp3",     "query": "quiet room interior ambient"},
    "kn-day-16-bookstore":    {"file": "bookstore.mp3",      "query": "library quiet"},
    "kn-day-17-cubbon-park":  {"file": "park-morning.mp3",   "query": "park birds morning"},
    "kn-day-18-lokesh-knows": {"file": "street-day.mp3",     "query": "residential street daytime"},
    "kn-day-19-karaga":       {"file": "karaga-drums.mp3",   "query": "drum procession"},
    "kn-day-20-cooks-favor":  {"file": "kitchen.mp3",        "query": "kitchen cooking ambience"},
    "kn-day-21-amma":         {"file": "family-home.mp3",    "query": "house interior ambience"},
    "kn-day-22-misstep":      {"file": "family-home.mp3",    "query": "house interior ambience"},
    "kn-day-23-phone-call-home":{"file":"quiet-room.mp3",    "query": "quiet room interior ambient"},
    "kn-day-24-temple-auntie":{"file": "temple.mp3",         "query": "hindu temple bells chant"},
    "kn-day-25-anikas-friends":{"file":"pub.mp3",            "query": "bar pub crowd evening"},
    "kn-day-26-fight":        {"file": "quiet-room.mp3",     "query": "quiet room interior ambient"},
    "kn-day-27-apology":      {"file": "family-home.mp3",    "query": "house interior ambience"},
    "kn-day-28-ugadi":        {"file": "family-home.mp3",    "query": "house interior ambience"},
    "kn-day-29-eve":          {"file": "balcony-night.mp3",  "query": "city night distant traffic"},
    "kn-day-30-morning":      {"file": "park-morning.mp3",   "query": "park birds morning"},
}


def search_top_match(query: str, token: str) -> tuple[str, str] | None:
    """Return (preview_url, sound_name) for the top match, or None."""
    params = {
        "query": query,
        # 20-120 sec gives loop-friendly clips, not 2-second hits.
        "filter": "duration:[20.0 TO 120.0]",
        "fields": "name,previews,license,duration",
        "page_size": 5,
        "token": token,
    }
    url = f"{FREESOUND_API}?{urlencode(params)}"
    r = requests.get(url, timeout=20)
    if r.status_code != 200:
        print(f"    search failed: HTTP {r.status_code} {r.text[:120]}",
              file=sys.stderr)
        return None
    data = r.json()
    results = data.get("results", [])
    if not results:
        print("    no matches", file=sys.stderr)
        return None
    top = results[0]
    previews = top.get("previews", {})
    # Prefer high-quality MP3 preview; fall back to low if HQ missing.
    preview_url = previews.get("preview-hq-mp3") or previews.get("preview-lq-mp3")
    if not preview_url:
        print("    no preview URL on top result", file=sys.stderr)
        return None
    return preview_url, top.get("name", "(unknown)")


def download(url: str, target: Path) -> bool:
    """Stream-download a URL to disk. Returns True on success."""
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".part")
    try:
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(chunk_size=64 * 1024):
                    if chunk:
                        f.write(chunk)
        tmp.replace(target)
        return True
    except Exception as e:
        print(f"    download failed: {e}", file=sys.stderr)
        try:
            tmp.unlink(missing_ok=True)
        except Exception:
            pass
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help="One chapter id (e.g. kn-day-01-airport)")
    parser.add_argument("--force", action="store_true",
                        help="Re-download even if the target already exists")
    args = parser.parse_args()

    if load_dotenv:
        load_dotenv(SCRIPT_DIR / ".env")
    token = os.environ.get("FREESOUND_API_KEY")
    if not token:
        print(
            "FREESOUND_API_KEY not set. Get one at "
            "https://freesound.org/apiv2/apply/ and add to scripts/.env",
            file=sys.stderr,
        )
        sys.exit(1)

    items = list(SFX_QUERIES.items())
    if args.only:
        items = [(k, v) for k, v in items if k == args.only]
        if not items:
            print(f"Unknown chapter id: {args.only}", file=sys.stderr)
            sys.exit(1)

    # Multiple chapters share the same target filename — only download
    # each unique file once per run.
    done_files: dict[str, str] = {}
    failures: list[str] = []
    for chapter_id, meta in items:
        target_name = meta["file"]
        query = meta["query"]
        target = SFX_DIR / target_name

        if target_name in done_files:
            print(f"  {chapter_id}: shares {target_name} with {done_files[target_name]} (already fetched)")
            continue

        if target.exists() and not args.force:
            print(f"  {chapter_id}: {target_name} already exists (--force to redownload)")
            done_files[target_name] = chapter_id
            continue

        print(f"  {chapter_id}: searching '{query}'")
        match = search_top_match(query, token)
        if not match:
            failures.append(chapter_id)
            continue
        preview_url, name = match
        print(f"    top match: {name!r}")
        if download(preview_url, target):
            size_kb = target.stat().st_size // 1024
            print(f"    saved {target.relative_to(REPO_ROOT)} ({size_kb} KB)")
            done_files[target_name] = chapter_id
        else:
            failures.append(chapter_id)

        # Be polite to the API — 1 req/sec is well under their limit.
        time.sleep(1.0)

    print()
    print(f"Done. {len(done_files)} files saved, {len(failures)} failures.")
    if failures:
        print("Failed: " + ", ".join(failures))


if __name__ == "__main__":
    main()
