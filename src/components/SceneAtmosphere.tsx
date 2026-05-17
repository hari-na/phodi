"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type AtmosphereMood = "rain" | "mist" | "embers" | "lamp-flicker";

interface Props {
  mood?: AtmosphereMood;
}

/**
 * Pure-CSS atmospheric overlay that sits on top of the scene backdrop.
 *
 * Adds the *feeling* of place — monsoon rain streaks for the airport,
 * morning mist over Cubbon Park, ember sparks for Karaga torches — at
 * zero compute cost. Runs at 60fps in the browser, no canvas, no JS
 * timers, just keyframe animations on absolutely-positioned divs.
 *
 * Each mood is composed so it loops invisibly (drop reaches bottom →
 * a fresh one is already falling from the top) and reads as ambient
 * rather than narrative. Designed to sit behind dialogue, never to
 * pull focus.
 *
 * Respects `prefers-reduced-motion` automatically because we use the
 * `scene-atmosphere-*` animation classes, which are gated in globals.css.
 */
export function SceneAtmosphere({ mood }: Props) {
  if (!mood) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {mood === "rain" && <Rain />}
      {mood === "mist" && <Mist />}
      {mood === "embers" && <Embers />}
      {mood === "lamp-flicker" && <LampFlicker />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   RAIN                                     */
/* -------------------------------------------------------------------------- */

/**
 * ~50 diagonal raindrop streaks. Each is a thin vertical gradient div,
 * positioned at a pseudo-random `left` and given a randomised duration
 * and delay so the rain reads as continuous rather than waves of drops
 * arriving in sync.
 *
 * Streaks fall from -20% to 120% (extra padding both ends so the seam
 * is always offscreen). The `scene-atmosphere-rain` animation lives in
 * globals.css.
 */
function Rain() {
  const drops = useMemo(() => {
    // Deterministic so SSR + client agree (no hydration mismatch)
    return Array.from({ length: 60 }, (_, i) => {
      const rand = (seed: number) => {
        const x = Math.sin(i * 37 + seed * 13) * 10000;
        return x - Math.floor(x);
      };
      return {
        left: rand(1) * 100,
        delay: rand(2) * -3,           // negative so they're mid-fall on mount
        duration: 0.7 + rand(3) * 0.6, // 0.7s–1.3s fall
        opacity: 0.18 + rand(4) * 0.22,
        height: 40 + rand(5) * 60,     // 40px–100px streak length
      };
    });
  }, []);

  return (
    <>
      {drops.map((d, i) => (
        <div
          key={i}
          className="scene-atmosphere-rain absolute w-px"
          style={{
            left: `${d.left}%`,
            top: "-20%",
            height: `${d.height}px`,
            opacity: d.opacity,
            background: "linear-gradient(180deg, transparent 0%, rgba(220,225,240,0.7) 50%, transparent 100%)",
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   MIST                                     */
/* -------------------------------------------------------------------------- */

/**
 * Three slow-drifting horizontal gauze layers stacked at different heights
 * and speeds. Reads as "morning mist hangs in the air" rather than fog
 * walls — the eye can still see through to the scene.
 */
function Mist() {
  return (
    <>
      <div
        className="scene-atmosphere-mist absolute inset-x-0"
        style={{
          top: "20%",
          height: "30%",
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
          animationDuration: "32s",
          animationDelay: "0s",
        }}
      />
      <div
        className="scene-atmosphere-mist absolute inset-x-0"
        style={{
          top: "50%",
          height: "40%",
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          animationDuration: "44s",
          animationDelay: "-12s",
        }}
      />
      <div
        className="scene-atmosphere-mist absolute inset-x-0"
        style={{
          top: "10%",
          height: "25%",
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
          animationDuration: "38s",
          animationDelay: "-22s",
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  EMBERS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Small warm dots that rise slowly, suggesting torch sparks / festival
 * fire / lamp embers. Used for Karaga procession, evening pooja scenes.
 */
function Embers() {
  const sparks = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const rand = (seed: number) => {
        const x = Math.sin(i * 53 + seed * 17) * 10000;
        return x - Math.floor(x);
      };
      return {
        left: rand(1) * 100,
        delay: rand(2) * -8,
        duration: 5 + rand(3) * 4,        // 5s–9s rise
        size: 1.5 + rand(4) * 1.5,         // 1.5–3px
        hue: 18 + rand(5) * 20,            // orange–amber
      };
    });
  }, []);

  return (
    <>
      {sparks.map((s, i) => (
        <div
          key={i}
          className="scene-atmosphere-ember absolute rounded-full"
          style={{
            left: `${s.left}%`,
            bottom: "-5%",
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: `hsla(${s.hue}, 95%, 65%, 0.85)`,
            boxShadow: `0 0 ${s.size * 2}px hsla(${s.hue}, 100%, 55%, 0.6)`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               LAMP-FLICKER                                 */
/* -------------------------------------------------------------------------- */

/**
 * Subtle radial pulse over the scene's existing glow point — suggests a
 * single warm light source (fairy-lights, lampshade, candle) breathing.
 * Doesn't change color, just opacity, so it doesn't fight the still's
 * palette.
 */
function LampFlicker() {
  return (
    <div
      className={cn(
        "scene-atmosphere-flicker absolute inset-0",
        "bg-[radial-gradient(40%_40%_at_60%_50%,rgba(255,200,140,0.18)_0%,transparent_70%)]"
      )}
    />
  );
}
