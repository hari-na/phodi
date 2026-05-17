/**
 * Named endings for the 30-day arc.
 *
 * The player's final ending is computed from their accumulated RunState
 * (Fluency, Vibes, per-character affection, narrative flags) when they
 * complete Day 30. Each ending has a recognisable name shown prominently
 * on the ending screen.
 *
 * Endings are tried top-to-bottom — the first one whose `qualifies()`
 * returns true wins. This means more specific / harder-to-reach endings
 * should come first; the fallbacks come last.
 *
 * Adding a new ending: append to ENDINGS, give it a memorable name,
 * tight qualifier, and 2-3 lines of body copy that read like the end of
 * a novel, not a results screen. Mention the player by name (`{name}`)
 * once so it lands personally.
 */

import { netFluency, type RunState } from "@/lib/player";

export type EndingTone = "good" | "bittersweet" | "bad";

export interface Ending {
  id: string;
  /** Headline shown big on the ending screen. */
  name: string;
  /** Short tagline below the name — sets the emotional register. */
  tagline: string;
  /** 2-4 sentence body. `{name}` is replaced with the player's chosen name. */
  body: string;
  tone: EndingTone;
  /** Returns true if this ending should fire for the given run. */
  qualifies(run: RunState): boolean;
}

function affectionFor(run: RunState, speakerId: string): number {
  return run.affection?.[speakerId] ?? 0;
}

function totalScore(run: RunState): number {
  return netFluency(run) + run.totalVibes;
}

/* -------------------------------------------------------------------------- */
/* The endings, in priority order                                             */
/* -------------------------------------------------------------------------- */

export const ENDINGS: Ending[] = [
  {
    id: "bangalore-belongs-to-you",
    name: "Bangalore Belongs to You",
    tagline: "The city stopped checking your accent.",
    body: "{name}. Anna pours your chai without asking. Lokesh wrote your full name in the logbook months ago. Amma calls you before she calls her own daughter. Appa said \"good\" exactly once. That was enough. You think in Kannada now and forget you weren't always doing that. ನಮಸ್ಕಾರ, {name}. ಸ್ವಾಗತ.",
    tone: "good",
    qualifies: (run) =>
      totalScore(run) >= 90 &&
      affectionFor(run, "anika") >= 8 &&
      run.flags.includes("amma_recovered") &&
      run.flags.includes("anna_regular"),
  },
  {
    id: "quiet-integration",
    name: "Quiet Integration",
    tagline: "Not in love. Not lonely. Home.",
    body: "{name}. No big romance to report. Padma waves from 2B every morning. Saraswati's bisi bele bath is in your fridge. Lokesh saves you the good auto. Somewhere around Day 22 you stopped translating from English in your head. The Kannada is uneven. The life is yours.",
    tone: "good",
    qualifies: (run) =>
      run.totalVibes >= 35 &&
      netFluency(run) >= 25 &&
      affectionFor(run, "anika") < 6,
  },
  {
    id: "fluent-but-distant",
    name: "Fluent, but Distant",
    tagline: "You learned the language. Not the people.",
    body: "{name}. Auto drivers don't try to overcharge you. Brokers don't bluff. Your Kannada is sharp. Lokesh stopped chatting at the gate. Padma stopped knocking. You move through the city now and the city lets you.",
    tone: "bittersweet",
    qualifies: (run) => netFluency(run) >= 30 && run.totalVibes <= 10,
  },
  {
    id: "loved-but-lost",
    name: "Loved, but Lost",
    tagline: "Anika stayed. The city didn't.",
    body: "{name}. Anika is the warmest thing you have in Bangalore. She is also the only thing. You butchered the language enough times that people learned to switch to English around you. The lease has eight months left. Anika's family still calls you \"engineer\" instead of your name. You'll figure out what that means.",
    tone: "bittersweet",
    qualifies: (run) =>
      affectionFor(run, "anika") >= 8 &&
      netFluency(run) < 20,
  },
  {
    id: "outsider-still",
    name: "Outsider Still",
    tagline: "Thirty days. Still a guest.",
    body: "{name}. The job pays. The flat is yours on paper. Lokesh logs every visitor. The cook left after the gas cylinder thing. Anika hasn't replied since Day 26. You can read the auto's meter now. That isn't the same as being from here.",
    tone: "bad",
    qualifies: (run) => totalScore(run) < 25,
  },
  /* Catch-all. A middle-of-the-road run with no standout strengths. */
  {
    id: "just-tenant",
    name: "Just a Tenant",
    tagline: "Bangalore. Day thirty. Neutral.",
    body: "{name}. You stayed. The Kannada is functional. Anika smiles when she sees you. Neither of you has said anything big. Lokesh knows your name. Padma doesn't. There are a hundred more days ahead. You know which ones will be easier now.",
    tone: "bittersweet",
    qualifies: () => true,
  },
];

/** Return the first ending in priority order that the run qualifies for. */
export function resolveEnding(run: RunState): Ending {
  return ENDINGS.find((e) => e.qualifies(run)) ?? ENDINGS[ENDINGS.length - 1];
}

/** Substitute {name} tokens in the ending body. */
export function renderEndingBody(body: string, playerName: string): string {
  return body.replaceAll("{name}", playerName);
}
