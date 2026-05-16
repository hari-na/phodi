/**
 * Scene palettes — one per chapter — that drive the procedural backdrop
 * in `<SceneBackground>` until real generated images are wired in.
 *
 * Each palette is three colour stops + a "glow" position. The component
 * renders them as a vertical gradient plus a soft radial light overlay,
 * then animates the whole thing with a slow Ken Burns drift so it feels
 * alive without ever showing a hard cut.
 *
 * To upgrade a chapter to a real image later: drop a JPEG/PNG into
 * `public/scenes/{chapterId}.jpg` and add `image: true` here. The
 * component reads the image and treats the palette as a fallback /
 * crossfade base.
 */

export interface ScenePalette {
  /** Top of the vertical gradient — usually sky / ceiling / distance. */
  top: string;
  /** Bottom of the vertical gradient — usually ground / floor / near. */
  bottom: string;
  /** Radial glow colour — light source, window, lamp, sun. */
  glow: string;
  /** Glow position as CSS background-position-ish: "center", "30% 70%", etc. */
  glowAt: string;
  /** Optional: real image file under /public/scenes/. */
  image?: boolean;
  /** Brief description of what the palette evokes (author note, not shown). */
  note: string;
}

const FALLBACK: ScenePalette = {
  top: "#0a0908",
  bottom: "#161412",
  glow: "rgba(232, 184, 109, 0.18)",
  glowAt: "50% 50%",
  note: "default warm-dark wash",
};

