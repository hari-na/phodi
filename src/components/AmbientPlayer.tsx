"use client";

import { useEffect, useRef, useState } from "react";
import { getChapterSfx } from "@/lib/sfx";

interface Props {
  chapterId: string;
}

/**
 * Plays a chapter's ambient loop on mount, crossfades out on unmount.
 *
 * Browsers block autoplay until the user has interacted with the page —
 * the first click anywhere (the Start button on the chapter intro counts)
 * unlocks it. If autoplay is denied, we silently mute and stay quiet
 * rather than nag the user.
 *
 * Renders nothing visible. The audio element is hidden.
 */
export function AmbientPlayer({ chapterId }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfx = getChapterSfx(chapterId);
  const [muted, setMuted] = useState(false);

  // Restore mute preference from localStorage (one toggle for the whole game)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setMuted(window.localStorage.getItem("phodi.ambient.muted") === "1");
  }, []);

  // Persist mute preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("phodi.ambient.muted", muted ? "1" : "0");
    const a = audioRef.current;
    if (a) a.muted = muted;
  }, [muted]);

  // Fade in on mount
  useEffect(() => {
    if (!sfx) return;
    const a = audioRef.current;
    if (!a) return;
    const targetVol = sfx.volume ?? 0.35;
    a.volume = 0;
    a.loop = true;
    a.play().catch(() => {
      /* autoplay blocked — silent until user interacts */
    });
    // Smooth fade-in over ~1.5s
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      const dt = (performance.now() - t0) / 1500;
      a.volume = Math.min(targetVol, targetVol * dt);
      if (dt < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      try {
        a.pause();
      } catch {
        /* element may be torn down */
      }
    };
  }, [sfx]);

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
