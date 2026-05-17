"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type {
  Chapter,
  NpcLine,
  PlayerChoice,
  PlayerChoiceBeat,
  VoiceProfile,
} from "@/lib/chapters/types";
import { getAllChapters } from "@/lib/chapters/content";
import type { LanguageCode } from "@/lib/types";
import {
  Phonetic,
  PhoneticProvider,
  PhoneticText,
  type PhoneticDict,
} from "./Phonetic";
import { AudioButton } from "./AudioButton";
import { SceneBackground } from "./SceneBackground";
import { AmbientPlayer } from "./AmbientPlayer";
import { CharacterPortrait } from "./CharacterPortrait";
import { StyleToggle } from "./StyleToggle";
import {
  hintTierForDay,
  loadArtStyle,
  loadProfile,
  loadRun,
  netFluency,
  recordChapterRun,
  recordEnding,
  currentDayFor,
  type ArtStylePreference,
  type ChoicePickRecord,
  type PlayerProfile,
  type RunState,
} from "@/lib/player";
import { resolveEnding, renderEndingBody, type Ending } from "@/lib/endings";
import { generateReflection } from "@/lib/reflection";

interface Props {
  chapter: Chapter;
  voiceProfiles: VoiceProfile[];
  langCode: string;
}

/** Fluency points lost per "Show meaning" tap. */
const HINT_COST = 2;

