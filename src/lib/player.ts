"use client";

/**
 * Player profile and run state for Phodi.
 *
 * Two storage keys:
 *   phodi.player.v1 — long-lived profile (name, L1, love-interest pref)
 *   phodi.run.v1    — accumulating game state (totals, per-chapter runs, flags)
 *
 * The chapter player writes to phodi.run.v1 on chapter completion. The
 * onboarding flow writes phodi.player.v1 once. Everything lives in
 * localStorage — no backend, no auth.
 */

export type KnownLanguage = "ta" | "ml" | "hi" | "te" | "en";
/**
 * @deprecated Onboarding no longer asks for this. Romance now emerges from
 * how the player treats each character they meet across the 30 days, with
 * affection tracked per-character in RunState. Field kept on the profile
 * type only for backwards compatibility with existing localStorage payloads.
 */
export type LoveInterestPreference = "anika" | "anik" | "skip";
export type ArtStylePreference = "painterly" | "comic";

export interface PlayerProfile {
  name: string;
  knownLanguages: KnownLanguage[];
  /** @deprecated See LoveInterestPreference. Tolerated on load, never required. */
  loveInterest?: LoveInterestPreference;
  artStyle?: ArtStylePreference;
  createdAtISO: string;
}

const ART_STYLE_KEY = "phodi.artStyle.v1";

/** Live art-style preference. Lives outside the profile so it can be toggled
 *  mid-game without touching the rest of the profile. Falls back to the
 *  profile's stored style if no live override is set. */
export function loadArtStyle(): ArtStylePreference {
  if (typeof window === "undefined") return "painterly";
  const override = window.localStorage.getItem(ART_STYLE_KEY);
  if (override === "painterly" || override === "comic") return override;
  const profile = loadProfile();
  return profile?.artStyle ?? "painterly";
}

export function saveArtStyle(style: ArtStylePreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ART_STYLE_KEY, style);
}

/**
 * A single multiple-choice pick the player made during a chapter, captured
 * for the end-of-day debrief. We compare the picked choice's score against
 * the best available choice for the same beat — anything below shows up in
 * "what could go better."
 */
export interface ChoicePickRecord {
  /** Position of the choice beat in chapter.beats. */
  beatIdx: number;
  /** Index of the choice the player picked, within beat.choices. */
  pickedIdx: number;
  /** The picked choice's fluency + vibes total. */
  pickedScore: number;
  /** The highest-scoring available choice's total at the same beat. */
  bestScore: number;
  /** Index of the best choice (may equal pickedIdx — then no debrief). */
  bestIdx: number;
}

export interface ChapterRunRecord {
  chapterId: string;
  day: number;
  fluency: number;
  vibes: number;
  hintCost: number;     // Fluency points spent on "Show meaning" toggles
  flags: string[];
  /** Per-choice picks for the debrief panel. Empty for legacy records. */
  picks: ChoicePickRecord[];
  /** Affection deltas accrued in this chapter, keyed by speakerId. */
  affectionDelta: Record<string, number>;
  completedAtISO: string;
}

export interface RunState {
  /** Cumulative totals across all completed chapters. */
  totalFluency: number;
  totalVibes: number;
  totalHintCost: number;
  /** Set of every flag set across the run. */
  flags: string[];
  /** Per-chapter records, keyed by chapter id (last play wins). */
  runs: Record<string, ChapterRunRecord>;
  /**
   * Per-character romantic affection accumulated across the run. Keyed by
   * speakerId (e.g. "anika", "padma", "saraswati"). A character's score
   * reflects how warmly the player treated them in their scenes. Used at
   * Day 30 to decide which romantic ending (if any) the player landed in.
   */
  affection: Record<string, number>;
  /**
   * The ending the player landed on at Day 30, set by the EndingScreen
   * after computing thresholds. Null until Day 30 is completed.
   */
  endingId: string | null;
}

const PROFILE_KEY = "phodi.player.v1";
const RUN_KEY = "phodi.run.v1";

const DEFAULT_RUN: RunState = {
  totalFluency: 0,
  totalVibes: 0,
  totalHintCost: 0,
  flags: [],
  runs: {},
  affection: {},
  endingId: null,
};

/* ---------- profile ---------- */

export function loadProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
}

/* ---------- run state ---------- */

export function loadRun(): RunState {
  if (typeof window === "undefined") return { ...DEFAULT_RUN };
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return { ...DEFAULT_RUN };
    return { ...DEFAULT_RUN, ...(JSON.parse(raw) as Partial<RunState>) };
  } catch {
    return { ...DEFAULT_RUN };
  }
}

export function saveRun(run: RunState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUN_KEY, JSON.stringify(run));
}

export function clearRun() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RUN_KEY);
}

export function recordChapterRun(record: ChapterRunRecord): RunState {
  const run = loadRun();
  // If we're replaying a chapter, subtract the previous record's contribution
  // before adding the new one.
  const prior = run.runs[record.chapterId];
  if (prior) {
    run.totalFluency -= prior.fluency;
    run.totalVibes -= prior.vibes;
    run.totalHintCost -= prior.hintCost;
    // Subtract prior affection so replays don't double-count
    for (const [speakerId, delta] of Object.entries(prior.affectionDelta ?? {})) {
      run.affection[speakerId] = (run.affection[speakerId] ?? 0) - delta;
    }
    // We can't cleanly subtract prior flags (could overlap with other chapters)
    // so we just merge the new set in.
  }
  run.totalFluency += record.fluency;
  run.totalVibes += record.vibes;
  run.totalHintCost += record.hintCost;
  run.flags = Array.from(new Set([...run.flags, ...record.flags]));
  for (const [speakerId, delta] of Object.entries(record.affectionDelta)) {
    run.affection[speakerId] = (run.affection[speakerId] ?? 0) + delta;
  }
  run.runs[record.chapterId] = record;
  saveRun(run);
  return run;
}

/**
 * Mark an ending on the run state without recomputing chapter scores. Called
 * by the EndingScreen once it has determined which named ending applies.
 */
export function recordEnding(endingId: string): RunState {
  const run = loadRun();
  run.endingId = endingId;
  saveRun(run);
  return run;
}

/* ---------- selectors ---------- */

export function hasCompletedChapter(chapterId: string): boolean {
  const run = loadRun();
  return Boolean(run.runs[chapterId]);
}

export function netFluency(run: RunState): number {
  return run.totalFluency - run.totalHintCost;
}

/** A chapter belongs to a hint tier based on its day in the 30-day arc. */
export function hintTierForDay(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

/**
 * The next day the player is allowed to enter. Source of truth: the highest
 * day they've completed + 1, capped at 30. Used by the course page (which
 * day's "Continue" button do we show?) and the chapter route guard (any URL
 * past this redirects back).
 */
export function currentDayFor(run: RunState): number {
  let highestCompleted = 0;
  for (const rec of Object.values(run.runs)) {
    if (rec.day > highestCompleted) highestCompleted = rec.day;
  }
  return Math.min(30, highestCompleted + 1);
}

/** True once the player has completed the Day 30 chapter. */
export function hasFinishedGame(run: RunState): boolean {
  return Object.values(run.runs).some((r) => r.day === 30);
}
