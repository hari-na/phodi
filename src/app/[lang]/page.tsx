import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/content";
import { getAllChapters } from "@/lib/chapters/content";
import type { LanguageCode } from "@/lib/types";
import { CourseClient } from "@/components/CourseClient";

const VALID: LanguageCode[] = ["kn"];

/**
 * Course landing page.
 *
 * The chapter index is no longer a chapter picker — it's a linear progression
 * gate. We fetch the static course + chapter data here (server-side), then
 * defer all the "which day are you on" logic to <CourseClient>, which reads
 * RunState from localStorage and renders the right CTA.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!VALID.includes(lang as LanguageCode)) notFound();
  const course = getCourse(lang as LanguageCode);
  if (!course) notFound();
  const chapters = getAllChapters(lang as LanguageCode);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.2em] text-cream-dim hover:text-accent"
      >
        ← Phodi
      </Link>

      <div className="mt-8 mb-12">
        <p className="font-kn text-sm text-accent">{course.nameNative}</p>
        <h1 className="serif mt-2 text-5xl text-cream">{course.name}</h1>
        <p className="mt-4 max-w-md text-cream-muted">{course.description}</p>
      </div>

      <CourseClient course={course} chapters={chapters} />
    </main>
  );
}
