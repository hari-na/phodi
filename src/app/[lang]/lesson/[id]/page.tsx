import { notFound } from "next/navigation";
import { getLesson } from "@/lib/content";
import type { LanguageCode } from "@/lib/types";
import { LessonPlayer } from "@/components/LessonPlayer";

const VALID: LanguageCode[] = ["kn"];

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!VALID.includes(lang as LanguageCode)) notFound();
  const lesson = getLesson(lang as LanguageCode, id);
  if (!lesson) notFound();

  return <LessonPlayer lesson={lesson} langCode={lang} />;
}
