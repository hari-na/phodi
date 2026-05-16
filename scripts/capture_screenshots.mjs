/**
 * Capture the canonical Phodi screenshots for the LinkedIn post / README.
 *
 * Usage:
 *   npm run dev               # in another terminal, start the dev server
 *   node scripts/capture_screenshots.mjs
 *
 * Each entry below is one milestone shot — the URL, an optional script that
 * advances the UI into the right state, and the output filename. Adding a
 * new shot is just adding one entry.
 *
 * Run after every meaningful UI change so the build-log stays in sync.
 */

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "screenshots");
const BASE = process.env.PHODI_BASE_URL || "http://localhost:3001";

const VIEWPORT = { width: 430, height: 932 }; // iPhone 15 Pro Max — mobile-first
const DEVICE_SCALE = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shots = [
  {
    name: "01-home.png",
    url: "/",
    setup: async () => {},
  },
  {
    name: "02-course-overview.png",
    url: "/kn",
    setup: async () => {},
  },
  {
    name: "03-lesson-intro.png",
    url: "/kn/lesson/kn-001-greetings",
    setup: async (page) => {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await sleep(500);
    },
  },
  {
    name: "04-vocab-card-dravidian-bridges.png",
    url: "/kn/lesson/kn-001-greetings",
    setup: async (page) => {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await sleep(500);
      // Click "Start"
      await page.getByRole("button", { name: /Start/i }).click();
      await sleep(500);
    },
  },
  {
    name: "05-mc-with-ruby-phonetic.png",
    url: "/kn/lesson/kn-001-greetings",
    setup: async (page) => {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await sleep(500);
      await page.getByRole("button", { name: /Start/i }).click();
      await sleep(300);
      // Skip 5 vocab cards
      for (let i = 0; i < 5; i++) {
        await page
          .getByRole("button", { name: /Got it|Start exercises/i })
          .click();
        await sleep(250);
      }
      await sleep(400);
    },
  },
  {
    name: "06-mc-kannada-options-with-translit.png",
    url: "/kn/lesson/kn-001-greetings",
    setup: async (page) => {
      await page.evaluate(() => window.localStorage.clear());
      await page.reload();
      await sleep(500);
      await page.getByRole("button", { name: /Start/i }).click();
      await sleep(300);
      for (let i = 0; i < 5; i++) {
        await page
          .getByRole("button", { name: /Got it|Start exercises/i })
          .click();
        await sleep(250);
      }
      // Answer MC1 correctly, continue to MC2
      await page.getByRole("button", { name: "Hello" }).click();
      await sleep(300);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(500);
    },
  },
  {
    name: "07-course-with-chapters.png",
    url: "/kn",
    setup: async () => {
      await sleep(600);
    },
  },
  {
    name: "08-chapter-day-1-intro.png",
    url: "/kn/chapter/kn-day-01-airport",
    setup: async (page) => {
      await sleep(500);
    },
  },
  {
    name: "09-chapter-npc-pushy.png",
    url: "/kn/chapter/kn-day-01-airport",
    setup: async (page) => {
      await sleep(500);
      // Beat 1 → continue
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(300);
      // Pick the Kannada reply
      await page.locator("button").filter({ hasText: "ಹೋಗಬೇಕು" }).first().click();
      await sleep(300);
      // Beat 3 neutral 300rs → continue
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(400);
      // Now on beat 4: PUSHY 500rs line — capture this
    },
  },
  {
    name: "10-chapter-choice.png",
    url: "/kn/chapter/kn-day-01-airport",
    setup: async (page) => {
      await sleep(500);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      await page.locator("button").filter({ hasText: "ಹೋಗಬೇಕು" }).first().click();
      await sleep(250);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(400);
      // Now on choice beat
    },
  },
  {
    name: "11-chapter-scorecard.png",
    url: "/kn/chapter/kn-day-01-airport",
    setup: async (page) => {
      await sleep(500);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      await page.locator("button").filter({ hasText: "ಹೋಗಬೇಕು" }).first().click();
      await sleep(250);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      // Pick the haggle option
      await page.locator("button").filter({ hasText: "ಮೀಟರ್" }).first().click();
      await sleep(250);
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(500);
    },
  },
  {
    name: "12-day-2-hotel-hushed.png",
    url: "/kn/chapter/kn-day-02-hotel",
    setup: async (page) => {
      await sleep(500);
      // Beat 1 (greet) → continue
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      // Pick the Kannada reply
      await page.locator("button").filter({ hasText: "ಬುಕ್" }).first().click();
      await sleep(250);
      // Beat 3 (ID request) → continue
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(400);
      // Now on beat 4: HUSHED apology
    },
  },
  {
    name: "13-day-3-chai-warm.png",
    url: "/kn/chapter/kn-day-03-chai",
    setup: async (page) => {
      await sleep(500);
    },
  },
  {
    name: "14-day-3-chai-amused.png",
    url: "/kn/chapter/kn-day-03-chai",
    setup: async (page) => {
      await sleep(500);
      // Beat 1 (greet) → continue
      await page.getByRole("button", { name: /Continue/i }).click();
      await sleep(250);
      // Pick "less sugar"
      await page.locator("button").filter({ hasText: "ಸಕ್ಕರೆ ಕಡಿಮೆ" }).first().click();
      await sleep(400);
      // Beat 3 (AMUSED — "less sugar? good choice")
    },
  },
];

async function main() {
  const fs = await import("node:fs/promises");
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  for (const shot of shots) {
    const url = `${BASE}${shot.url}`;
    console.log(`→ ${shot.name}  (${url})`);
    await page.goto(url, { waitUntil: "networkidle" });
    if (shot.setup) await shot.setup(page);
    await sleep(300); // settle
    const out = path.join(OUT_DIR, shot.name);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`  saved ${path.relative(REPO_ROOT, out)}`);
  }

  await browser.close();
  console.log(`\nDone. ${shots.length} screenshots in ${path.relative(REPO_ROOT, OUT_DIR)}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
