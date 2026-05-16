"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getScene } from "@/lib/scenes";

interface Props {
  chapterId: string;
  /** Layout: "full" fills behind the whole chapter, "hero" sits inside the intro only. */
  layout?: "full" | "hero";
}

/**
 * Animated procedural scene backdrop. Renders:
 *   - a vertical two-stop gradient (top → bottom palette)
 *   - a soft radial glow (light source)
 *   - a slow Ken Burns drift on the glow so it feels alive
 *   - a darkening overlay so foreground text always reads
 *
 * Real generated images can be added later by setting `scene.image = true`
 * in `lib/scenes.ts` and dropping the file at /public/scenes/{chapterId}.jpg.
 */
export function SceneBackground({ chapterId, layout = "hero" }: Props) {
  const scene = useMemo(() => getScene(chapterId), [chapterId]);

  // Encode the palette as CSS variables so the keyframes can ride them.
  const styles: React.CSSProperties = {
    // Background stack: image (if any) sits behind the glow which sits on the gradient
    backgroundImage: [
      scene.image && `url(/scenes/${chapterId}.jpg)`,
      `radial-gradient(60% 60% at ${scene.glowAt}, ${scene.glow} 0%, transparent 70%)`,
      `linear-gradient(180deg, ${scene.top} 0%, ${scene.bottom} 100%)`,
    ]
      .filter(Boolean)
      .join(", "),
    backgroundSize: "cover, 130% 130%, 100% 100%",
    backgroundPosition: "center, 50% 50%, center",
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
      {/* Soft vignette overlay so foreground text stays legible */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_50%,transparent_30%,rgba(10,9,8,0.85)_100%)]" />
    </div>
  );
}
