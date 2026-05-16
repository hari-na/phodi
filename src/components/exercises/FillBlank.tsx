"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FillBlankExercise } from "@/lib/types";
import { AudioButton } from "../AudioButton";
import { Phonetic, PhoneticText } from "../Phonetic";

interface Props {
  exercise: FillBlankExercise;
  onComplete: (correct: boolean) => void;
}

export function FillBlank({ exercise, onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const locked = selected !== null;
  const isCorrect = selected === exercise.correctIndex;

  const [before, after] = exercise.promptParts;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
          Fill in the blank
        </p>
        <p className="mt-3 text-2xl text-cream leading-relaxed">
          <PhoneticText text={before} className="font-kn" />
          <span
            className={cn(
              "mx-1 inline-block min-w-[6ch] border-b-2 px-2 align-baseline transition font-kn",
              locked
                ? isCorrect
                  ? "border-good text-good"
                  : "border-bad text-bad"
                : "border-accent text-accent"
            )}
          >
            {locked ? exercise.options[selected!] : "___"}
          </span>
          <PhoneticText text={after} className="font-kn" />
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {exercise.options.map((opt, i) => {
          const isThisCorrect = i === exercise.correctIndex;
          const isThisSelected = i === selected;
          const showAsCorrect = locked && isThisCorrect;
          const showAsWrong = locked && isThisSelected && !isThisCorrect;

          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => setSelected(i)}
              className={cn(
                "rounded-md border px-5 py-4 text-left transition",
                "border-cream/10 bg-ink-soft text-cream",
                !locked && "hover:border-accent/40 hover:bg-ink-muted",
                showAsCorrect && "border-good/60 bg-good/10",
                showAsWrong && "border-bad/60 bg-bad/10",
                locked && !isThisSelected && !isThisCorrect && "opacity-50"
              )}
            >
              <Phonetic
                native={opt}
                translit={exercise.optionTranslits?.[i] ?? undefined}
                size="md"
              />
            </button>
          );
        })}
      </div>

      {locked && (
        <div
          className={cn(
            "rounded-md border px-5 py-4",
            isCorrect ? "border-good/40 bg-good/5" : "border-bad/40 bg-bad/5"
          )}
        >
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  isCorrect ? "text-good" : "text-bad"
                )}
              >
                {isCorrect ? "Correct" : "Not quite"}
              </p>
              {exercise.audio && (
                <div className="mt-2">
                  <AudioButton src={exercise.audio} autoPlay size="sm" />
                </div>
              )}
              {exercise.explanation && (
                <p className="mt-2 text-sm leading-relaxed text-cream-muted">
                  {exercise.explanation}
                </p>
              )}
            </div>
            <button
              onClick={() => onComplete(isCorrect)}
              className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent-deep"
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
