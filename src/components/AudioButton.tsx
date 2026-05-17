"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src: string | undefined;
  autoPlay?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Play button for a single audio clip — the chapter dialogue TTS lives
 * behind this. Visible even if a previous src failed to load (we just
 * dim it) so one transient hiccup doesn't nuke audio for the rest of
 * the chapter. Resets the failure state whenever the src changes so
 * each new line gets a clean attempt.
 */
export function AudioButton({
  src,
  autoPlay = false,
  className,
  size = "md",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset the failure flag and stop the old clip whenever the src
  // changes. Without this, one bad load would hide the button for the
  // rest of the chapter — exactly the bug we just fixed.
  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* element being torn down */
      }
    }
  }, [src]);

  useEffect(() => {
    if (!src || !autoPlay || failed) return;
    const a = audioRef.current;
    if (!a) return;
    // Browsers block autoplay until the user has interacted with the
    // page. Catch silently so the button is still clickable.
    a.play().catch(() => {});
  }, [src, autoPlay, failed]);

  // No src = nothing to render. We render even when failed so the
  // user sees the button (dimmed) instead of audio quietly vanishing.
  if (!src) return null;

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      a.currentTime = 0;
    } else {
      // Clear stale failure on retry — maybe the file is reachable now.
      setFailed(false);
      a.play().catch(() => setFailed(true));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={
          failed
            ? "Audio failed to load — tap to retry"
            : playing
            ? "Stop audio"
            : "Play audio"
        }
        title={failed ? "Audio failed to load. Tap to retry." : undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border transition",
          "border-accent/40 bg-accent/10 text-accent",
          "hover:border-accent hover:bg-accent/20",
          dim,
          playing && "border-accent bg-accent/30",
          failed && "border-cream/20 bg-ink-soft text-cream-dim opacity-60",
          className
        )}
      >
        {playing ? (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <audio
        ref={audioRef}
        src={src}
        // Dispatch a window event on every play/pause/end so the ambient
        // SFX layer (AmbientPlayer) can duck itself while dialogue plays.
        // No app-level state, no prop drilling — decoupled by design.
        onPlay={() => {
          setPlaying(true);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("phodi:tts", { detail: { playing: true } })
            );
          }
        }}
        onPause={() => {
          setPlaying(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("phodi:tts", { detail: { playing: false } })
            );
          }
        }}
        onEnded={() => {
          setPlaying(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("phodi:tts", { detail: { playing: false } })
            );
          }
        }}
        onError={() => {
          setFailed(true);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("phodi:tts", { detail: { playing: false } })
            );
          }
        }}
        preload="auto"
      />
    </>
  );
}
