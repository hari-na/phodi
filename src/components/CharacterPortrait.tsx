"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPortraitSrc, type ArtStyle } from "@/lib/characters";

interface Props {
  speakerId: string;
  style: ArtStyle;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Circular character portrait. If the JPG doesn't exist (or fails to load),
 * the component gracefully renders nothing — chapter UI is unaffected.
 */
export function CharacterPortrait({
  speakerId,
  style,
  size = "md",
  className,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = getPortraitSrc(speakerId, style);
  if (!src || failed) return null;

  const sizeClass = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  }[size];

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full border border-cream/20 bg-ink-soft shadow-lg",
        sizeClass,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
