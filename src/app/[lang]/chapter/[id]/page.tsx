import { notFound } from "next/navigation";
import { getChapter, getVoices } from "@/lib/chapters/content";
import type { LanguageCode } from "@/lib/types";
import { ChapterPlayer } from "@/components/ChapterPlayer";

const VALID: LanguageCode[] = ["kn"];

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!VALID.includes(lang as LanguageCode)) notFound();
  const chapter = getChapter(lang as LanguageCode, id);
  const voices = getVoices(lang as LanguageCode);
  if (!chapter || !voices) notFound();

  return (
    <ChapterPlayer
      chapter={chapter}
      voiceProfiles={voices.profiles}
      langCode={lang}
    />
  );
}
