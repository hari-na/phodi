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

## Milestone 12 — Scene backdrops + image generation pipeline
**Shipped:** Every chapter now has a distinct visual mood underneath the
dialogue, calibrated per scene by palette + glow + animation.

What's there:
- `src/lib/scenes.ts` — palette catalog for all 30 chapters. Each entry
  is a top/bottom gradient + a radial glow at a specific position + an
  author note that doubles as the future image-gen prompt.
- `src/components/SceneBackground.tsx` — fixed-position backdrop layered
  with a gradient, a soft radial light, and a darkening vignette so
  foreground text always reads. Animated with a 28-second Ken Burns
  drift (subtle zoom + glow position shift) so it feels alive rather
  than static. Respects `prefers-reduced-motion`.
- Wired into `ChapterPlayer` behind the entire chapter — every chapter
  now has its own mood. Day 1 is sodium-orange rain glow on cool blue.
  Day 19 (Karaga) is fire-orange on black. Day 28 (Ugadi) is deep
  golden. Day 30 (morning) is pale dawn blue-pink.

What's the upgrade path:
- `scripts/generate_scenes.py` — parses the scene catalog and generates
  real cinematic stills via either Together AI's FLUX.1-schnell (~$0.003
  per image) or Fal.ai's FLUX.1 [dev] (~$0.04). Drops JPGs into
  `public/scenes/{chapterId}.jpg`. Setting `image: true` for that entry
  in `scenes.ts` makes the component crossfade in the real image over
  the gradient base.
- Pollinations.ai was the original plan (free) but it dropped its free
  tier mid-build. The script is provider-agnostic — adding Replicate
  or DALL-E support is a 30-line addition.

**Why it matters:** the dialogue used to play on flat black. Now every
chapter has a deliberate atmosphere — same code, no images shipped, no
runtime cost. Real images later are a content drop, not an architecture
change.

**Note on "GIFs":** the user asked for GIFs. v1 is animated CSS rather
than true frame-by-frame animation. The motion is real (Ken Burns drift
on the gradient + glow) but it's procedural, not photographic. True
video/GIF generation per chapter is a v2 with a real image-gen budget.

## Milestone 12 — Dual-style scene art, character portraits, ambient audio
**Shipped overnight (single autonomous run):**
- **Bangalore-anchored scene prompts** rewritten for all 30 chapters in
  `src/lib/scenes.ts`. Auto rickshaws, gopuram, bougainvillea,
  red-oxide verandahs, BTM market tarps, mango trees, water tanks,
  Cubbon Park bamboo — every prompt names locality cues.
- **30 painterly scene renders** at `public/scenes/painterly/`. Oil-on-
  canvas concept-art via DreamShaper XL Lightning, ~60-70s per image
  on RTX 4060 mobile (8GB VRAM).
- **30 comic scene renders** at `public/scenes/comic/`. Graphic-novel
  ink / cel-shaded variant using the same model with a different
  style suffix (Sean Murphy / Mignola / Tomer Hanuka reference cues).
- **Character portrait system** — `src/lib/characters.ts` +
  `scripts/character_prompts.py` defines 17 recurring NPC templates
  with locked seeds so each character keeps the same face across
  generations. Portraits at `public/portraits/{painterly,comic}/`.
- **Local DreamShaper loader workaround** — HF kept dropping
  connections trying to fetch SDXL base 1.0 configs. Solved by
  loading the cached SDXL Turbo pipeline as a scaffold and
  swapping in DreamShaper's UNet + VAE weights via diffusers'
  built-in LDM-to-diffusers converters. Fully offline once the
  Civitai safetensors is cached.
- **UI integration:**
  - `SceneBackground` now reads the player's art-style preference,
    prefers the real generated image, falls back gracefully to the
    procedural gradient.
  - `CharacterPortrait` shows next to each NPC speaker name.
  - `AmbientPlayer` mounts per chapter, fades in over 1.5s, mute
    toggle persists.
  - `StyleToggle` in the chapter header switches painterly ↔ comic
    live. Scene image and portraits both re-render.
- **Placeholder ambient SFX** synthesised from filtered noise in
  `scripts/generate_placeholder_sfx.py`. 17 loops at
  `public/sfx/*.mp3`. Replace with real CC0 field recordings using
  the same filenames to upgrade.

**Tools added:**
- `scripts/generate_scenes_local.py` — `--style {painterly,comic}` flag.
- `scripts/generate_portraits_local.py` — per-character portraits.
- `scripts/character_prompts.py` — character template registry.
- `scripts/generate_placeholder_sfx.py` — synthesised ambient loops.
- `scripts/download_sfx.py` — Pixabay CDN downloader (currently
  blocked by anti-leech; documented for manual swap).

