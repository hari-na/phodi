"use client";

import { useEffect, useRef, useState } from "react";
import { getChapterSfx } from "@/lib/sfx";

interface Props {
  chapterId: string;
}

/**
 * Global multiplier applied to every chapter's authored ambient volume.
 * The per-chapter `volume` values in lib/sfx.ts were tuned in isolation;
 * once the TTS dialogue is mixed in on top they read as too loud. This
 * dials the whole ambient bed down without rewriting each entry.
 */
const AMBIENT_GAIN = 0.5;

/**
 * Fraction of the normal ambient volume we drop to while a TTS clip is
 * playing. 0.25 = quarter loudness during speech; podcast / film-mix
 * convention. Restores to full ambient when speech ends.
 */
const DUCK_FACTOR = 0.25;

/**
 * Plays a chapter's ambient loop on mount, crossfades out on unmount,
 * and ducks itself when the dialogue TTS is playing so speech cuts
 * through. The duck signal comes from AudioButton via a window event
 * (`phodi:tts`) — keeps the two components decoupled.
 *
 * Browsers block autoplay until the user has interacted with the page.
 * The first click anywhere (the Start button on the chapter intro
 * counts) unlocks it. If autoplay is denied, we silently stay quiet
 * rather than nag the user.
 *
 * Renders the mute toggle (bottom-right). The audio element is hidden.
 */
export function AmbientPlayer({ chapterId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfx = getChapterSfx(chapterId);
  const [muted, setMuted] = useState(false);
  // True while a dialogue TTS clip is playing — drops the ambient volume.
  const [ducked, setDucked] = useState(false);

  // The "full" volume for this chapter once gain + mute are applied.
  // Computed each render so changes to muted/sfx propagate cleanly.
  const baseVol = sfx ? (sfx.volume ?? 0.35) * AMBIENT_GAIN : 0;
  const targetVol = ducked ? baseVol * DUCK_FACTOR : baseVol;

  // Restore mute preference from localStorage (one toggle for the whole game)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMuted(window.localStorage.getItem("phodi.ambient.muted") === "1");
  }, []);

  // Persist mute preference + apply to the element
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("phodi.ambient.muted", muted ? "1" : "0");
    const a = audioRef.current;
    if (a) a.muted = muted;
  }, [muted]);

  // Listen for TTS playback events from AudioButton so we can duck.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onTts(e: Event) {
      const detail = (e as CustomEvent<{ playing: boolean }>).detail;
      setDucked(Boolean(detail?.playing));
    }
    window.addEventListener("phodi:tts", onTts as EventListener);
    return () => window.removeEventListener("phodi:tts", onTts as EventListener);
  }, []);

  // Smooth ramp to the current targetVol whenever it changes (mount, duck
  // on, duck off). Replaces the old one-shot fade-in.
  useEffect(() => {
    if (!sfx) return;
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    a.play().catch(() => {
      /* autoplay blocked — silent until user interacts */
    });
    const startVol = a.volume;
    const dur = 600; // ms — fast enough to feel responsive, slow enough to be smooth
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      // Ease-out so the ramp settles instead of snapping at the end.
      const eased = 1 - Math.pow(1 - k, 3);
      a.volume = startVol + (targetVol - startVol) * eased;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [sfx, targetVol]);

  // Pause the loop when the component unmounts (chapter change / exit).
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      try {
        if (a) a.pause();
      } catch {
        /* element being torn down */
      }
    };
  }, []);

  if (!sfx) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={sfx.src}
        preload="auto"
        muted={muted}
        playsInline
        // Errors are silent — if the loop file is missing the game still works
        onError={() => {}}
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute ambient sound" : "Mute ambient sound"}
        title={muted ? "Unmute ambient" : "Mute ambient"}
        className="fixed bottom-4 right-4 z-30 rounded-full border border-cream/20 bg-ink-soft/80 px-3 py-2 text-xs text-cream-dim backdrop-blur transition hover:border-accent/40 hover:text-cream"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </>
  );
}
