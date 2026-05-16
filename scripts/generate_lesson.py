"""Generate a Phodi lesson using Claude.

Usage:
    python scripts/generate_lesson.py \\
        --lang kn \\
        --order 2 \\
        --concept "Yes, No, Maybe — the three answers that handle 80% of street questions"

Writes draft JSON to content/{lang}/drafts/{order:02d}-{slug}.json for human review.
Once you've reviewed and edited, merge into content/{lang}/course.json by hand
(or via the merge_lesson.py helper, if you write one).

Requires ANTHROPIC_API_KEY in environment or scripts/.env.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None

try:
    from anthropic import Anthropic
except ImportError:
    print(
        "Missing dependency: pip install anthropic python-dotenv",
        file=sys.stderr,
    )
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
PROMPT_PATH = SCRIPT_DIR / "prompts" / "lesson_system.md"
CONTENT_DIR = REPO_ROOT / "content"

MODEL = "claude-opus-4-7"


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:40]


def load_existing_course(lang: str) -> dict:
    path = CONTENT_DIR / lang / "course.json"
    if not path.exists():
        raise FileNotFoundError(f"No course found at {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def first_lesson_example(course: dict) -> dict | None:
    for unit in course.get("units", []):
        for lesson in unit.get("lessons", []):
            return lesson
    return None


def build_user_message(
    lang_name: str,
    lang_native: str,
    order: int,
    concept: str,
    example: dict | None,
) -> str:
    parts = [
        f"Language: {lang_name} ({lang_native})",
        f"Lesson number: {order}",
        f"Concept: {concept}",
        "",
        "Write the lesson JSON. Output only the JSON object — no prose, no markdown fences.",
    ]
    if example is not None:
        parts += [
            "",
            "Reference example (Lesson 1 of this course — match its voice and structure):",
            "```json",
            json.dumps(example, ensure_ascii=False, indent=2),
            "```",
        ]
    return "\n".join(parts)


def extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def validate_lesson(lesson: dict) -> list[str]:
    errors: list[str] = []
    required_top = [
        "id",
        "order",
        "title",
        "titleNative",
        "description",
        "estimatedMinutes",
        "xp",
        "vocabulary",
        "exercises",
    ]
    for key in required_top:
        if key not in lesson:
            errors.append(f"missing top-level key: {key}")

    for i, ex in enumerate(lesson.get("exercises", [])):
        t = ex.get("type")
        if t == "multipleChoice":
            opts = ex.get("options", [])
            ci = ex.get("correctIndex")
            if not isinstance(ci, int) or not 0 <= ci < len(opts):
                errors.append(f"exercise {i}: correctIndex out of range")
        elif t == "wordBank":
            words = ex.get("words", [])
            order = ex.get("correctOrder", [])
            if sorted(order) != list(range(len(words))):
                errors.append(
                    f"exercise {i}: correctOrder must be a permutation of 0..{len(words) - 1}"
                )
        elif t == "fillBlank":
            parts = ex.get("promptParts", [])
            opts = ex.get("options", [])
            ci = ex.get("correctIndex")
            if len(parts) != 2:
                errors.append(f"exercise {i}: promptParts must have length 2")
            if not isinstance(ci, int) or not 0 <= ci < len(opts):
                errors.append(f"exercise {i}: correctIndex out of range")
        else:
            errors.append(f"exercise {i}: unknown type {t!r}")

    return errors


def generate(lang: str, order: int, concept: str) -> dict:
    if load_dotenv:
        load_dotenv(SCRIPT_DIR / ".env")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    course = load_existing_course(lang)
    example = first_lesson_example(course)
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
    user_msg = build_user_message(
        lang_name=course["name"],
        lang_native=course["nameNative"],
        order=order,
        concept=concept,
        example=example,
    )

    client = Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    text = "".join(b.text for b in resp.content if b.type == "text")
    try:
        lesson = extract_json(text)
    except json.JSONDecodeError as e:
        print("Model output was not valid JSON:", file=sys.stderr)
        print(text, file=sys.stderr)
        raise SystemExit(f"JSON decode failed: {e}")

    errors = validate_lesson(lesson)
    if errors:
        print("Validation errors:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        print(
            "Writing draft anyway for human review.",
            file=sys.stderr,
        )

    return lesson


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", required=True, help="Language code (e.g. kn)")
    parser.add_argument(
        "--order",
        type=int,
        required=True,
        help="Lesson order within its unit (e.g. 2)",
    )
    parser.add_argument(
        "--concept",
        required=True,
        help="Short brief — what the lesson teaches and why",
    )
    args = parser.parse_args()

    lesson = generate(args.lang, args.order, args.concept)

    drafts_dir = CONTENT_DIR / args.lang / "drafts"
    drafts_dir.mkdir(parents=True, exist_ok=True)
    slug = lesson.get("id") or f"{args.order:03d}-{slugify(args.concept)}"
    out = drafts_dir / f"{slug}.json"
    out.write_text(
        json.dumps(lesson, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote draft to {out}")
    print(
        "Review by hand, edit voice/grammar/bridges, then merge into "
        f"content/{args.lang}/course.json."
    )


if __name__ == "__main__":
    main()