const SCENES: Record<string, ScenePalette> = {
  "kn-day-01-airport": {
    top: "#0a0a14",
    bottom: "#1a0f08",
    glow: "rgba(232, 165, 80, 0.32)",
    glowAt: "70% 65%",
    note: "rain at 11pm, sodium-orange streetlight glow off wet pavement",
  },
  "kn-day-02-hotel": {
    top: "#120e0a",
    bottom: "#1f180f",
    glow: "rgba(220, 170, 100, 0.22)",
    glowAt: "30% 60%",
    note: "hotel lobby at 1am, dim incandescent over a polished desk",
  },
  "kn-day-03-chai": {
    top: "#1c0e08",
    bottom: "#2a160a",
    glow: "rgba(255, 165, 60, 0.38)",
    glowAt: "50% 75%",
    note: "morning chai stall, kettle steam catching dawn light",
  },
  "kn-day-04-broker-call": {
    top: "#0d1014",
    bottom: "#161a20",
    glow: "rgba(200, 200, 230, 0.16)",
    glowAt: "50% 30%",
    note: "phone screen glow at noon, cool indoor light through curtains",
  },
  "kn-day-05-first-flat": {
    top: "#161614",
    bottom: "#1f1e1b",
    glow: "rgba(200, 200, 200, 0.12)",
    glowAt: "40% 40%",
    note: "drab afternoon flat tour, dusty cool grey-brown",
  },
  "kn-day-06-second-flat": {
    top: "#181208",
    bottom: "#2a1f10",
    glow: "rgba(232, 184, 109, 0.30)",
    glowAt: "60% 50%",
    note: "Mysuru uncle's verandah, late morning amber under a mango tree",
  },
  "kn-day-07-deposit": {
    top: "#1a140c",
    bottom: "#28200f",
    glow: "rgba(255, 200, 120, 0.28)",
    glowAt: "50% 55%",
    note: "verandah filter coffee, sun rising into late morning",
  },
  "kn-day-08-moving-in": {
    top: "#0e1218",
    bottom: "#1c2028",
    glow: "rgba(230, 195, 130, 0.22)",
    glowAt: "30% 70%",
    note: "evening gate at 4pm, watchman's chair, sunset behind the gate",
  },
  "kn-day-09-neighbour": {
    top: "#160e08",
    bottom: "#1f1612",
    glow: "rgba(255, 175, 90, 0.24)",
    glowAt: "60% 40%",
    note: "9pm doorway, hallway bulb spilling into the flat",
  },
  "kn-day-10-sunday-market": {
    top: "#1a1006",
    bottom: "#3a2410",
    glow: "rgba(255, 200, 80, 0.36)",
    glowAt: "50% 60%",
    note: "7am Sunday market, tarp filtering yellow sun over fresh produce",
  },
  "kn-day-11-first-friday": {
    top: "#0e0a14",
    bottom: "#1a0f1f",
    glow: "rgba(232, 130, 90, 0.28)",
    glowAt: "60% 50%",
    note: "rooftop bar at 8pm, string lights, dusk turning to amber neon",
  },
  "kn-day-12-canteen": {
    top: "#141612",
    bottom: "#1c1f1a",
    glow: "rgba(220, 220, 180, 0.18)",
    glowAt: "50% 30%",
    note: "office canteen at 1:15pm, white-yellow fluorescents on steel tables",
  },
  "kn-day-13-hiring-cook": {
    top: "#181410",
    bottom: "#2a2218",
    glow: "rgba(240, 200, 130, 0.24)",
    glowAt: "40% 60%",
    note: "kitchen at 11am, morning side-light through curry-leaf curtains",
  },
  "kn-day-14-gas-cylinder": {
    top: "#0e0a06",
    bottom: "#1a1208",
    glow: "rgba(255, 130, 60, 0.28)",
    glowAt: "30% 65%",
    note: "8:45pm kitchen, blue-flame gone, only the stove lamp's amber",
  },
  "kn-day-15-pharmacy": {
    top: "#0c1010",
    bottom: "#162020",
    glow: "rgba(180, 220, 200, 0.22)",
    glowAt: "50% 40%",
    note: "pharmacy at 7pm, cool tube-light wash over glass cabinets",
  },
  "kn-day-16-bookstore": {
    top: "#1a1208",
    bottom: "#2a1c0e",
    glow: "rgba(255, 195, 110, 0.34)",
    glowAt: "60% 50%",
    note: "warm-lit bookstore aisle, late afternoon orange on stacked spines",
  },
  "kn-day-17-cubbon-park": {
    top: "#0e1818",
    bottom: "#1a2820",
    glow: "rgba(220, 240, 180, 0.26)",
    glowAt: "70% 30%",
    note: "Cubbon Park 8am, green canopy filtering pale sun onto bamboo",
  },
  "kn-day-18-lokesh-knows": {
    top: "#101418",
    bottom: "#1c2026",
    glow: "rgba(240, 200, 130, 0.20)",
    glowAt: "60% 55%",
    note: "gate at 9am Monday, hard side-sun on the watchman's notebook",
  },
  "kn-day-19-karaga": {
    top: "#1a0808",
    bottom: "#2c0e08",
    glow: "rgba(255, 100, 40, 0.45)",
    glowAt: "50% 70%",
    note: "Karaga procession at night, fire-orange, drums, motion blur",
  },
  "kn-day-20-cooks-favor": {
    top: "#181410",
    bottom: "#2a2218",
    glow: "rgba(255, 180, 100, 0.22)",
    glowAt: "60% 30%",
    note: "kitchen 6:45am, low light, dosa batter steaming in low contrast",
  },
  "kn-day-21-amma": {
    top: "#181008",
    bottom: "#2a1c10",
    glow: "rgba(255, 200, 130, 0.30)",
    glowAt: "50% 50%",
    note: "Amma's flat at noon, curry-leaf air, warm light off cream walls",
  },
  "kn-day-22-misstep": {
    top: "#160e08",
    bottom: "#241810",
    glow: "rgba(255, 190, 120, 0.26)",
    glowAt: "60% 40%",
    note: "same Amma's flat — slightly cooler tilt, the air half-shifted",
  },
  "kn-day-23-phone-call-home": {
    top: "#0c0c14",
    bottom: "#16161e",
    glow: "rgba(255, 200, 140, 0.18)",
    glowAt: "30% 55%",
    note: "10:30pm at your kitchen table, phone screen glow, table lamp warm",
  },
  "kn-day-24-temple-auntie": {
    top: "#1a0e0c",
    bottom: "#2c180e",
    glow: "rgba(255, 165, 110, 0.32)",
    glowAt: "50% 55%",
    note: "Banashankari temple queue 6:30am, dawn pink over the gopuram",
  },
  "kn-day-25-anikas-friends": {
    top: "#0a0a14",
    bottom: "#180a1a",
    glow: "rgba(180, 130, 220, 0.22)",
    glowAt: "60% 50%",
    note: "Arbor at 9pm, blue-purple neon on dark wood",
  },
  "kn-day-26-fight": {
    top: "#0c0e14",
    bottom: "#161820",
    glow: "rgba(140, 160, 200, 0.18)",
    glowAt: "40% 30%",
    note: "your flat at night, TV-off blue cool, hard quiet",
  },
  "kn-day-27-apology": {
    top: "#181208",
    bottom: "#2a1e10",
    glow: "rgba(240, 190, 130, 0.28)",
    glowAt: "50% 55%",
    note: "Amma's at 5pm, late golden hour through the verandah window",
  },
  "kn-day-28-ugadi": {
    top: "#1a1004",
    bottom: "#2e1e08",
    glow: "rgba(255, 200, 80, 0.38)",
    glowAt: "50% 50%",
    note: "Ugadi morning, deep golden bevu-bella light, the speech moment",
  },
  "kn-day-29-eve": {
    top: "#0a0c14",
    bottom: "#141820",
    glow: "rgba(220, 180, 140, 0.22)",
    glowAt: "60% 60%",
    note: "your balcony at night, two coffees, city softened from above",
  },
  "kn-day-30-morning": {
    top: "#181828",
    bottom: "#2a2a35",
    glow: "rgba(255, 220, 180, 0.32)",
    glowAt: "30% 30%",
    note: "Cubbon Park sunrise under the Pongamia, pale dawn pink",
  },
};

export function getScene(chapterId: string): ScenePalette {
  return SCENES[chapterId] ?? FALLBACK;
}