export function ChapterPlayer({ chapter, voiceProfiles, langCode }: Props) {
  const router = useRouter();
  const [beatIdx, setBeatIdx] = useState(0);
  const [fluency, setFluency] = useState(0);
  const [vibes, setVibes] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [hintCost, setHintCost] = useState(0);
  const [revealedBeats, setRevealedBeats] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [runBeforeChapter, setRunBeforeChapter] = useState<RunState | null>(null);
  const [finalRun, setFinalRun] = useState<RunState | null>(null);
  const [artStyle, setArtStyle] = useState<ArtStylePreference>("painterly");
  /**
   * Per-choice picks captured during play, used by the end-of-day debrief
   * to show "what could go better." Keyed by beat index; only choice beats
   * the player has answered appear here.
   */
  const [picks, setPicks] = useState<Record<number, ChoicePickRecord>>({});
  /**
   * Per-character affection deltas accrued in this chapter. We pull them
   * from `choice.effects.affection` (optional new field) — defaults to {}
   * when no choices in this chapter set affection.
   */
  const [affectionDelta, setAffectionDelta] = useState<Record<string, number>>({});

  useEffect(() => {
    setProfile(loadProfile());
    const r = loadRun();
    setRunBeforeChapter(r);
    setArtStyle(loadArtStyle());

    // Linear progression guard: if the player navigated to a future day's
    // URL (bookmark, share link, manual edit), bounce them back to the
    // chapter they're actually allowed to enter. Replays of past days are
    // fine — they're reading their own history.
    const allowedDay = currentDayFor(r);
    if (chapter.day > allowedDay) {
      router.replace(`/${langCode}`);
      return;
    }

    function onStorage(e: StorageEvent) {
      if (e.key === "phodi.artStyle.v1") setArtStyle(loadArtStyle());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [chapter.day, langCode, router]);

  // Compute the next chapter (by day order) so the scorecard can chain.
  const nextChapter = useMemo(() => {
    const allChapters = getAllChapters(langCode as LanguageCode);
    const sorted = [...allChapters].sort((a, b) => a.day - b.day);
    const idx = sorted.findIndex((c) => c.id === chapter.id);
    if (idx === -1 || idx === sorted.length - 1) return null;
    return sorted[idx + 1];
  }, [chapter.id, langCode]);

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

  const tier = hintTierForDay(chapter.day);
  const beat = chapter.beats[beatIdx];
  const progress = ((beatIdx + 1) / chapter.beats.length) * 100;
  const playerName = profile?.name ?? "You";

  function advance() {
    if (beatIdx < chapter.beats.length - 1) {
      setBeatIdx((i) => i + 1);
    } else {
      // Persist this run's contribution to localStorage. We pull the picks
      // map into a sorted array so the debrief shows them in beat order.
      const picksArr = Object.keys(picks)
        .map(Number)
        .sort((a, b) => a - b)
        .map((idx) => picks[idx]);
      const result = recordChapterRun({
        chapterId: chapter.id,
        day: chapter.day,
        fluency,
        vibes,
        hintCost,
        flags,
        picks: picksArr,
        affectionDelta,
        completedAtISO: new Date().toISOString(),
      });
      setFinalRun(result);
      setDone(true);
    }
  }

  function applyChoice(c: PlayerChoice, choiceIdx: number) {
    if (c.effects.fluency) setFluency((f) => f + c.effects.fluency!);
    if (c.effects.vibes) setVibes((v) => v + c.effects.vibes!);
    if (c.setFlag) setFlags((fs) => [...fs, c.setFlag!]);

    // Capture the pick + score-vs-best for the end-of-day debrief.
    if (beat && beat.kind === "choice") {
      const scoreOf = (ch: PlayerChoice) =>
        (ch.effects.fluency ?? 0) + (ch.effects.vibes ?? 0);
      let bestIdx = 0;
      let bestScore = scoreOf(beat.choices[0]);
      beat.choices.forEach((ch, i) => {
        const s = scoreOf(ch);
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      });
      setPicks((p) => ({
        ...p,
        [beatIdx]: {
          beatIdx,
          pickedIdx: choiceIdx,
          pickedScore: scoreOf(c),
          bestIdx,
          bestScore,
        },
      }));
    }

    // Accumulate per-character affection deltas if the choice declares any.
    if (c.effects.affection) {
      setAffectionDelta((a) => {
        const next = { ...a };
        for (const [speakerId, delta] of Object.entries(c.effects.affection!)) {
          next[speakerId] = (next[speakerId] ?? 0) + delta;
        }
        return next;
      });
    }
    advance();
  }

  function revealBeatMeaning(idx: number) {
    if (revealedBeats.has(idx)) return;
    const next = new Set(revealedBeats);
    next.add(idx);
    setRevealedBeats(next);
    setHintCost((h) => h + HINT_COST);
  }

  return (
    <PhoneticProvider dict={dict}>
      <SceneBackground chapterId={chapter.id} layout="full" />
      <AmbientPlayer chapterId={chapter.id} />
      <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={`/${langCode}`}
            className="text-xs uppercase tracking-[0.2em] text-cream-dim hover:text-accent"
          >
            ← Exit
          </Link>
          <div className="flex items-center gap-3">
            <StyleToggle />
            <p className="text-xs text-cream-dim">Day {chapter.day}</p>
          </div>
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
              Day {chapter.day} · Tier {tier}
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
            {runBeforeChapter && (runBeforeChapter.totalFluency > 0 || runBeforeChapter.totalVibes > 0) && (
              <p className="mt-6 text-xs text-cream-dim">
                Coming in: <span className="text-accent">{netFluency(runBeforeChapter)} fluency</span>
                {" · "}
                <span className="text-accent">{runBeforeChapter.totalVibes} vibes</span>
              </p>
            )}
            {tier > 1 && (
              <p className="mt-3 text-xs italic text-cream-dim">
                English meanings hidden by default in tier {tier}. Tap "Show meaning" if you need it — but it costs Fluency.
              </p>
            )}
          </div>
        )}

        <div className="min-h-[20rem]">
          {!done && beat?.kind === "npc" && (
            <NpcBeatView
              beat={beat}
              profile={profilesById[beat.speakerId]}
              tier={tier}
              revealed={revealedBeats.has(beatIdx)}
              onReveal={() => revealBeatMeaning(beatIdx)}
              onAdvance={advance}
              playerName={playerName}
              artStyle={artStyle}
            />
          )}
          {!done && beat?.kind === "choice" && (
            <ChoiceBeatView
              beat={beat}
              onChoose={applyChoice}
              playerName={playerName}
            />
          )}
          {done && finalRun && (
            <Scorecard
              chapter={chapter}
              fluency={fluency}
              vibes={vibes}
              hintCost={hintCost}
              flags={flags}
              picks={Object.values(picks).sort((a, b) => a.beatIdx - b.beatIdx)}
              run={finalRun}
              langCode={langCode}
              playerName={playerName}
              nextChapterId={nextChapter?.id ?? null}
              nextChapterTitle={nextChapter?.title ?? null}
              nextChapterDay={nextChapter?.day ?? null}
            />
          )}
        </div>
      </main>
    </PhoneticProvider>
  );
}

