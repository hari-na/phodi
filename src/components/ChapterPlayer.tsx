"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  hintTierForDay,
  loadProfile,
  loadRun,
  netFluency,
  recordChapterRun,
  type PlayerProfile,
  type RunState,
} from "@/lib/player";

interface Props {
  chapter: Chapter;
  voiceProfiles: VoiceProfile[];
  langCode: string;
}

/** Fluency points lost per "Show meaning" tap. */
const HINT_COST = 2;

export function ChapterPlayer({ chapter, voiceProfiles, langCode }: Props) {
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

  useEffect(() => {
    setProfile(loadProfile());
    setRunBeforeChapter(loadRun());
  }, []);

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
      // Persist this run's contribution to localStorage
      const result = recordChapterRun({
        chapterId: chapter.id,
        fluency,
        vibes,
        hintCost,
        flags,
        completedAtISO: new Date().toISOString(),
      });
      setFinalRun(result);
      setDone(true);
    }
  }

  function applyChoice(c: PlayerChoice) {
    if (c.effects.fluency) setFluency((f) => f + c.effects.fluency!);
    if (c.effects.vibes) setVibes((v) => v + c.effects.vibes!);
    if (c.setFlag) setFlags((fs) => [...fs, c.setFlag!]);
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
              run={finalRun}
              langCode={langCode}
              playerName={playerName}
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
}: {
  beat: NpcLine;
  profile?: VoiceProfile;
  tier: 1 | 2 | 3;
  revealed: boolean;
  onReveal: () => void;
  onAdvance: () => void;
  playerName: string;
}) {
  const showEnglish = tier === 1 || revealed;
  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {profile.name}
        </p>
      )}
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
  onChoose: (c: PlayerChoice) => void;
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
            onClick={() => onChoose(c)}
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
  run,
  langCode,
  playerName,
}: {
  chapter: Chapter;
  fluency: number;
  vibes: number;
  hintCost: number;
  flags: string[];
  run: RunState;
  langCode: string;
  playerName: string;
}) {
  // Day 30 gets a special ending screen
  if (chapter.day === 30) {
    return (
      <EndingScreen
        run={run}
        langCode={langCode}
        playerName={playerName}
        flags={flags}
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

      <Link
        href={`/${langCode}`}
        className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
      >
        ← Back to chapters
      </Link>
    </div>
  );
}

function EndingScreen({
  run,
  langCode,
  playerName,
  flags,
}: {
  run: RunState;
  langCode: string;
  playerName: string;
  flags: string[];
}) {
  const net = netFluency(run);
  const score = net + run.totalVibes;

  // Did they pick the "stay" branch this chapter?
  const stayed = run.flags.includes("chose_stay_anika");
  const unsure = run.flags.includes("chose_unsure");
  const left = run.flags.includes("chose_leave");

  let title: string;
  let body: string;

  if (left) {
    title = "You went home.";
    body =
      score >= 60
        ? `${playerName}. The auto driver who picked you up at KIA airport recognised your face on the way out. He gave you a discount and told you to come back. You will. The bevu and the bella — you'll carry both.`
        : `${playerName}. The taxi to the airport was quiet. Anika's last voicemail plays. You learned what you needed to know — that this city wasn't yours yet. Maybe next time.`;
  } else if (unsure) {
    title = "You'll figure it out.";
    body =
      score >= 60
        ? `${playerName}. You didn't promise her anything. She didn't ask. The lease has eight months left. Lokesh nods at you every morning. Saraswati made bisi bele bath on Friday without being asked. The city is teaching you to stop deciding so fast.`
        : `${playerName}. You stayed. You're trying. The Kannada is still uneven, the Vibes still wobble, but neither of you has packed a bag yet. Sometimes that's enough.`;
  } else if (stayed) {
    if (score >= 70 && run.flags.includes("amma_recovered") && run.flags.includes("anna_regular")) {
      title = "You belong here now.";
      body = `${playerName}. Anna saw you from the stall and waved without asking what you wanted. Lokesh's logbook has your full name in it now. Amma calls before she calls Anika. Appa, once, said "good" — and once is enough. You think in Kannada all day without noticing once. ನಮಸ್ಕಾರ ${playerName}. ಸ್ವಾಗತ.`;
    } else if (score >= 40) {
      title = "You belong here now.";
      body = `${playerName}. You stayed. The city accepted you slowly. Some doors are open, some are still closing. There's another hundred days ahead — and you've already learned which ones get easier.`;
    } else {
      title = "You stayed.";
      body = `${playerName}. The flat is yours. The job is yours. The Kannada is shaky and the Vibes wobble, but Anika smiled this morning. The rest, the city will teach you.`;
    }
  } else {
    title = "End of the first hundred days.";
    body = `${playerName}. The story isn't quite over. Go back and finish Day 30 — pick a path. Stay, pause, or go.`;
  }

  return (
    <div className="flex flex-col gap-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        The morning · ending
      </p>
      <h2 className="serif text-5xl text-cream">{title}</h2>

      <p className="serif text-xl italic leading-relaxed text-cream-muted">
        {body}
      </p>

      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <Stat label="Fluency" value={String(net)} />
        <Stat label="Vibes" value={String(run.totalVibes)} />
        <Stat label="Total" value={String(score)} />
      </div>

      <p className="mt-2 text-xs text-cream-dim">
        {Object.keys(run.runs).length} chapters played. {run.flags.length} flags
        set across the run.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/${langCode}`}
          className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-deep"
        >
          ← Chapters
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