**Why it matters:** the game now has cinematic scene art per chapter,
consistent character faces across appearances, and ambient sound. A
single toggle in the chapter header switches the entire visual
language between painterly oil and graphic-novel ink. The infra runs
fully on a consumer 8GB-VRAM laptop GPU — no cloud spend.

## Milestone 11 — Onboarding, persistent state, hint tiers, multi-ending
**Shipped:** Four player-facing systems on top of the now-complete 30
chapters. The game goes from "playable demo" to "complete shippable
product."

1. **Onboarding (`/onboarding`)** — three-step setup: name (used in
   the game), languages already spoken (will drive bridge-hint
   localisation), and love-interest preference (woman / man / skip).
   Stored in `localStorage` under `phodi.player.v1`.
2. **Onboarding gate (`OnboardingGate`)** — client wrapper in
   `app/layout.tsx` that redirects first-time visitors to `/onboarding`
   and skips itself once a profile exists.
3. **Cross-chapter state (`lib/player.ts`)** — every completed chapter
   writes `{ fluency, vibes, hintCost, flags }` to `phodi.run.v1`.
   `recordChapterRun()` updates running totals. The chapter intro
   shows "Coming in: X fluency · Y vibes" so accumulated state is
   visible. Replaying a chapter cleanly subtracts the prior run.
4. **Hint tier toggle** — Days 1-10 (tier 1) show English meanings
   by default. Days 11-20 (tier 2) and 21-30 (tier 3) hide the English
   behind a "Show meaning · −2 fluency" button per beat. Tap costs
   Fluency, never points back. The chapter intro tells the player what
   tier they're in.
5. **Day 30 ending tree** — the final scorecard reads the entire run
   (`netFluency + totalVibes`, flag set) and picks one of six ending
   variants: "You belong here now" (best path), "You belong here now"
   (good path), "You stayed" (medium), "You'll figure it out" (good
   unsure / soft unsure), "You went home" (good leave / bittersweet
   leave). Uses the player's chosen name throughout.

Also: `[your name]` and `[you]` placeholders in choice text are now
substituted with the profile's name at render time, so introductions
on Days 16-17 are actually personalised.

**Screenshots:** `00-onboarding.png`, `00b-onboarding-language.png`.

**Why it matters:** the game now has a real beginning (onboarding),
a real middle (30 chapters with persisting state), and a real end
(an ending screen calibrated to how you played). It's not a demo any
more.

## Milestone 10 — All 30 chapters of Act 1 (entire story shipped)
**Shipped:** The complete playable story. Days 5-30 hand-crafted to
match the editorial voice of Days 1-4. Ten new voice profiles
(Padma the neighbour, Karthik the office friend, Anika the love
interest, Saraswati the cook, the gas supplier, the pharmacist,
Appa, the temple auntie, Anika's friend Divya, and the diegetic
mother for the phone-call-home chapter).

Highlights of the new content:
  - **Days 5-7 broker arc** — the first flat fails on inspection;
    Krishnamurthy uncle does the slow careful Mysuru-register
    negotiation; you sign on Day 7.
  - **Day 8 Lokesh** — the watchman who'll be in ten more chapters
    has his introduction beat. Sets the relationship's tone.
  - **Day 13 Saraswati's interview** — hiring a cook in Bangalore
    as a genuine domestic-logistics chapter, not a power-asymmetry
    beat.
  - **Day 14 gas cylinder** — phone-only chapter, tired-uncle voice
    profile, the urgency carried by stage directions.
  - **Day 16 bookstore** — Anika's debut. Pronunciation correction
    as meet-cute. Five months of pacing land in one beat.
  - **Day 19 Karaga** — public street procession, Karthik as host,
    "Bangalore isn't just tech, boss. This — this is also Bangalore."
  - **Day 23 Phone Call Home** — the introspective chapter where
    Mom calls in your mother tongue and you realise you've been
    thinking in Kannada for an hour. The drift.
  - **Day 28 Ugadi speech** — emotional peak. A six-line speech in
    Kannada to a room of twelve adults. Appa calls you "tamma" (son)
    at the end.
  - **Day 30 morning** — the choice. Three endings: stay with Anika,
    take time, or take the offer back home.

Total: 30 chapters, ~200 NPC dialogue lines voiced by Sarvam
Bulbul-v2 across 15 distinct voice profiles, 6 emotional registers,
all rendered with per-line intonation modifiers stacking on the
character's base profile.

**Screenshots:** `07-course-with-chapters.png` (now 30/30),
`17-day-16-bookstore-meet.png`, `18-day-23-phone-call-home.png`,
`19-day-28-ugadi.png`, `20-day-30-morning.png`.

**Why it matters:** the entire story is playable end-to-end. This
isn't a demo or a vertical slice — it's a complete 30-chapter
narrative game with full voice acting. The LinkedIn pitch goes from
"prototype of a language game" to "complete narrative game I shipped
solo with AI as content team."

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
