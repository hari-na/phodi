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
    "I sounded like a tourist. Three months in and I'm still announcing it.",
  amma_noticed_ninnu:
    "I called her 'ninnu.' Amma doesn't correct people — she remembers them.",
  rejected_amma_food:
    "Saying 'I've eaten' to Amma's table. Whatever I save in carbs I'll pay in coldness for a month.",
  chose_leave: "I'm pricing the flight home in my head, aren't I.",
  chose_stay_anika: "I said yes to staying. The lease and the city, both.",
  chose_unsure: "I didn't decide. The city respects that more than I expected.",
  amma_recovered: "Whatever I said in there — she let me back in. That matters.",
  appa_thawed: "Appa laughed. Appa never laughs.",
  anna_regular: "Anna nods at me now. The chai is mine without asking.",
  brought_gift: "The flowers were a small thing. They opened a big door.",
  gave_the_speech:
    "I gave a speech in Kannada in front of fourteen people. Three months ago I didn't know hello.",
};

/* -------------------------------------------------------------------------- */
/* Openers — overall vibe of the day, picked by score band.                   */
/* -------------------------------------------------------------------------- */

function openerForScore(score: number, day: number): string {
  const dayLabel = `Day ${day}.`;
  if (score >= 12) {
    return `${dayLabel} Something in me settled today.`;
  }
  if (score >= 6) {
    return `${dayLabel} Not perfect. Not embarrassing.`;
  }
  if (score >= 0) {
    return `${dayLabel} Trying. The city sees it, I think.`;
  }
  return `${dayLabel} That stung. I keep replaying it.`;
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

  // The phrase to learn is the better choice's Kannada — when present.
  // If the better choice is also English-only (rare), skip phrase, give
  // a plain regret line.
  if (better.native) {
    const phrase: PhraseToLearn = {
      native: better.native,
      translit: better.translit,
      en: better.en,
    };
    return {
      line: `Damn it. Should've said ${better.native}. Instead I gave them "${yours.en}". They heard the difference even if they didn't say it.`,
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

  lines.push(openerForScore(score, chapter.day));

  let phraseToLearn: PhraseToLearn | undefined;
  const worst = worstPick(picks);
  if (worst) {
    const regret = regretLine(chapter, worst);
    if (regret) {
      lines.push(regret.line);
      phraseToLearn = regret.phrase;
    }
  } else if (picks.length > 0) {
    // Player picked optimally everywhere — let them feel it.
    lines.push("Every choice landed where I wanted it to. That's new.");
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
