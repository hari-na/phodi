/**
 * Chapter content types for Phodi: the game.
 *
 * A Chapter is one Bangalore micro-scenario (Day 1: airport auto,
 * Day 12: roommate's mother, etc.). It plays as a linear sequence of
 * dialogue beats. Each beat is either an NPC line (with intonation
 * baked into the generated audio) or a player choice (rendered via
 * the existing exercise components).
 *
 * The player accumulates three scores across all chapters:
 *   - Fluency: correctness of Kannada (mirrors lesson XP).
 *   - Vibes:   cultural appropriateness — register, politeness, tact.
 *   - Speed:   how quickly each choice was made.
 *
 * Chapter outcomes (good/medium/bad) gate later chapters and feed
 * the final-day ending tree.
 */

import type { LanguageCode, MultipleChoiceExercise, WordBankExercise } from "../types";

/* -------------------------------------------------------------------------- */
/* Voice profiles                                                              */
/* -------------------------------------------------------------------------- */

/** Catalog of expressive emotions that modify a base voice profile. */
export type Emotion =
  | "neutral"
  | "pushy"      // auto driver hustling for a higher fare
  | "warm"      // chai uncle, friendly shopkeeper
  | "stern"     // amma judging your register
  | "annoyed"   // you wasted their time
  | "pleading"  // last-minute negotiation
  | "amused"    // tickled by your accent
  | "hushed"    // secret-sharing, conspiratorial
  | "tired";    // 11pm, end of shift

/**
 * A reusable speaker definition. Maps onto a Sarvam Bulbul payload
 * (model + speaker + base pace/pitch/loudness/temperature). Emotion
 * modifiers stack additively on the base values per line.
 */
export interface VoiceProfile {
  id: string;
  /** Human-readable name shown in the dialogue UI ("Ravi", "Amma"). */
  name: string;
  /** One-line description of the character — author note, not shown. */
  role: string;
  model: "bulbul:v2" | "bulbul:v3";
  speaker: string;
  pace: number;
  pitch?: number;        // v2 only, -0.75 .. 0.75
  loudness?: number;     // v2 only, 0.3 .. 3.0
  temperature?: number;  // v3 only, 0.01 .. 2.0
}

/* -------------------------------------------------------------------------- */
/* Dialogue beats                                                              */
/* -------------------------------------------------------------------------- */

/** An NPC line — the engine renders the Kannada, plays the audio. */
export interface NpcLine {
  kind: "npc";
  speakerId: string;            // VoiceProfile.id
  native: string;
  translit: string;
  en: string;
  emotion?: Emotion;
  audio?: string;               // populated by the TTS pipeline
  /** Stage direction shown as a tiny italic line under the text. */
  beat?: string;                // e.g. "leaning over the steering wheel"
  /**
   * Where to go after this beat when the player clicks Continue.
   * Same semantics as PlayerChoice.next:
   *   - "end"          → finish the chapter immediately
   *   - "<beat-id>"    → jump to the named beat (resolved via
   *                       chapter.beatIds)
   *   - "next" / unset → linear advance (default)
   * Lets a chapter's content branch from an NPC line without needing
   * a player choice in between.
   */
  next?: string | "next" | "end";
}

/** A player choice — pick one of N reply options. */
export interface PlayerChoiceBeat {
  kind: "choice";
  prompt?: string;              // optional setup line ("You think:")
  choices: PlayerChoice[];
}

export interface PlayerChoice {
  /** What the player will say (or do, if silent). */
  native?: string;
  translit?: string;
  en: string;                   // always shown — the choice UI is English
  /** Score deltas applied immediately. */
  effects: {
    fluency?: number;
    vibes?: number;
    /**
     * Per-character romantic / relational affection deltas. Keyed by
     * speakerId. Positive means the player treated this character warmly
     * (good register, taking interest, generosity); negative means cold
     * or dismissive. Accumulates into RunState.affection and feeds the
     * Day 30 ending resolver. Optional — most choices don't move
     * affection.
     */
    affection?: Record<string, number>;
  };
  /** Optional tag the chapter branches on. */
  setFlag?: string;
  /** The next beat after this choice. Defaults to "advance to next beat". */
  next?: string | "next" | "end";
}

/** A word-bank construction beat — player builds a Kannada reply. */
export interface PlayerBuildBeat {
  kind: "build";
  prompt: string;
  target: string;
  targetTranslit: string;
  words: string[];
  wordTranslits?: (string | null)[];
  correctOrder: number[];
  /** Effect when built correctly. */
  onCorrect: { fluency?: number; vibes?: number };
  onWrong: { fluency?: number; vibes?: number };
}

export type Beat = NpcLine | PlayerChoiceBeat | PlayerBuildBeat;

/* -------------------------------------------------------------------------- */
/* Chapter container                                                           */
/* -------------------------------------------------------------------------- */

export interface Chapter {
  id: string;                    // "kn-day-01-airport"
  day: number;                   // 1..30
  language: LanguageCode;
  title: string;                 // "The Airport Auto"
  titleNative?: string;
  setting: string;               // "11pm. Sticky with rain. Outside the terminal."
  /** Whether playing this chapter requires completing some lessons first. */
  recommendedLesson?: string;
  beats: Beat[];
  /** Mapping from beat-id (when set) to its position in the beats array.
   *  Most beats just play linearly; flags + jumps live in PlayerChoice.next.
   */
  beatIds?: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/* Player state                                                                */
/* -------------------------------------------------------------------------- */

export interface ChapterRun {
  chapterId: string;
  startedAt: string;
  completedAt?: string;
  fluency: number;
  vibes: number;
  /** Average reply latency in ms — folded into the Speed score. */
  avgReplyMs?: number;
  flags: string[];
}

// Re-exports so chapter components can pull the existing exercise types
// through one barrel instead of two.
export type { MultipleChoiceExercise, WordBankExercise };
