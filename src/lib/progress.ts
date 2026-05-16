"use client";

const KEY = "phodi.progress.v1";

export interface Progress {
  xp: number;
  streakDays: number;
  lastActiveISO: string | null;
  completedLessons: string[];
  knownLanguages: ("ta" | "ml")[];
}

const DEFAULT: Progress = {
  xp: 0,
  streakDays: 0,
  lastActiveISO: null,
  completedLessons: [],
  knownLanguages: [],
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return DEFAULT;
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function completeLesson(lessonId: string, xpAward: number): Progress {
  const p = loadProgress();
  const today = todayISO();

  let streakDays = p.streakDays;
  if (!p.lastActiveISO) {
    streakDays = 1;
  } else {
    const gap = daysBetween(p.lastActiveISO, today);
    if (gap === 0) {
      // same day, streak unchanged
    } else if (gap === 1) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
  }

  const completed = p.completedLessons.includes(lessonId)
    ? p.completedLessons
    : [...p.completedLessons, lessonId];

  const next: Progress = {
    ...p,
    xp: p.xp + (p.completedLessons.includes(lessonId) ? 0 : xpAward),
    streakDays,
    lastActiveISO: today,
    completedLessons: completed,
  };
  saveProgress(next);
  return next;
}

export function setKnownLanguages(langs: ("ta" | "ml")[]): Progress {
  const p = loadProgress();
  const next = { ...p, knownLanguages: langs };
  saveProgress(next);
  return next;
}
