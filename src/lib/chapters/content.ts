import type { LanguageCode } from "../types";
import type { Chapter, VoiceProfile } from "./types";
import knVoices from "@content/kn/voices.json";
import knDay01 from "@content/kn/chapters/01-airport.json";
import knDay02 from "@content/kn/chapters/02-hotel.json";
import knDay03 from "@content/kn/chapters/03-chai.json";
import knDay04 from "@content/kn/chapters/04-broker-call.json";
import knDay05 from "@content/kn/chapters/05-first-flat.json";
import knDay06 from "@content/kn/chapters/06-second-flat.json";
import knDay07 from "@content/kn/chapters/07-deposit.json";
import knDay08 from "@content/kn/chapters/08-moving-in.json";
import knDay09 from "@content/kn/chapters/09-neighbour.json";
import knDay10 from "@content/kn/chapters/10-sunday-market.json";
import knDay11 from "@content/kn/chapters/11-first-friday.json";
import knDay12 from "@content/kn/chapters/12-canteen.json";
import knDay13 from "@content/kn/chapters/13-hiring-cook.json";
import knDay14 from "@content/kn/chapters/14-gas-cylinder.json";
import knDay15 from "@content/kn/chapters/15-pharmacy.json";
import knDay16 from "@content/kn/chapters/16-bookstore.json";
import knDay17 from "@content/kn/chapters/17-cubbon-park.json";
import knDay18 from "@content/kn/chapters/18-lokesh-knows.json";
import knDay19 from "@content/kn/chapters/19-karaga.json";
import knDay20 from "@content/kn/chapters/20-cooks-favor.json";
import knDay21 from "@content/kn/chapters/21-amma.json";
import knDay22 from "@content/kn/chapters/22-misstep.json";
import knDay23 from "@content/kn/chapters/23-phone-call-home.json";
import knDay24 from "@content/kn/chapters/24-temple-auntie.json";
import knDay25 from "@content/kn/chapters/25-anikas-friends.json";
import knDay26 from "@content/kn/chapters/26-fight.json";
import knDay27 from "@content/kn/chapters/27-apology.json";
import knDay28 from "@content/kn/chapters/28-ugadi.json";
import knDay29 from "@content/kn/chapters/29-eve.json";
import knDay30 from "@content/kn/chapters/30-morning.json";

interface VoicesDoc {
  language: string;
  profiles: VoiceProfile[];
  emotionModifiers: Record<string, Record<string, number>>;
}

const voicesByLang: Record<string, VoicesDoc> = {
  kn: knVoices as unknown as VoicesDoc,
};

const chaptersByLang: Record<string, Chapter[]> = {
  kn: [
    knDay01,
    knDay02,
    knDay03,
    knDay04,
    knDay05,
    knDay06,
    knDay07,
    knDay08,
    knDay09,
    knDay10,
    knDay11,
    knDay12,
    knDay13,
    knDay14,
    knDay15,
    knDay16,
    knDay17,
    knDay18,
    knDay19,
    knDay20,
    knDay21,
    knDay22,
    knDay23,
    knDay24,
    knDay25,
    knDay26,
    knDay27,
    knDay28,
    knDay29,
    knDay30,
  ].map((c) => c as unknown as Chapter),
};

export function getVoices(lang: LanguageCode): VoicesDoc | null {
  return voicesByLang[lang] ?? null;
}

export function getChapter(lang: LanguageCode, chapterId: string): Chapter | null {
  const list = chaptersByLang[lang] ?? [];
  return list.find((c) => c.id === chapterId) ?? null;
}

export function getAllChapters(lang: LanguageCode): Chapter[] {
  return chaptersByLang[lang] ?? [];
}
