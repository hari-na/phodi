"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src: string | undefined;
  autoPlay?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function AudioButton({
  src,
  autoPlay = false,
  className,
  size = "md",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || !autoPlay || failed) return;
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => {});
  }, [src, autoPlay, failed]);

  if (!src || failed) return null;

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      a.currentTime = 0;
    } else {
      a.play().catch(() => setFailed(true));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Stop audio" : "Play audio"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border transition",
          "border-accent/40 bg-accent/10 text-accent",
          "hover:border-accent hover:bg-accent/20",
          dim,
          playing && "border-accent bg-accent/30",
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
        preload="auto"
      />
    </>
  );
}