/** Replace {name} or [your name] / [you] tokens with the player's chosen name. */
function withName(text: string, name: string): string {
  return text
    .replaceAll("[your name]", name)
    .replaceAll("[you]", name)
    .replaceAll("{name}", name);
}

function NpcBeatView({
  beat,
  profile,
  tier,
  revealed,
  onReveal,
  onAdvance,
  playerName,
  artStyle,
}: {
  beat: NpcLine;
  profile?: VoiceProfile;
  tier: 1 | 2 | 3;
  revealed: boolean;
  onReveal: () => void;
  onAdvance: () => void;
  playerName: string;
  artStyle: ArtStylePreference;
}) {
  const showEnglish = tier === 1 || revealed;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CharacterPortrait speakerId={beat.speakerId} style={artStyle} size="md" />
        {profile && (
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {profile.name}
          </p>
        )}
      </div>
      {beat.beat && (
        <p className="text-xs italic text-cream-dim">— {withName(beat.beat, playerName)}</p>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="serif text-3xl leading-tight text-cream">
            <PhoneticText text={beat.native} className="font-kn" />
          </p>
          <p className="mt-2 text-sm italic text-cream-dim">{beat.translit}</p>
          {showEnglish ? (
            <p className="mt-4 text-sm text-cream-muted">{withName(beat.en, playerName)}</p>
          ) : (
            <button
              onClick={onReveal}
              className="mt-4 text-xs uppercase tracking-[0.18em] text-cream-dim transition hover:text-accent"
              title={`Reveals the English meaning. Costs ${HINT_COST} Fluency.`}
            >
              Show meaning · −{HINT_COST} fluency
            </button>
          )}
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
  playerName,
}: {
  beat: PlayerChoiceBeat;
  onChoose: (c: PlayerChoice, choiceIdx: number) => void;
  playerName: string;
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
            onClick={() => onChoose(c, i)}
            className="group rounded-md border border-cream/10 bg-ink-soft px-5 py-4 text-left transition hover:border-accent/40 hover:bg-ink-muted"
          >
            {c.native ? (
              <p className="font-kn text-lg text-cream">
                {withName(c.native, playerName)}
              </p>
            ) : null}
            {c.translit && (
              <p className="mt-0.5 text-xs italic text-cream-dim">
                {c.translit}
              </p>
            )}
            <p
              className={cn(
                "text-sm",
                c.native ? "mt-2 text-cream-muted" : "text-cream"
              )}
            >
              {withName(c.en, playerName)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scorecards                                                                  */
/* -------------------------------------------------------------------------- */

function Scorecard({
  chapter,
  fluency,
  vibes,
  hintCost,
  flags,
  picks,
  run,
  langCode,
  playerName,
  nextChapterId,
  nextChapterTitle,
  nextChapterDay,
}: {
  chapter: Chapter;
  fluency: number;
  vibes: number;
  hintCost: number;
  flags: string[];
  picks: ChoicePickRecord[];
  run: RunState;
  langCode: string;
  playerName: string;
  nextChapterId: string | null;
  nextChapterTitle: string | null;
  nextChapterDay: number | null;
}) {
  // Day 30 → named ending screen (no debrief, no next-day link)
  if (chapter.day === 30) {
    return (
      <EndingScreen
        run={run}
        langCode={langCode}
        playerName={playerName}
      />
    );
  }

  const score = fluency - hintCost + vibes;
  const verdict =
    score >= 12
      ? "Cleanly done. They'll remember the right things."
      : score >= 6
      ? "You stayed in. The city kept watching."
      : "Bumpy. Tomorrow's another beat.";

  const netF = fluency - hintCost;
  // Only picks where the player didn't take the best-scored option appear
  // in the debrief — everything else was already a clean read.
  const suboptimal = picks.filter((p) => p.pickedIdx !== p.bestIdx);

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        Day {chapter.day} complete
      </p>
      <h2 className="serif text-4xl text-cream">{chapter.title}</h2>
      <p className="serif italic text-cream-muted">{verdict}</p>

      <div className="my-6 grid w-full grid-cols-3 gap-3">
        <Stat label="Fluency" value={String(netF)} sub={hintCost > 0 ? `−${hintCost} hints` : undefined} />
        <Stat label="Vibes" value={String(vibes)} />
        <Stat label="Total run" value={`${netFluency(run)} + ${run.totalVibes}`} />
      </div>

      {flags.length > 0 && (
        <p className="max-w-md text-xs italic text-cream-dim">
          Flags this chapter: {flags.join(", ")}
        </p>
      )}

      <ReflectionPanel
        chapter={chapter}
        picks={picks}
        flags={flags}
        fluency={fluency}
        vibes={vibes}
        hintCost={hintCost}
      />

      {suboptimal.length > 0 && (
        <Debrief chapter={chapter} picks={suboptimal} playerName={playerName} />
      )}

      <div className="flex flex-col items-center gap-3">
        {nextChapterId && nextChapterTitle && nextChapterDay !== null ? (
          <Link
            href={`/${langCode}/chapter/${nextChapterId}`}
            className="rounded-md bg-accent px-7 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
          >
            Continue to Day {nextChapterDay} — {nextChapterTitle} →
          </Link>
        ) : (
          <Link
            href={`/${langCode}`}
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
          >
            ← Back to course
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * End-of-day self-reflection — the player's inner monologue.
 *
 * Synthesised by `generateReflection` from the chapter's choice data,
 * flags set during play, and final scores. Reads like a journal entry:
 * code-switched Kannada-English (the player's inner voice would be, too
 * — they're moving through Bangalore picking up the language), regret-
 * flavoured without being self-flagellating. Sits between the stats and
 * the debrief so it lands as feeling first, mechanics second.
 *
 * Renders nothing if the synthesiser couldn't find anything specific to
 * reflect on (rare — every chapter has at least an opener line).
 */
function ReflectionPanel({
  chapter,
  picks,
  flags,
  fluency,
  vibes,
  hintCost,
}: {
  chapter: Chapter;
  picks: ChoicePickRecord[];
  flags: string[];
  fluency: number;
  vibes: number;
  hintCost: number;
}) {
  const reflection = useMemo(
    () => generateReflection({ chapter, picks, flags, fluency, vibes, hintCost }),
    [chapter, picks, flags, fluency, vibes, hintCost]
  );

  if (reflection.lines.length === 0) return null;

  return (
    <div className="my-4 w-full rounded-md border border-accent/15 bg-accent/[0.04] p-5 text-left">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">
        Looking back
      </p>
      <div className="mt-3 space-y-3">
        {reflection.lines.map((line, i) => (
          <p
            key={i}
            className="serif text-base italic leading-relaxed text-cream"
          >
            {line}
          </p>
        ))}
      </div>

      {reflection.phraseToLearn && (
        <div className="mt-5 border-t border-cream/10 pt-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cream-dim">
            For next time
          </p>
          <p className="font-kn mt-2 text-lg text-cream">
            {reflection.phraseToLearn.native}
          </p>
          {reflection.phraseToLearn.translit && (
            <p className="mt-0.5 text-xs italic text-cream-dim">
              {reflection.phraseToLearn.translit}
            </p>
          )}
          <p className="mt-1 text-sm text-cream-muted">
            {reflection.phraseToLearn.en}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * End-of-day debrief — auto-generated from the chapter's own choice scores.
 *
 * For each beat where the player's pick scored below the best available
 * option, we show: what they said, what would have landed better, and the
 * point delta. No hand-written gloss yet — that's a Phase 2 content lift
 * (per-exchange "why this lands / why this stings" notes).
 */
function Debrief({
  chapter,
  picks,
  playerName,
}: {
  chapter: Chapter;
  picks: ChoicePickRecord[];
  playerName: string;
}) {
  return (
    <div className="my-4 w-full rounded-md border border-cream/10 bg-ink-soft/60 p-5 text-left">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        What could go better
      </p>
      <p className="mt-2 text-xs italic text-cream-dim">
        {picks.length} moment{picks.length === 1 ? "" : "s"} where a different reply would have landed cleaner.
      </p>
      <ul className="mt-4 space-y-4">
        {picks.map((pick) => {
          const beat = chapter.beats[pick.beatIdx];
          if (!beat || beat.kind !== "choice") return null;
          const yours = beat.choices[pick.pickedIdx];
          const better = beat.choices[pick.bestIdx];
          if (!yours || !better) return null;
          const delta = pick.bestScore - pick.pickedScore;
          return (
            <li key={pick.beatIdx} className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-cream-dim">
                You said
              </p>
              {yours.native && (
                <p className="font-kn text-sm text-cream">
                  {withName(yours.native, playerName)}
                </p>
              )}
              <p className="text-sm text-cream-muted">
                {withName(yours.en, playerName)}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-accent">
                Lands better
              </p>
              {better.native && (
                <p className="font-kn text-sm text-cream">
                  {withName(better.native, playerName)}
                </p>
              )}
              <p className="text-sm text-cream-muted">
                {withName(better.en, playerName)}
              </p>
              <p className="text-[10px] italic text-cream-dim">
                +{delta} point{delta === 1 ? "" : "s"} on the cleaner read.
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Day 30 ending screen.
 *
 * The ending is computed by `resolveEnding(run)` from lib/endings.ts —
 * a priority-ordered list of named endings, each with their own qualify
 * predicate over (Fluency, Vibes, per-character affection, flags). The
 * first match wins; the catch-all "Just a Tenant" guarantees we always
 * resolve to something.
 *
 * Once an ending is decided, we persist it via `recordEnding(ending.id)`
 * so the player's "Replay Day 30" CTA on the course page can read which
 * ending they reached. Re-running the chapter may resolve a different
 * ending if their choices change — that's intentional, the ending is
 * always a snapshot of the current run.
 */
function EndingScreen({
  run,
  langCode,
  playerName,
}: {
  run: RunState;
  langCode: string;
  playerName: string;
}) {
  const ending: Ending = useMemo(() => resolveEnding(run), [run]);
  const body = useMemo(
    () => renderEndingBody(ending.body, playerName),
    [ending.body, playerName]
  );

  // Persist the resolved ending on the run record (used by course page CTA).
  useEffect(() => {
    if (run.endingId !== ending.id) {
      recordEnding(ending.id);
    }
  }, [ending.id, run.endingId]);

  const net = netFluency(run);
  const score = net + run.totalVibes;

  const toneAccent =
    ending.tone === "good"
      ? "text-accent"
      : ending.tone === "bad"
      ? "text-cream-dim"
      : "text-cream-muted";

  return (
    <div className="flex flex-col gap-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        The morning · your ending
      </p>

      <h2 className={cn("serif text-5xl", toneAccent)}>{ending.name}</h2>
      <p className="serif text-base italic text-cream-muted">
        {ending.tagline}
      </p>

      <p className="serif text-xl italic leading-relaxed text-cream-muted">
        {body}
      </p>

      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <Stat label="Fluency" value={String(net)} />
        <Stat label="Vibes" value={String(run.totalVibes)} />
        <Stat label="Total" value={String(score)} />
      </div>

      <p className="mt-2 text-xs text-cream-dim">
        {Object.keys(run.runs).length} chapters played · {run.flags.length} flags ·{" "}
        {Object.keys(run.affection ?? {}).length} characters known
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/${langCode}`}
          className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
        >
          ← Course
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-cream/10 bg-ink-soft px-4 py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </p>
      <p className="serif mt-2 text-3xl text-cream">{value}</p>
      {sub && <p className="mt-1 text-[10px] italic text-cream-dim">{sub}</p>}
    </div>
  );
}
