"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
  Chapter,
  NpcLine,
  PlayerChoice,
  PlayerChoiceBeat,
  VoiceProfile,
} from "@/lib/chapters/types";
import {
  Phonetic,
  PhoneticProvider,
  PhoneticText,
  type PhoneticDict,
} from "./Phonetic";
import { AudioButton } from "./AudioButton";

interface Props {
  chapter: Chapter;
  voiceProfiles: VoiceProfile[];
  langCode: string;
}

export function ChapterPlayer({ chapter, voiceProfiles, langCode }: Props) {
  const [beatIdx, setBeatIdx] = useState(0);
  const [fluency, setFluency] = useState(0);
  const [vibes, setVibes] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const profilesById = useMemo(() => {
    const m: Record<string, VoiceProfile> = {};
    for (const p of voiceProfiles) m[p.id] = p;
    return m;
  }, [voiceProfiles]);

  const dict: PhoneticDict = useMemo(() => {
    const d: PhoneticDict = {};
    for (const b of chapter.beats) {
      if (b.kind === "npc") {
        if (b.native && b.translit) d[b.native] = b.translit;
      } else if (b.kind === "choice") {
        for (const c of b.choices) {
          if (c.native && c.translit) d[c.native] = c.translit;
        }
      } else if (b.kind === "build") {
        if (b.target && b.targetTranslit) d[b.target] = b.targetTranslit;
        b.wordTranslits?.forEach((t, i) => {
          const w = b.words[i];
          if (w && t) d[w] = t;
        });
      }
    }
    return d;
  }, [chapter]);

  const beat = chapter.beats[beatIdx];
  const progress = ((beatIdx + 1) / chapter.beats.length) * 100;

  function advance() {
    if (beatIdx < chapter.beats.length - 1) setBeatIdx((i) => i + 1);
    else setDone(true);
  }

  function applyChoice(c: PlayerChoice) {
    if (c.effects.fluency) setFluency((f) => f + c.effects.fluency!);
    if (c.effects.vibes) setVibes((v) => v + c.effects.vibes!);
    if (c.setFlag) setFlags((fs) => [...fs, c.setFlag!]);
    advance();
  }

  return (
    <PhoneticProvider dict={dict}>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/${langCode}`}
            className="text-xs uppercase tracking-[0.2em] text-cream-dim hover:text-accent"
          >
            ← Exit
          </Link>
          <p className="text-xs text-cream-dim">Day {chapter.day}</p>
        </div>

        <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-ink-soft">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${done ? 100 : progress}%` }}
          />
        </div>

        {!done && beatIdx === 0 && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
              Day {chapter.day}
            </p>
            <h1 className="serif mt-2 text-4xl text-cream">{chapter.title}</h1>
            {chapter.titleNative && (
              <p className="font-kn mt-2 text-base text-accent">
                {chapter.titleNative}
              </p>
            )}
            <p className="mt-4 max-w-lg text-sm italic leading-relaxed text-cream-muted">
              {chapter.setting}
            </p>
          </div>
        )}

        <div className="min-h-[20rem]">
          {!done && beat?.kind === "npc" && (
            <NpcBeatView
              beat={beat}
              profile={profilesById[beat.speakerId]}
              onAdvance={advance}
            />
          )}
          {!done && beat?.kind === "choice" && (
            <ChoiceBeatView beat={beat} onChoose={applyChoice} />
          )}
          {done && (
            <Scorecard
              chapter={chapter}
              fluency={fluency}
              vibes={vibes}
              flags={flags}
              langCode={langCode}
            />
          )}
        </div>
      </main>
    </PhoneticProvider>
  );
}

function NpcBeatView({
  beat,
  profile,
  onAdvance,
}: {
  beat: NpcLine;
  profile?: VoiceProfile;
  onAdvance: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {profile.name}
        </p>
      )}
      {beat.beat && (
        <p className="text-xs italic text-cream-dim">— {beat.beat}</p>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="serif text-3xl leading-tight text-cream">
            <PhoneticText text={beat.native} className="font-kn" />
          </p>
          <p className="mt-2 text-sm italic text-cream-dim">{beat.translit}</p>
          <p className="mt-4 text-sm text-cream-muted">{beat.en}</p>
        </div>
        <AudioButton src={beat.audio} autoPlay size="md" />
      </div>

      <button
        onClick={onAdvance}
        className="mt-4 self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-accent-deep"
      >
        Continue →
      </button>
    </div>
  );
}

function ChoiceBeatView({
  beat,
  onChoose,
}: {
  beat: PlayerChoiceBeat;
  onChoose: (c: PlayerChoice) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {beat.prompt && (
        <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
          {beat.prompt}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {beat.choices.map((c, i) => (
          <button
            key={i}
            onClick={() => onChoose(c)}
            className="group rounded-md border border-cream/10 bg-ink-soft px-5 py-4 text-left transition hover:border-accent/40 hover:bg-ink-muted"
          >
            {c.native ? (
              <p className="font-kn text-lg text-cream">{c.native}</p>
            ) : null}
            {c.translit && (
              <p className="mt-0.5 text-xs italic text-cream-dim">
                {c.translit}
              </p>
            )}
            <p className={cn("text-sm", c.native ? "mt-2 text-cream-muted" : "text-cream")}>
              {c.en}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Scorecard({
  chapter,
  fluency,
  vibes,
  flags,
  langCode,
}: {
  chapter: Chapter;
  fluency: number;
  vibes: number;
  flags: string[];
  langCode: string;
}) {
  const verdict =
    fluency + vibes >= 8
      ? "He nodded. You're in."
      : fluency + vibes >= 4
      ? "He took your money. You're in the auto."
      : "He drove off. You're getting another one.";

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        Day {chapter.day} complete
      </p>
      <h2 className="serif text-4xl text-cream">{chapter.title}</h2>
      <p className="serif italic text-cream-muted">{verdict}</p>

      <div className="my-6 grid w-full grid-cols-2 gap-4">
        <Stat label="Fluency" value={String(fluency)} />
        <Stat label="Vibes" value={String(vibes)} />
      </div>

      {flags.length > 0 && (
        <p className="text-xs italic text-cream-dim">
          Flags: {flags.join(", ")}
        </p>
      )}

      <Link
        href={`/${langCode}`}
        className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
      >
        ← Back
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
