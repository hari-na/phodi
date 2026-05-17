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
  /**
   * Optional atmospheric overlay (rain streaks, drifting mist, ember
   * sparks, lamp flicker). Layered on top of the still by
   * <SceneAtmosphere>. Skip for scenes where any motion would distract.
   */
  atmosphere?: "rain" | "mist" | "embers" | "lamp-flicker";
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
    atmosphere: "rain",
    note: "Kempegowda airport pickup zone Bangalore at 11pm monsoon rain, yellow-green auto rickshaw under concrete awning, sodium-orange streetlamps, wet asphalt reflections, palm trees silhouetted in distance",
  },
  "kn-day-02-hotel": {
    top: "#120e0a",
    bottom: "#1f180f",
    glow: "rgba(220, 170, 100, 0.22)",
    glowAt: "30% 60%",
    note: "small Indian budget hotel lobby Bangalore 1am, marble floor, wood-panelled reception desk, pendant lamp glow, brown leather sofa, framed Lakshmi calendar on wall, dim incandescent",
  },
  "kn-day-03-chai": {
    top: "#1c0e08",
    bottom: "#2a160a",
    glow: "rgba(255, 165, 60, 0.38)",
    glowAt: "50% 75%",
    note: "Indian roadside chai stall outside Indiranagar Metro Bangalore at dawn, tin-roofed pushcart, brass kettle on kerosene stove, glass tumblers in metal rack, bougainvillea on compound wall, narrow concrete sidewalk",
  },
  "kn-day-04-broker-call": {
    top: "#0d1014",
    bottom: "#161a20",
    glow: "rgba(200, 200, 230, 0.16)",
    glowAt: "50% 30%",
    note: "small Indian budget hotel room Bangalore midday, ceiling fan, tube light, single bed with brown sheet, mosquito mesh window, smartphone on wooden table, soft side-light",
  },
  "kn-day-05-first-flat": {
    top: "#161614",
    bottom: "#1f1e1b",
    glow: "rgba(200, 200, 200, 0.12)",
    glowAt: "40% 40%",
    note: "HSR Layout Bangalore apartment building 4-storey faded ochre yellow paint, wrought iron balcony railings, AC units protruding, hanging laundry, empty parking lot at 6pm overcast",
  },
  "kn-day-06-second-flat": {
    top: "#181208",
    bottom: "#2a1f10",
    glow: "rgba(232, 184, 109, 0.30)",
    glowAt: "60% 50%",
    note: "old Indiranagar Bangalore independent house verandah, red-oxide polished floor, large mango tree in compound, late-morning sun filtering through leaves, wooden chair, plastic stool, pale yellow concrete walls",
  },
  "kn-day-07-deposit": {
    top: "#1a140c",
    bottom: "#28200f",
    glow: "rgba(255, 200, 120, 0.28)",
    glowAt: "50% 55%",
    note: "same Bangalore verandah at 10am, filter coffee in steel davara on low wooden stool, paperwork sheets and pen, frangipani petals on red-oxide floor, soft warm side-light",
  },
  "kn-day-08-moving-in": {
    top: "#0e1218",
    bottom: "#1c2028",
    glow: "rgba(230, 195, 130, 0.22)",
    glowAt: "30% 70%",
    note: "Indiranagar Bangalore apartment compound gate at 4pm, watchman's plastic chair with open logbook, black-yellow boomgate, bougainvillea overflowing from compound wall, two suitcases at the gate, low golden sun",
  },
  "kn-day-09-neighbour": {
    top: "#160e08",
    bottom: "#1f1612",
    glow: "rgba(255, 175, 90, 0.24)",
    glowAt: "60% 40%",
    note: "Indian flat doorway Bangalore 9pm, steel grille security gate, tube light spilling into corridor, mosaic tiled floor, steel tiffin box on the ground, coir doormat, cream-painted walls",
  },
  "kn-day-10-sunday-market": {
    top: "#1a1006",
    bottom: "#3a2410",
    glow: "rgba(255, 200, 80, 0.36)",
    glowAt: "50% 60%",
    note: "BTM Sunday vegetable market Bangalore 7am, blue tarp roof above cart, cane baskets piled with tomatoes brinjals chillies coriander, brass scale with stone weights, weathered concrete pavement, hanging cloth sacks",
  },
  "kn-day-11-first-friday": {
    top: "#0e0a14",
    bottom: "#1a0f1f",
    glow: "rgba(232, 130, 90, 0.28)",
    glowAt: "60% 50%",
    note: "Indiranagar Bangalore rooftop microbrewery at 8pm, string fairy lights overhead, bamboo screens, cane chairs and wooden tables, beer glasses, soft purple-orange dusk over apartment rooftops with water tanks and antennas",
  },
  "kn-day-12-canteen": {
    top: "#141612",
    bottom: "#1c1f1a",
    glow: "rgba(220, 220, 180, 0.18)",
    glowAt: "50% 30%",
    note: "Indian IT office canteen Bangalore 1:15pm, stainless steel tables and benches, plate meal trays with sambar rice, white-yellow fluorescent tubes, concrete pillar, AC vent, ceiling fan",
  },
  "kn-day-13-hiring-cook": {
    top: "#181410",
    bottom: "#2a2218",
    glow: "rgba(240, 200, 130, 0.24)",
    glowAt: "40% 60%",
    note: "Indian flat kitchen Bangalore 11am, granite cooking platform, gas stove with cylinder visible, steel pressure cooker, tiled backsplash, curry leaves on counter, soft window light through mosquito mesh",
  },
  "kn-day-14-gas-cylinder": {
    top: "#0e0a06",
    bottom: "#1a1208",
    glow: "rgba(255, 130, 60, 0.28)",
    glowAt: "30% 65%",
    note: "Indian flat kitchen Bangalore 8:45pm, empty red gas cylinder, dead stove burner, steel utensils scattered, half-prepared dosa batter in steel bowl, dim tube light, dramatic shadows",
  },
  "kn-day-15-pharmacy": {
    top: "#0c1010",
    bottom: "#162020",
    glow: "rgba(180, 220, 200, 0.22)",
    glowAt: "50% 40%",
    note: "Indian Apollo Pharmacy interior 100ft Road Indiranagar Bangalore 7pm, glass cabinets stocked with medicine strip packets, white tiled walls, fluorescent tube lighting, counter with calculator and prescriptions, red cross signage",
  },
  "kn-day-16-bookstore": {
    top: "#1a1208",
    bottom: "#2a1c0e",
    glow: "rgba(255, 195, 110, 0.34)",
    glowAt: "60% 50%",
    note: "Blossom Book House interior Church Street Bangalore, narrow aisle with books stacked floor to ceiling, warm wooden shelves, vintage incandescent bulbs, wooden floor, slanted dusty afternoon sunlight",
  },
  "kn-day-17-cubbon-park": {
    top: "#0e1818",
    bottom: "#1a2820",
    glow: "rgba(220, 240, 180, 0.26)",
    glowAt: "70% 30%",
    note: "Cubbon Park Bangalore bamboo path 8am Sunday, tropical bamboo arch overhead, soft morning mist, wet stone path, blurred joggers in middle distance, layered green tones",
  },
  "kn-day-18-lokesh-knows": {
    top: "#101418",
    bottom: "#1c2026",
    glow: "rgba(240, 200, 130, 0.20)",
    glowAt: "60% 55%",
    note: "Bangalore apartment compound gate Monday 9am, watchman's plastic chair with open logbook on lap, hard side-sunlight on gatepost, bougainvillea on compound wall, yellow auto rickshaw passing on street beyond",
  },
  "kn-day-19-karaga": {
    top: "#1a0808",
    bottom: "#2c0e08",
    glow: "rgba(255, 100, 40, 0.45)",
    glowAt: "50% 70%",
    note: "Karaga procession Bangalore Thigalarpet at night, towering jasmine and rose flower hoist carried by priest, fire torches, drummers in white dhotis, stone temple gopuram silhouetted, dense crowd of South Indian families",
  },
  "kn-day-20-cooks-favor": {
    top: "#181410",
    bottom: "#2a2218",
    glow: "rgba(255, 180, 100, 0.22)",
    glowAt: "60% 30%",
    note: "Indian flat kitchen Bangalore 6:45am, dim morning light, steel utensils on granite counter, dosa batter in steel bowl, low warm light through curtained window, stove flame",
  },
  "kn-day-21-amma": {
    top: "#181008",
    bottom: "#2a1c10",
    glow: "rgba(255, 200, 130, 0.30)",
    glowAt: "50% 50%",
    note: "Jayanagar Bangalore middle-class flat living room noon, cream painted walls, wooden sofa with embroidered cushions, framed family photos on wall, pooja shelf with brass deity in corner, old tube TV, warm natural light",
  },
  "kn-day-22-misstep": {
    top: "#160e08",
    bottom: "#241810",
    glow: "rgba(255, 190, 120, 0.26)",
    glowAt: "60% 40%",
    note: "Indian family dining table Bangalore at lunch, steel plates with bisi bele bath curd rice papad, steel tumbler of water, wooden dining table, ceiling fan, window light, curry-leaf scented air",
  },
  "kn-day-23-phone-call-home": {
    top: "#0c0c14",
    bottom: "#16161e",
    glow: "rgba(255, 200, 140, 0.18)",
    glowAt: "30% 55%",
    note: "Indian flat kitchen table Bangalore 10:30pm, smartphone screen lit face-up, steel tumbler of coffee, open laptop with code, table lamp warm glow, dark room, curry leaves in steel container",
  },
  "kn-day-24-temple-auntie": {
    top: "#1a0e0c",
    bottom: "#2c180e",
    glow: "rgba(255, 165, 110, 0.32)",
    glowAt: "50% 55%",
    note: "Banashankari temple Bangalore 6:30am, intricate stone gopuram tower carved with deities, queue of devotees in salwar suits and dhotis with flower garlands, dawn pink sky silhouetting the temple, camphor smoke drifting, marble courtyard",
  },
  "kn-day-25-anikas-friends": {
    top: "#0a0a14",
    bottom: "#180a1a",
    glow: "rgba(180, 130, 220, 0.22)",
    glowAt: "60% 50%",
    note: "Arbor Brewing pub Magrath Road Bangalore 9pm, dark wooden walls, edison string lights, glass beer pitchers on wooden table, cane chairs, blurred Indian friends seated together",
  },
  "kn-day-26-fight": {
    top: "#0c0e14",
    bottom: "#161820",
    glow: "rgba(140, 160, 200, 0.18)",
    glowAt: "40% 30%",
    note: "Bangalore Indiranagar flat living room at night, TV off and dark, brown couch with throw pillows, single floor lamp glowing warm in corner, balcony sliding door curtain, ceiling fan still, hard quiet",
  },
  "kn-day-27-apology": {
    top: "#181208",
    bottom: "#2a1e10",
    glow: "rgba(240, 190, 130, 0.28)",
    glowAt: "50% 55%",
    note: "Jayanagar Bangalore flat verandah at 5pm, late golden hour through window grille, wooden chair, steel coffee davara on low wooden table, potted plant on windowsill, pale yellow walls",
  },
  "kn-day-28-ugadi": {
    top: "#1a1004",
    bottom: "#2e1e08",
    glow: "rgba(255, 200, 80, 0.38)",
    glowAt: "50% 50%",
    note: "Indian family Ugadi celebration Bangalore home morning, mango leaf toran across doorway, rangoli colourful chalk pattern on doorstep, bevu-bella plate of neem and jaggery on wooden table, brass bell, family members seated on sofa and floor, golden natural light from open balcony",
  },
  "kn-day-29-eve": {
    top: "#0a0c14",
    bottom: "#141820",
    glow: "rgba(220, 180, 140, 0.22)",
    glowAt: "60% 60%",
    note: "Bangalore apartment balcony at night, panoramic view of corrugated rooftops with water tanks and hanging laundry across buildings, distant city skyline haze, two steel coffee tumblers on the balcony ledge",
  },
  "kn-day-30-morning": {
    top: "#181828",
    bottom: "#2a2a35",
    glow: "rgba(255, 220, 180, 0.32)",
    glowAt: "30% 30%",
    note: "Cubbon Park Bangalore sunrise under massive ancient Pongamia tree, pale pink-blue dawn light filtering through dense tropical canopy, wet grass, stone bench, two paper coffee cups on the bench, joggers blurred in the middle distance",
  },
};

export function getScene(chapterId: string): ScenePalette {
  return SCENES[chapterId] ?? FALLBACK;
}
