"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { WordBankExercise } from "@/lib/types";
import { AudioButton } from "../AudioButton";
import { Phonetic } from "../Phonetic";

interface Props {
  exercise: WordBankExercise;
  onComplete: (correct: boolean) => void;
}

export function WordBank({ exercise, onComplete }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);

  const remaining = useMemo(
    () =>
      exercise.words
        .map((_, i) => i)
        .filter((i) => !selected.includes(i)),
    [selected, exercise.words]
  );

  const finished = selected.length === exercise.words.length;
  const isCorrect =
    finished &&
    selected.every((idx, pos) => idx === exercise.correctOrder[pos]);

  function pick(i: number) {
    if (locked) return;
    setSelected([...selected, i]);
  }

  function unpick(pos: number) {
    if (locked) return;
    setSelected(selected.filter((_, p) => p !== pos));
  }

  function check() {
    setLocked(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
          Build the sentence
        </p>
        <p className="serif mt-3 text-2xl text-cream">{exercise.prompt}</p>
      </div>

      <div className="min-h-[5rem] rounded-md border border-cream/10 bg-ink-soft p-4">
        <div className="flex flex-wrap gap-2">
          {selected.length === 0 && (
            <p className="text-sm text-cream-dim">Tap words below to build</p>
          )}
          {selected.map((wordIdx, pos) => (
            <button
              key={`s-${pos}`}
              onClick={() => unpick(pos)}
              disabled={locked}
              className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-cream transition hover:bg-accent/20 disabled:opacity-70"
            >
              <Phonetic
                native={exercise.words[wordIdx]}
                translit={exercise.wordTranslits?.[wordIdx] ?? undefined}
                size="sm"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {remaining.map((i) => (
          <button
            key={`r-${i}`}
            onClick={() => pick(i)}
            disabled={locked}
            className="rounded border border-cream/10 bg-ink-soft px-3 py-2 text-cream transition hover:border-accent/40 hover:bg-ink-muted disabled:opacity-50"
          >
            <Phonetic
              native={exercise.words[i]}
              translit={exercise.wordTranslits?.[i] ?? undefined}
              size="sm"
            />
          </button>
        ))}
      </div>

      {!locked && finished && (
        <button
          onClick={check}
          className="self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-accent-deep"
        >
          Check answer
        </button>
      )}

      {locked && (
        <div
          className={cn(
            "rounded-md border px-5 py-4",
            isCorrect ? "border-good/40 bg-good/5" : "border-bad/40 bg-bad/5"
          )}
        >
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCorrect ? "text-good" : "text-bad"
                )}
              >
                {isCorrect ? "Correct" : "Not quite"}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <p className="font-kn text-lg text-cream">{exercise.target}</p>
                <AudioButton src={exercise.targetAudio} autoPlay size="sm" />
              </div>
              <p className="mt-1 text-xs italic text-cream-dim">
                {exercise.targetTranslit}
              </p>
              {exercise.explanation && (
                <p className="mt-3 text-sm leading-relaxed text-cream-muted">
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
