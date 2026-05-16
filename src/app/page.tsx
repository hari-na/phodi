import Link from "next/link";
import { getAllCourses } from "@/lib/content";

export default function Home() {
  const courses = getAllCourses();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="mb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
          phodi
        </p>
        <h1 className="serif mt-2 text-5xl text-cream sm:text-6xl">
          Indian languages,
          <br />
          <span className="italic text-accent">broken down.</span>
        </h1>
        <p className="mt-6 max-w-md text-cream-muted">
          Conversational lessons built for people who already speak an Indian
          language. If you know Tamil or Malayalam, your Kannada lessons bridge
          from what you already know.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
          Courses
        </p>
        {courses.map((c) => (
          <Link
            key={c.language}
            href={`/${c.language}`}
            className="group block rounded-lg border border-cream/10 bg-ink-soft p-6 transition hover:border-accent/40 hover:bg-ink-muted"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-kn text-2xl text-cream">{c.nameNative}</p>
                <p className="mt-1 text-sm text-cream-muted">{c.name}</p>
              </div>
              <span className="text-cream-dim transition group-hover:text-accent">
                →
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-cream-muted">
              {c.description}
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-24 text-xs text-cream-dim">
        AI-built lesson content. Pedagogy by a human who lives in Bangalore.
      </footer>
    </main>
  );
}
