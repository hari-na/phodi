"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { loadArtStyle, saveArtStyle, type ArtStylePreference } from "@/lib/player";

interface Props {
  className?: string;
  onChange?: (style: ArtStylePreference) => void;
}

/**
 * Painterly ↔ Comic toggle. Persisted to localStorage; broadcasts a
 * `storage` event so other components on the page (SceneBackground)
 * re-render with the new style.
 */
export function StyleToggle({ className, onChange }: Props) {
  const [style, setStyle] = useState<ArtStylePreference>("painterly");
  useEffect(() => {
    setStyle(loadArtStyle());
  }, []);

  function switchTo(next: ArtStylePreference) {
    saveArtStyle(next);
    setStyle(next);
    onChange?.(next);
    // Manually fire a storage event so the SceneBackground on the same page reacts.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "phodi.artStyle.v1",
          newValue: next,
        })
      );
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0 overflow-hidden rounded-full border border-cream/15 bg-ink-soft/80 p-0.5 text-[10px] uppercase tracking-[0.18em] backdrop-blur",
        className
      )}
    >
      <button
        type="button"
        onClick={() => switchTo("painterly")}
        className={cn(
          "px-3 py-1 transition",
          style === "painterly"
            ? "bg-accent/90 text-ink"
            : "text-cream-dim hover:text-cream"
        )}
      >
        Painterly
      </button>
      <button
        type="button"
        onClick={() => switchTo("comic")}
        className={cn(
          "px-3 py-1 transition",
          style === "comic"
            ? "bg-accent/90 text-ink"
            : "text-cream-dim hover:text-cream"
        )}
      >
        Comic
      </button>
    </div>
  );
}
