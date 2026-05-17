/**
 * End-of-day self-reflection — the player's inner monologue.
 *
 * Auto-generated from the chapter's data + the picks the player actually
 * made. Reads like a journal entry: code-switched Kannada-English (the
 * player is moving through Bangalore picking up the language; their inner
 * voice would be too), self-aware about register mistakes, regret-flavoured
 * without being self-flagellating.
 *
 * The shape is intentionally:
 *
 *   1. A short reflective opening — overall feel of the day.
 *   2. One specific regret tied to the worst-scoring pick — naming the
 *      Kannada they should have used.
 *   3. (Optional) A flag-driven sting — "the ninnu thing with Amma is
 *      going to stick."
 *   4. A "phrase to learn" surfaced as the exact Kannada the better pick
 *      would have said, with translit + gloss, so the player walks away
 *      with one concrete sentence next time.
 *
 * Phase 1: fully data-driven from picks + flags + scores. Phase 2 can
 * replace with hand-written reflections per chapter for stronger voice.
 */

import type { Chapter, PlayerChoiceBeat } from "@/lib/chapters/types";
import type { ChoicePickRecord } from "@/lib/player";

export interface PhraseToLearn {
  native: string;
  translit?: string;
  en: string;
}

export interface Reflection {
  /** 1-3 sentences of inner monologue. Already first-person. */
  lines: string[];
  /** The exact Kannada the player should have said today, if surfaceable. */
  phraseToLearn?: PhraseToLearn;
}

/**
 * Compute the worst pick — the largest delta between what the player
 * picked and the best available choice in the same beat. Returns null
 * if the player picked optimally everywhere.
 */
function worstPick(picks: ChoicePickRecord[]): ChoicePickRecord | null {
  let worst: ChoicePickRecord | null = null;
  for (const p of picks) {
    if (p.pickedIdx === p.bestIdx) continue;
    const delta = p.bestScore - p.pickedScore;
    if (!worst || delta > worst.bestScore - worst.pickedScore) worst = p;
  }
  return worst;
}

/* -------------------------------------------------------------------------- */
/* Flag glosses — map an in-world flag to a short reflective sting.           */
/* -------------------------------------------------------------------------- */

/**
 * When a chapter sets a flag, sometimes the player's reflection should
 * acknowledge it as a thing that *stuck*. These are the ones we have a
 * voice for — others pass silently. Phase 2 could expand this map.
 */
const FLAG_STINGS: Record<string, string> = {
  sounds_like_tourist:
    "Sounded like a tourist again. Three months in.",
  amma_noticed_ninnu:
    "Called her 'ninnu' at the table. She didn't correct it. That's worse than if she had.",
  rejected_amma_food:
    "Said I'd eaten. To Amma. The food was already on the table.",
  chose_leave: "I'm pricing the flight home in my head, aren't I.",
  chose_stay_anika: "Said yes to staying. The lease and the city, both.",
  chose_unsure: "Didn't decide. Both feet still in.",
  amma_recovered: "Whatever I said in there, she let me back in. Coffee was already on the table when I walked in.",
  appa_thawed: "Appa laughed. Appa never laughs.",
  anna_regular: "Anna nods at me now. The chai is mine without asking.",
  brought_gift: "Took flowers. Amma took them like it cost me something. That bit landed.",
  gave_the_speech:
    "Spoke in Kannada in front of fourteen people. Hands shook the whole time. Appa heard it anyway.",
};

/* -------------------------------------------------------------------------- */
/* Openers — overall vibe of the day, picked by score band.                   */
/* -------------------------------------------------------------------------- */

function openerForScore(score: number): string {
  // No "Day N" label — the scorecard header above already says that.
  // Starting cold with the feeling lands harder.
  if (score >= 12) return "Walked back lighter than I came.";
  if (score >= 6) return "Not great. Not embarrassing.";
  if (score >= 0) return "Trying. I think they see it.";
  return "I keep replaying it.";
}

/* -------------------------------------------------------------------------- */
/* Regret line — names the specific Kannada they should've said.              */
/* -------------------------------------------------------------------------- */

function regretLine(chapter: Chapter, pick: ChoicePickRecord): {
  line: string;
  phrase?: PhraseToLearn;
} | null {
  const beat = chapter.beats[pick.beatIdx];
  if (!beat || beat.kind !== "choice") return null;
  const cb = beat as PlayerChoiceBeat;
  const yours = cb.choices[pick.pickedIdx];
  const better = cb.choices[pick.bestIdx];
  if (!yours || !better) return null;

  // The phrase to learn is the better choice's Kannada when present.
  // If the better choice is English-only (rare), give a plain regret.
  if (better.native) {
    const phrase: PhraseToLearn = {
      native: better.native,
      translit: better.translit,
      en: better.en,
    };
    return {
      line: `I keep going back to it. Should've said ${better.native}. What came out was "${yours.en}". Fine. Forgettable.`,
      phrase,
    };
  }

  return {
    line: `"${yours.en}" was fine. "${better.en}" would've been better. I keep picking the easier sentence.`,
  };
}

/* -------------------------------------------------------------------------- */
/* The synthesiser                                                            */
/* -------------------------------------------------------------------------- */

export function generateReflection({
  chapter,
  picks,
  flags,
  fluency,
  vibes,
  hintCost,
}: {
  chapter: Chapter;
  picks: ChoicePickRecord[];
  flags: string[];
  fluency: number;
  vibes: number;
  hintCost: number;
}): Reflection {
  const lines: string[] = [];
  const score = fluency + vibes - hintCost;

  lines.push(openerForScore(score));

  let phraseToLearn: PhraseToLearn | undefined;
  const worst = worstPick(picks);
  if (worst) {
    const regret = regretLine(chapter, worst);
    if (regret) {
      lines.push(regret.line);
      phraseToLearn = regret.phrase;
    }
  } else if (picks.length > 0) {
    // Player picked optimally everywhere. Let them feel it.
    lines.push("Every choice landed where I wanted it. That's new.");
  }

  // Add the most evocative flag sting if one fired.
  for (const flag of flags) {
    const sting = FLAG_STINGS[flag];
    if (sting) {
      lines.push(sting);
      break; // one is enough — keep the voice tight
    }
  }

  return { lines, phraseToLearn };
}
