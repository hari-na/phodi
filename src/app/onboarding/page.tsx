"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { saveProfile, type KnownLanguage } from "@/lib/player";

const LANG_OPTIONS: Array<{ code: KnownLanguage; label: string; native: string }> = [
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "ml", label: "Malayalam", native: "மലയാളം" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "en", label: "Just English", native: "English" },
];

/**
 * Two-step onboarding now: name + languages. The pre-pick "who do you want
 * to fall for?" step is gone — romance emerges from how the player treats
 * the people they meet across the 30 days. The named ending at Day 30
 * reflects whichever character (if any) they invested in.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [languages, setLanguages] = useState<KnownLanguage[]>([]);

  const TOTAL_STEPS = 2;

  function toggleLanguage(code: KnownLanguage) {
    setLanguages((langs) =>
      langs.includes(code) ? langs.filter((l) => l !== code) : [...langs, code]
    );
  }

  function finish() {
    saveProfile({
      name: name.trim() || "You",
      knownLanguages: languages.length > 0 ? languages : ["en"],
      createdAtISO: new Date().toISOString(),
    });
    router.push("/kn");
  }

  const canNext =
    step === 0 ? name.trim().length > 0 :
    step === 1 ? languages.length > 0 :
    true;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-dim">
        Phodi · Setup
      </p>

      <div className="mt-3 mb-12 flex items-center gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i).map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-accent" : "bg-ink-soft"
            )}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-6">
          <h1 className="serif text-4xl text-cream">What should the city call you?</h1>
          <p className="text-cream-muted">
            Auto drivers, watchmen, chai stalls, neighbours. First name works.
          </p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canNext) setStep(1);
            }}
            placeholder="Your name"
            className="mt-2 rounded-md border border-cream/15 bg-ink-soft px-5 py-4 text-2xl text-cream placeholder:text-cream-dim/50 focus:border-accent/60 focus:outline-none"
          />
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-6">
          <h1 className="serif text-4xl text-cream">What do you already speak?</h1>
          <p className="text-cream-muted">
            Tamil or Malayalam helps. The lessons bridge from there. Pick
            whatever applies.
          </p>
          <div className="mt-2 space-y-2">
            {LANG_OPTIONS.map((opt) => {
              const selected = languages.includes(opt.code);
              return (
                <button
                  key={opt.code}
                  onClick={() => toggleLanguage(opt.code)}
                  className={cn(
                    "w-full rounded-md border px-5 py-4 text-left transition",
                    selected
                      ? "border-accent/60 bg-accent/10"
                      : "border-cream/10 bg-ink-soft hover:border-cream/30"
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg text-cream">{opt.label}</span>
                    <span className="font-kn text-sm text-cream-muted">
                      {opt.native}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs italic text-cream-dim">
            Thirty days in Bangalore. You&apos;ll meet shopkeepers,
            flatmates, a few people who might matter. The rest is up to you.
          </p>
        </section>
      )}

      <div className="mt-12 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={cn(
            "text-sm text-cream-dim transition",
            step === 0 ? "opacity-30" : "hover:text-cream"
          )}
        >
          ← Back
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className={cn(
              "rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition",
              !canNext && "cursor-not-allowed opacity-40",
              canNext && "hover:bg-accent-deep"
            )}
          >
            Next →
          </button>
        ) : (
          <button
            disabled={!canNext}
            onClick={finish}
            className={cn(
              "rounded-md bg-accent px-6 py-3 text-sm font-medium text-ink transition",
              !canNext && "cursor-not-allowed opacity-40",
              canNext && "hover:bg-accent-deep"
            )}
          >
            Start Day 1 →
          </button>
        )}
      </div>
    </main>
  );
}
