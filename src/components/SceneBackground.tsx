"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getScene } from "@/lib/scenes";
import { loadArtStyle, type ArtStylePreference } from "@/lib/player";

interface Props {
  chapterId: string;
  /** Layout: "full" fills behind the whole chapter, "hero" sits inside the intro only. */
  layout?: "full" | "hero";
}

/**
 * Animated scene backdrop. Renders, in priority order:
 *
 *   1. The real generated image at /scenes/{style}/{chapterId}.jpg if it
 *      exists (style is "painterly" or "comic" per player preference).
 *   2. The procedural gradient + glow defined in lib/scenes.ts as a
 *      fallback while generation is in flight.
 *
 * Both layers ride a slow Ken Burns drift, then a vignette overlay
 * darkens the edges so foreground text stays legible.
 *
 * The image probe uses an HEAD-style preload; if the request 404s, we
 * stay on the gradient. No broken-image icons.
 */
export function SceneBackground({ chapterId, layout = "full" }: Props) {
  const scene = useMemo(() => getScene(chapterId), [chapterId]);
  const [style, setStyle] = useState<ArtStylePreference>("painterly");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Resolve the player's chosen style on mount + when the rest of the app
  // signals a style change (storage event).
  useEffect(() => {
    setStyle(loadArtStyle());
    function onStorage(e: StorageEvent) {
      if (e.key === "phodi.artStyle.v1") setStyle(loadArtStyle());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Probe whether the real image exists for the current chapter + style.
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageFailed(true);
    img.src = `/scenes/${style}/${chapterId}.jpg`;
  }, [chapterId, style]);

  const useRealImage = imageLoaded && !imageFailed;

  const styles: React.CSSProperties = useRealImage
    ? {
        backgroundImage: `url(/scenes/${style}/${chapterId}.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : {
        backgroundImage: [
          `radial-gradient(60% 60% at ${scene.glowAt}, ${scene.glow} 0%, transparent 70%)`,
          `linear-gradient(180deg, ${scene.top} 0%, ${scene.bottom} 100%)`,
        ].join(", "),
        backgroundSize: "130% 130%, 100% 100%",
        backgroundPosition: "50% 50%, center",
        backgroundRepeat: "no-repeat",
      };

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden",
        layout === "full"
          ? "fixed inset-0 z-0"
          : "absolute inset-0 z-0 rounded-lg"
      )}
    >
      <div className="scene-plate absolute inset-0" style={styles} />
      {/* Vignette overlay for foreground text legibility. Real images get a
          stronger vignette since they're more detailed and would otherwise
          distract from the dialogue. */}
      <div
        className={cn(
          "absolute inset-0",
          useRealImage
            ? "bg-[radial-gradient(120%_80%_at_50%_50%,rgba(10,9,8,0.55)_30%,rgba(10,9,8,0.92)_100%)]"
            : "bg-[radial-gradient(120%_80%_at_50%_50%,transparent_30%,rgba(10,9,8,0.85)_100%)]"
        )}
      />
    </div>
  );
}
