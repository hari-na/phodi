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
export type LoveInterestPreference = "anika" | "anik" | "skip";
export type ArtStylePreference = "painterly" | "comic";

export interface PlayerProfile {
  name: string;
  knownLanguages: KnownLanguage[];
  loveInterest: LoveInterestPreference;
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

export interface ChapterRunRecord {
  chapterId: string;
  fluency: number;
  vibes: number;
  hintCost: number;     // Fluency points spent on "Show meaning" toggles
  flags: string[];
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
}

const PROFILE_KEY = "phodi.player.v1";
const RUN_KEY = "phodi.run.v1";

const DEFAULT_RUN: RunState = {
  totalFluency: 0,
  totalVibes: 0,
  totalHintCost: 0,
  flags: [],
  runs: {},
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
    // We can't cleanly subtract prior flags (could overlap with other chapters)
    // so we just merge the new set in.
  }
  run.totalFluency += record.fluency;
  run.totalVibes += record.vibes;
  run.totalHintCost += record.hintCost;
  run.flags = Array.from(new Set([...run.flags, ...record.flags]));
  run.runs[record.chapterId] = record;
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
