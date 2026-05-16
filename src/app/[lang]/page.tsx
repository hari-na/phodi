import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/content";
import { getAllChapters } from "@/lib/chapters/content";
import type { LanguageCode } from "@/lib/types";

const VALID: LanguageCode[] = ["kn"];

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

      {chapters.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between border-b border-cream/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                The Game
              </p>
              <h2 className="serif mt-1 text-2xl text-cream">
                Thirty Days in Bangalore
              </h2>
            </div>
            <p className="text-xs text-cream-dim">
              {chapters.length} / 30 chapters
            </p>
          </div>
          <p className="mb-6 max-w-md text-sm text-cream-muted">
            You moved here for the engineering job. The city speaks Kannada
            and you don&apos;t. Yet.
          </p>

          <ol className="space-y-2">
            {chapters.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${course.language}/chapter/${c.id}`}
                  className="group flex items-center justify-between rounded-md border border-cream/10 bg-ink-soft px-5 py-4 transition hover:border-accent/40 hover:bg-ink-muted"
                >
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs text-cream-dim">
                        Day {String(c.day).padStart(2, "0")}
                      </span>
                      <span className="font-medium text-cream">{c.title}</span>
                      {c.titleNative && (
                        <span className="font-kn text-sm text-cream-muted">
                          {c.titleNative}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-cream-dim transition group-hover:text-accent">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="space-y-10">
        {course.units.map((unit) => (
          <section key={unit.id}>
            <div className="mb-4 flex items-baseline justify-between border-b border-cream/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
                  Unit {unit.order}
                </p>
                <h2 className="serif mt-1 text-2xl text-cream">{unit.title}</h2>
              </div>
              {unit.titleNative && (
                <p className="font-kn text-cream-muted">{unit.titleNative}</p>
              )}
            </div>
            <p className="mb-6 text-sm text-cream-muted">{unit.description}</p>

            <ol className="space-y-2">
              {unit.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/${course.language}/lesson/${lesson.id}`}
                    className="group flex items-center justify-between rounded-md border border-cream/10 bg-ink-soft px-5 py-4 transition hover:border-accent/40 hover:bg-ink-muted"
                  >
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs text-cream-dim">
                          {String(lesson.order).padStart(2, "0")}
                        </span>
                        <span className="font-medium text-cream">
                          {lesson.title}
                        </span>
                        <span className="font-kn text-sm text-cream-muted">
                          {lesson.titleNative}
                        </span>
                        {lesson.titleNativeTranslit && (
                          <span className="text-xs italic text-cream-dim">
                            {lesson.titleNativeTranslit}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 ml-7 text-xs text-cream-muted">
                        {lesson.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-cream-dim">
                      <span>{lesson.estimatedMinutes} min</span>
                      <span className="text-accent">+{lesson.xp} XP</span>
                      <span className="transition group-hover:text-accent">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
