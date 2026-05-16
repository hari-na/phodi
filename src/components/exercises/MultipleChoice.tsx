"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MultipleChoiceExercise } from "@/lib/types";
import { AudioButton } from "../AudioButton";
import { Phonetic, PhoneticText } from "../Phonetic";

interface Props {
  exercise: MultipleChoiceExercise;
  onComplete: (correct: boolean) => void;
}

export function MultipleChoice({ exercise, onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const locked = selected !== null;
  const isCorrect = selected === exercise.correctIndex;

  const knLike = /[ಀ-೿]/;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
            Choose one
          </p>
          <AudioButton src={exercise.audio} autoPlay size="sm" />
        </div>
        <p
          className={cn(
            "mt-3 text-2xl text-cream leading-relaxed",
            knLike.test(exercise.prompt) && !/[A-Za-z]/.test(exercise.prompt)
              ? "font-kn"
              : "serif"
          )}
        >
          <PhoneticText text={exercise.prompt} />
        </p>
      </div>

      <div className="grid gap-3">
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
                "w-full rounded-md border px-5 py-4 text-left transition",
                "border-cream/10 bg-ink-soft text-cream",
                !locked && "hover:border-accent/40 hover:bg-ink-muted",
                showAsCorrect && "border-good/60 bg-good/10 text-cream",
                showAsWrong && "border-bad/60 bg-bad/10 text-cream",
                locked &&
                  !isThisSelected &&
                  !isThisCorrect &&
                  "opacity-50"
              )}
            >
              {knLike.test(opt) ? (
                <Phonetic
                  native={opt}
                  translit={exercise.optionTranslits?.[i] ?? undefined}
                  size="md"
                />
              ) : (
                <span className="text-lg font-sans">{opt}</span>
              )}
            </button>
          );
        })}
      </div>

      {locked && (
        <Feedback
          correct={isCorrect}
          explanation={exercise.explanation}
          onContinue={() => onComplete(isCorrect)}
        />
      )}
    </div>
  );
}

function Feedback({
  correct,
  explanation,
  onContinue,
}: {
  correct: boolean;
  explanation?: string;
  onContinue: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-5 py-4",
        correct
          ? "border-good/40 bg-good/5"
          : "border-bad/40 bg-bad/5"
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-sm font-medium",
              correct ? "text-good" : "text-bad"
            )}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          {explanation && (
            <p className="mt-2 text-sm leading-relaxed text-cream-muted">
              {explanation}
            </p>
          )}
        </div>
        <button
          onClick={onContinue}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent-deep"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
