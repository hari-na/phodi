# Phodi — Build Log

A running narrative of every milestone in the build. Each entry has a one-line
context, a list of what shipped, the screenshot(s) captured for that state,
and a one-line "why this matters" framing for the LinkedIn post.

Update this every time a meaningful slice ships. Re-run
`node scripts/capture_screenshots.mjs` afterward to refresh the imagery.

---

## Milestone 01 — Project scaffold + design system
**Commit:** `b8caad6 chore: scaffold Next.js 15 + TypeScript + Tailwind project`
**Shipped:** Next.js App Router, TypeScript strict, Tailwind config with the
warm-dark palette, fonts (Instrument Serif + Inter + Noto Sans Kannada),
global ruby styles for inline phonetics.
**Why it matters:** Locked the visual identity *before* writing any feature.
Deliberately *not* Duolingo-bubbly.

## Milestone 02 — Lesson 1: Greetings with Dravidian bridges
**Commits:** `e27417f` (schema), `cb9bd0a` (Lesson 1 content)
**Shipped:** 5 vocab items, 10 exercises, every word bridged from Tamil and
Malayalam ("the -īrā ending matches Tamil's -īṅga"). End-of-lesson scenario
exercise (girlfriend's mother greeting) — exits on a moment, not a quiz.
**Screenshots:** `04-vocab-card-dravidian-bridges.png`
**Why it matters:** The bridge from Tamil/Malayalam is the moat. Duolingo
teaches every L2 from English. Phodi teaches Kannada *from the related
Indian language you already speak*.

## Milestone 03 — Interactive lesson player
**Commit:** `a78742c feat: interactive lesson player + three exercise types`
**Shipped:** Three exercise types (multiple-choice, word-bank, fill-blank),
streak/XP, progress, vocab walkthrough, lesson-complete scorecard. All state
in localStorage — no auth, no backend, no friction.
**Screenshots:** `03-lesson-intro.png`, `05-mc-with-ruby-phonetic.png`,
`06-mc-kannada-options-with-translit.png`
**Why it matters:** Working consumer product, not a static portfolio piece.

## Milestone 04 — Inline phonetics + lesson-wide dictionary
**Commit:** `f7d3319 feat: inline phonetics with ruby + lesson-wide phonetic dictionary`
**Shipped:** `<Phonetic>` (translit below native) and `<PhoneticText>`
(`<ruby>` for inline mixed-script text). Lesson-wide dictionary populated
from vocab + exercise translit fields, fallback chain handles punctuation
edge cases. Regex covers 8 Indian scripts — extending to Tamil/Malayalam
later is a content change, not a code change.
**Why it matters:** Every Kannada word the learner sees has its phonetic
right there — no hover, no clicks. Beginner-respectful by default.

## Milestone 05 — Lesson generation pipeline (Claude)
**Commit:** `c3636d7 feat: Claude-powered lesson generation pipeline`
**Shipped:** Python script that takes a one-line concept and returns a
lesson JSON matching the editorial voice locked in Lesson 1. Prompt cache
on the system prompt keeps generations cheap.
**Why it matters:** AI is doing the heavy lifting — five-word lessons,
Dravidian bridges, exercise sets. The human (me) supplies taste at the
generation prompt and the lesson review.

## Milestone 06 — Audio pipeline + AudioButton
**Commits:** `5a16300` (AudioButton), `46146cf` (TTS pipeline),
`6df7b1f` (Sarvam payload fix), `47bfc00` (UTF-8 stdout), `7bbb94d`
(Lesson 1 audio wired)
**Shipped:** Sarvam Bulbul-v2 TTS (manisha voice, kn-IN) with Azure as
fallback. Audio is build-time only — zero per-user inference cost. Lesson 1
has 13 pre-generated WAVs (5 vocab + 8 exercise sentences).
**Why it matters:** Indian AI infrastructure on an Indian-language app.
That's part of the story, not garnish.

## Milestone 07 — Game layer: chapters, voice profiles, Day 1
**Commits:** chapter schema + Day 1, `adb492c` expressive TTS,
ChapterPlayer + route
**Shipped:** The game layer on top of the existing learning infrastructure.
Voice profiles (Ravi the auto driver, Anna the chai stall owner, Amma the
mother-in-law, plus a narrator) with emotion modifiers — pushy / warm /
stern / annoyed / amused / hushed — that stack on top of the base voice.
Day 1: The Airport Auto plays end to end: Ravi opens neutral, lowballs
₹500 in pushy mode (faster, lower, louder), settles in amused mode when
you push back with ಮೀಟರ್ ಹಾಕಿ.
**Screenshots:** `08-chapter-day-1-intro.png`, `09-chapter-npc-pushy.png`,
`10-chapter-choice.png`, `11-chapter-scorecard.png`
**Why it matters:** The lesson app stays as training mode; the game is the
hook. Cultural-appropriateness scoring (Vibes) is the wedge no learning
app currently does. This is the PM Engineer signal that lands.

## Milestone 09 — Day 4: Broker Call (phone-only) + 100-day rescope
**Shipped:** Day 4 — The Broker Call. The first phone-only chapter:
no body language, only audio + stage directions like "his Bluetooth
crackles" and "the honking gets louder — he's walking somewhere
fast" to sell the medium. Rangaswamy debuts in four emotional
registers: neutral pickup, pushy sales pitch (pace 1.35 — the
fastest line in the game), annoyed when you push back on the
advance, warm closing as he locks in the viewing.

Story bible rescoped to **100 narrative days, 30 playable chapters**.
"Day N" tags are arc-positions inside that 100, not chapter indexes.
Lets the story breathe — chapters 1-10 happen on Days 1-10, then
spread non-uniformly across the next 90 narrative days.

**Screenshots:** `15-day-4-broker-intro.png`, `16-day-4-broker-pushy.png`
**Why it matters:** Phone-only proves the pipeline carries the
emotional register without any visual anchor. Rangaswamy's pace 1.35
pushy pitch is the most distinct intonation we've shipped — should
feel unmistakably like a broker hustling.

## Milestone 08 — Story bible + Days 2-3 + chapter index
**Commits:** `aafa074` (bible), Day 2/Day 3 content + voice profiles,
chapter index on course page
**Shipped:** A locked 30-day story scaffold with 10 playable days as
the actual game scope. Apolitical framing — protagonist origin never
stated, onboarding asks only what you already speak. Five new Act 1
voice profiles (Receptionist, Rangaswamy the broker, Krishnamurthy
uncle from Mysuru, Lokesh the watchman, the vegetable vendor aunty).

Day 2: The Lobby — hotel check-in after midnight. Polite formal
register. The receptionist apologises in hushed mode for a botched
breakfast booking, warms up when you push back politely. 6 NPC
lines, three emotional registers (neutral / hushed / warm).

Day 3: The First Chai — morning chai stall with Anna. The cultural
beat is "where are you from?" — vulnerability earns Vibes, vagueness
is neutral, "Bangalore" is a Vibes hit. Anna's response is amused
("everyone in Bangalore is an engineer. I was too."). 6 NPC lines,
warm/amused/neutral.

Course page now shows "Thirty Days in Bangalore" as the primary
section above the lesson list — chapters get billing, lessons are
the supporting training mode.

**Screenshots:** `07-course-with-chapters.png`,
`12-day-2-hotel-hushed.png`, `13-day-3-chai-warm.png`,
`14-day-3-chai-amused.png`
**Why it matters:** Three voices, three characters, three different
emotional registers per character — all delivered by Sarvam's
inventory of 7 speakers via pitch/pace deltas. The pipeline scales
to all 17 NPCs in the story bible without adding new infrastructure.

---

## Capture / refresh

```powershell
# Dev server in one terminal
cd C:\Users\swaac\Coding\phodi
npm run dev   # listens on 3001 via launch.json or 3000 directly

# Capture in another
node scripts/capture_screenshots.mjs
```

Screenshots land in `docs/screenshots/`. Mobile viewport (430×932, iPhone
15 Pro Max), 2× DPI, dark colour scheme. Append a new shot definition to
the `shots` array in the capture script when adding a milestone.
