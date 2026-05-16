"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Lesson, VocabItem } from "@/lib/types";
import { MultipleChoice } from "./exercises/MultipleChoice";
import { WordBank } from "./exercises/WordBank";
import { FillBlank } from "./exercises/FillBlank";
import { AudioButton } from "./AudioButton";
import {
  PhoneticProvider,
  buildPhoneticDict,
  Phonetic,
} from "./Phonetic";
import { completeLesson } from "@/lib/progress";

type Phase = "intro" | "vocab" | "exercise" | "done";

interface Props {
  lesson: Lesson;
  langCode: string;
}

export function LessonPlayer({ lesson, langCode }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [vocabIdx, setVocabIdx] = useState(0);
  const [exIdx, setExIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finalState, setFinalState] = useState<{
    xp: number;
    streakDays: number;
  } | null>(null);

  const phoneticDict = useMemo(() => buildPhoneticDict(lesson), [lesson]);

  const totalExercises = lesson.exercises.length;
  const totalVocab = lesson.vocabulary.length;
  const progress =
    phase === "exercise"
      ? (exIdx / totalExercises) * 100
      : phase === "done"
      ? 100
      : phase === "vocab"
      ? 0
      : 0;

  function nextVocab() {
    if (vocabIdx < totalVocab - 1) setVocabIdx(vocabIdx + 1);
    else setPhase("exercise");
  }

  function prevVocab() {
    if (vocabIdx > 0) setVocabIdx(vocabIdx - 1);
  }

  function onAnswer(wasCorrect: boolean) {
    if (wasCorrect) setCorrect((c) => c + 1);
    if (exIdx < totalExercises - 1) {
      setExIdx(exIdx + 1);
    } else {
      const result = completeLesson(lesson.id, lesson.xp);
      setFinalState({ xp: result.xp, streakDays: result.streakDays });
      setPhase("done");
    }
  }

  return (
    <PhoneticProvider dict={phoneticDict}>
      <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={`/${langCode}`}
          className="text-xs uppercase tracking-[0.2em] text-cream-dim hover:text-accent"
        >
          ← Exit
        </Link>
        <p className="text-xs text-cream-dim">
          {phase === "exercise"
            ? `${exIdx + 1} / ${totalExercises}`
            : phase === "vocab"
            ? `Word ${vocabIdx + 1} / ${totalVocab}`
            : ""}
        </p>
      </div>

      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-ink-soft">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {phase === "intro" && (
        <Intro lesson={lesson} onStart={() => setPhase("vocab")} />
      )}

      {phase === "vocab" && (
        <VocabCard
          item={lesson.vocabulary[vocabIdx]}
          onNext={nextVocab}
          onPrev={prevVocab}
          canPrev={vocabIdx > 0}
          isLast={vocabIdx === totalVocab - 1}
        />
      )}

      {phase === "exercise" && (
        <div key={exIdx}>
          {(() => {
            const ex = lesson.exercises[exIdx];
            switch (ex.type) {
              case "multipleChoice":
                return <MultipleChoice exercise={ex} onComplete={onAnswer} />;
              case "wordBank":
                return <WordBank exercise={ex} onComplete={onAnswer} />;
              case "fillBlank":
                return <FillBlank exercise={ex} onComplete={onAnswer} />;
            }
          })()}
        </div>
      )}

      {phase === "done" && finalState && (
        <Done
          correct={correct}
          total={totalExercises}
          xp={finalState.xp}
          streakDays={finalState.streakDays}
          langCode={langCode}
          lesson={lesson}
        />
      )}
    </main>
    </PhoneticProvider>
  );
}

function Intro({ lesson, onStart }: { lesson: Lesson; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5">
        <p className="font-kn text-sm text-accent">{lesson.titleNative}</p>
        {lesson.titleNativeTranslit && (
          <p className="text-xs italic text-cream-dim">
            {lesson.titleNativeTranslit}
          </p>
        )}
      </div>
      <h1 className="serif text-5xl text-cream">{lesson.title}</h1>
      <p className="max-w-md text-cream-muted">{lesson.description}</p>

      <div className="my-2 flex gap-4 text-xs text-cream-dim">
        <span>{lesson.estimatedMinutes} min</span>
        <span>·</span>
        <span>{lesson.vocabulary.length} new words</span>
        <span>·</span>
        <span className="text-accent">+{lesson.xp} XP</span>
      </div>

      <button
        onClick={onStart}
        className="self-start rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
      >
        Start →
      </button>
    </div>
  );
}

function VocabCard({
  item,
  onNext,
  onPrev,
  canPrev,
  isLast,
}: {
  item: VocabItem;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        New word
      </p>

      <div>
        <div className="flex items-center gap-4">
          <p className="font-kn text-5xl text-cream">{item.native}</p>
          <AudioButton src={item.audio} autoPlay />
        </div>
        <p className="mt-2 text-sm italic text-cream-dim">{item.translit}</p>
        <p className="serif mt-4 text-2xl text-accent">{item.en}</p>
      </div>

      {item.notes && (
        <p className="max-w-md text-sm leading-relaxed text-cream-muted">
          {item.notes}
        </p>
      )}

      {item.bridges && (item.bridges.ta || item.bridges.ml) && (
        <div className="space-y-3 rounded-md border border-cream/10 bg-ink-soft p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
            If you know
          </p>
          {item.bridges.ta && (
            <Bridge
              lang="Tamil"
              word={item.bridges.ta.word}
              translit={item.bridges.ta.translit}
              note={item.bridges.ta.note}
            />
          )}
          {item.bridges.ml && (
            <Bridge
              lang="Malayalam"
              word={item.bridges.ml.word}
              translit={item.bridges.ml.translit}
              note={item.bridges.ml.note}
            />
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className={cn(
            "text-sm text-cream-dim transition",
            canPrev ? "hover:text-cream" : "opacity-30"
          )}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-accent-deep"
        >
          {isLast ? "Start exercises →" : "Got it →"}
        </button>
      </div>
    </div>
  );
}

function Bridge({
  lang,
  word,
  translit,
  note,
}: {
  lang: string;
  word: string;
  translit: string;
  note: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        {lang}
      </p>
      <p className="mt-1 text-xl text-cream">
        {word}
        <span className="ml-3 text-sm italic text-cream-dim">{translit}</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-cream-muted">{note}</p>
    </div>
  );
}

function Done({
  correct,
  total,
  xp,
  streakDays,
  langCode,
  lesson,
}: {
  correct: number;
  total: number;
  xp: number;
  streakDays: number;
  langCode: string;
  lesson: Lesson;
}) {
  const pct = Math.round((correct / total) * 100);
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        Lesson complete
      </p>
      <h2 className="serif text-5xl text-cream">{lesson.title}</h2>
      <div className="flex flex-col items-center gap-0.5">
        <p className="font-kn text-2xl text-accent">{lesson.titleNative}</p>
        {lesson.titleNativeTranslit && (
          <p className="text-xs italic text-cream-dim">
            {lesson.titleNativeTranslit}
          </p>
        )}
      </div>

      <div className="my-6 grid w-full grid-cols-3 gap-4">
        <Stat label="Accuracy" value={`${pct}%`} />
        <Stat label="Total XP" value={String(xp)} />
        <Stat label="Streak" value={`${streakDays}d`} />
      </div>

      <Link
        href={`/${langCode}`}
        className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
      >
        Back to course →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cream/10 bg-ink-soft px-4 py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </p>
      <p className="serif mt-2 text-3xl text-cream">{value}</p>
    </div>
  );
}
