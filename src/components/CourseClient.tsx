"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  loadRun,
  currentDayFor,
  hasFinishedGame,
  type RunState,
} from "@/lib/player";
import type { Chapter } from "@/lib/chapters/types";
import type { Course } from "@/lib/types";

interface Props {
  course: Course;
  chapters: Chapter[];
}

/**
 * Linear progression UI for the 30-day chapter arc.
 *
 * Always shows ONE prominent CTA: "Continue Day X" (or "Replay Day 30 ending"
 * once finished). The chapter list is no longer pickable — completed days
 * collapse into a History accordion underneath, future days don't render at
 * all. The lessons section (skill drills, not story) still appears below
 * for self-directed practice between chapters.
 *
 * Source of truth for "where you are": run.runs (which days are completed) →
 * `currentDayFor(run)` returns the next un-played day in 1..30.
 */
export function CourseClient({ course, chapters }: Props) {
  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.day - b.day),
    [chapters]
  );

  const [run, setRun] = useState<RunState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setRun(loadRun());
    function onStorage(e: StorageEvent) {
      if (e.key === "phodi.run.v1") setRun(loadRun());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Until localStorage hydrates, assume Day 1 — keeps the SSR / first paint
  // sensible. The component re-renders the moment we have real run state.
  const currentDay = run ? currentDayFor(run) : 1;
  const finished = run ? hasFinishedGame(run) : false;
  const currentChapter = sorted.find((c) => c.day === currentDay) ?? sorted[0];
  const completedChapters = sorted.filter((c) => run?.runs[c.id]);

  return (
    <>
      {/* The Game --------------------------------------------------------- */}
      <section className="mb-12">
        <div className="mb-6 flex items-baseline justify-between border-b border-cream/10 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              The Game
            </p>
            <h2 className="serif mt-1 text-2xl text-cream">
              Thirty Days in Bangalore
            </h2>
          </div>
          <p className="text-xs text-cream-dim">
            {completedChapters.length} / 30 days
          </p>
        </div>

        {!finished && currentChapter && (
          <Link
            href={`/${course.language}/chapter/${currentChapter.id}`}
            className="group block rounded-lg border border-accent/30 bg-accent/[0.04] p-6 transition hover:border-accent/60 hover:bg-accent/[0.08]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              {completedChapters.length === 0 ? "Begin" : "Continue"}
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="serif text-3xl text-cream">
                Day {String(currentChapter.day).padStart(2, "0")}
              </span>
              <span className="serif text-2xl text-cream-muted">·</span>
              <span className="serif text-2xl text-cream">
                {currentChapter.title}
              </span>
            </div>
            {currentChapter.titleNative && (
              <p className="font-kn mt-2 text-sm text-cream-muted">
                {currentChapter.titleNative}
              </p>
            )}
            <p className="mt-4 text-sm italic leading-relaxed text-cream-muted">
              {currentChapter.setting}
            </p>
            <p className="mt-5 text-xs text-cream-dim transition group-hover:text-accent">
              Enter the day →
            </p>
          </Link>
        )}

        {finished && (
          <Link
            href={`/${course.language}/chapter/${sorted[sorted.length - 1].id}`}
            className="group block rounded-lg border border-accent/30 bg-accent/[0.04] p-6 transition hover:border-accent/60 hover:bg-accent/[0.08]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              The Morning · ending
            </p>
            <p className="mt-2 serif text-3xl text-cream">
              Replay Day 30
            </p>
            <p className="mt-4 text-sm italic leading-relaxed text-cream-muted">
              Your ending is named. Re-enter the last day to see it again, or
              start fresh from settings.
            </p>
          </Link>
        )}

        {completedChapters.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="text-xs uppercase tracking-[0.2em] text-cream-dim transition hover:text-cream"
            >
              {historyOpen ? "Hide" : "Show"} history ·{" "}
              {completedChapters.length} day
              {completedChapters.length === 1 ? "" : "s"}
            </button>

            {historyOpen && (
              <ol className="mt-4 space-y-2">
                {completedChapters.map((c) => {
                  const record = run?.runs[c.id];
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/${course.language}/chapter/${c.id}`}
                        className="group flex items-center justify-between rounded-md border border-cream/10 bg-ink-soft/60 px-5 py-3 transition hover:border-cream/30"
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="text-xs text-cream-dim">
                            Day {String(c.day).padStart(2, "0")}
                          </span>
                          <span className="text-cream">{c.title}</span>
                        </div>
                        {record && (
                          <span className="text-[10px] uppercase tracking-[0.15em] text-cream-dim">
                            {record.fluency + record.vibes - record.hintCost} pts
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>

      {/* Lessons (skill drills) ------------------------------------------- */}
      <div className="space-y-10">
        {course.units.map((unit) => (
          <section key={unit.id}>
            <div className="mb-4 flex items-baseline justify-between border-b border-cream/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
                  Unit {unit.order}
                </p>
                <h2 className="serif mt-1 text-2xl text-cream">{unit.title}</h2>
              </div>
              {unit.titleNative && (
                <p className="font-kn text-cream-muted">{unit.titleNative}</p>
              )}
            </div>
            <p className="mb-6 text-sm text-cream-muted">{unit.description}</p>

            <ol className="space-y-2">
              {unit.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/${course.language}/lesson/${lesson.id}`}
                    className={cn(
                      "group flex items-center justify-between rounded-md border border-cream/10 bg-ink-soft px-5 py-4 transition hover:border-accent/40 hover:bg-ink-muted"
                    )}
                  >
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs text-cream-dim">
                          {String(lesson.order).padStart(2, "0")}
                        </span>
                        <span className="font-medium text-cream">
                          {lesson.title}
                        </span>
                        <span className="font-kn text-sm text-cream-muted">
                          {lesson.titleNative}
                        </span>
                        {lesson.titleNativeTranslit && (
                          <span className="text-xs italic text-cream-dim">
                            {lesson.titleNativeTranslit}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 ml-7 text-xs text-cream-muted">
                        {lesson.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-cream-dim">
                      <span>{lesson.estimatedMinutes} min</span>
                      <span className="text-accent">+{lesson.xp} XP</span>
                      <span className="transition group-hover:text-accent">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
