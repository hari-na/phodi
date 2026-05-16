import type { LanguageCode } from "../types";
import type { Chapter, VoiceProfile } from "./types";
import knVoices from "@content/kn/voices.json";
import knDay01 from "@content/kn/chapters/01-airport.json";
import knDay02 from "@content/kn/chapters/02-hotel.json";
import knDay03 from "@content/kn/chapters/03-chai.json";
import knDay04 from "@content/kn/chapters/04-broker-call.json";

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
    knDay01 as unknown as Chapter,
    knDay02 as unknown as Chapter,
    knDay03 as unknown as Chapter,
    knDay04 as unknown as Chapter,
  ],
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
