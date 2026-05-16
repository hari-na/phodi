/**
 * Ambient SFX registry — one loop per chapter.
 *
 * Each entry points to an MP3/OGG under /public/sfx/. The chapter player
 * crossfades these in on chapter intro and fades out on exit. We pick from
 * a small palette of ~12 distinct ambient loops; many chapters share a
 * palette entry (all kitchen scenes share kitchen.mp3, etc.).
 *
 * Files are CC0 / CC-BY licensed ambient recordings. The script
 * `scripts/download_sfx.py` fetches them.
 */

export interface ChapterSfx {
  /** Public URL relative to /public — e.g. "/sfx/rain-night.mp3" */
  src: string;
  /** Loop volume (0..1). Defaults to 0.35 if not set. */
  volume?: number;
}

const SFX: Record<string, ChapterSfx> = {
  "kn-day-01-airport":         { src: "/sfx/rain-night.mp3",      volume: 0.5 },
  "kn-day-02-hotel":           { src: "/sfx/ac-hum.mp3",          volume: 0.3 },
  "kn-day-03-chai":            { src: "/sfx/chai-stall.mp3",      volume: 0.4 },
  "kn-day-04-broker-call":     { src: "/sfx/quiet-room.mp3",      volume: 0.25 },
  "kn-day-05-first-flat":      { src: "/sfx/empty-room.mp3",      volume: 0.25 },
  "kn-day-06-second-flat":     { src: "/sfx/birds-leaves.mp3",    volume: 0.35 },
  "kn-day-07-deposit":         { src: "/sfx/birds-leaves.mp3",    volume: 0.3 },
  "kn-day-08-moving-in":       { src: "/sfx/street-day.mp3",      volume: 0.35 },
  "kn-day-09-neighbour":       { src: "/sfx/quiet-room.mp3",      volume: 0.25 },
  "kn-day-10-sunday-market":   { src: "/sfx/market.mp3",          volume: 0.45 },
  "kn-day-11-first-friday":    { src: "/sfx/pub.mp3",             volume: 0.4 },
  "kn-day-12-canteen":         { src: "/sfx/canteen.mp3",         volume: 0.35 },
  "kn-day-13-hiring-cook":     { src: "/sfx/kitchen.mp3",         volume: 0.3 },
  "kn-day-14-gas-cylinder":    { src: "/sfx/kitchen.mp3",         volume: 0.3 },
  "kn-day-15-pharmacy":        { src: "/sfx/quiet-room.mp3",      volume: 0.25 },
  "kn-day-16-bookstore":       { src: "/sfx/bookstore.mp3",       volume: 0.25 },
  "kn-day-17-cubbon-park":     { src: "/sfx/park-morning.mp3",    volume: 0.4 },
  "kn-day-18-lokesh-knows":    { src: "/sfx/street-day.mp3",      volume: 0.35 },
  "kn-day-19-karaga":          { src: "/sfx/karaga-drums.mp3",    volume: 0.55 },
  "kn-day-20-cooks-favor":     { src: "/sfx/kitchen.mp3",         volume: 0.3 },
  "kn-day-21-amma":            { src: "/sfx/family-home.mp3",     volume: 0.3 },
  "kn-day-22-misstep":         { src: "/sfx/family-home.mp3",     volume: 0.3 },
  "kn-day-23-phone-call-home": { src: "/sfx/quiet-room.mp3",      volume: 0.2 },
  "kn-day-24-temple-auntie":   { src: "/sfx/temple.mp3",          volume: 0.4 },
  "kn-day-25-anikas-friends":  { src: "/sfx/pub.mp3",             volume: 0.4 },
  "kn-day-26-fight":           { src: "/sfx/quiet-room.mp3",      volume: 0.2 },
  "kn-day-27-apology":         { src: "/sfx/family-home.mp3",     volume: 0.25 },
  "kn-day-28-ugadi":           { src: "/sfx/family-home.mp3",     volume: 0.35 },
  "kn-day-29-eve":             { src: "/sfx/balcony-night.mp3",   volume: 0.35 },
  "kn-day-30-morning":         { src: "/sfx/park-morning.mp3",    volume: 0.4 },
};

export function getChapterSfx(chapterId: string): ChapterSfx | null {
  return SFX[chapterId] ?? null;
}
