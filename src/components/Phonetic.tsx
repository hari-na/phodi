"use client";

import { createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/types";

export type PhoneticDict = Record<string, string>;

const PhoneticContext = createContext<PhoneticDict>({});

export function PhoneticProvider({
  dict,
  children,
}: {
  dict: PhoneticDict;
  children: React.ReactNode;
}) {
  return (
    <PhoneticContext.Provider value={dict}>{children}</PhoneticContext.Provider>
  );
}

export function usePhoneticDict() {
  return useContext(PhoneticContext);
}

/** Build a native → translit dictionary from everything in a lesson. */
export function buildPhoneticDict(lesson: Lesson): PhoneticDict {
  const dict: PhoneticDict = {};
  for (const v of lesson.vocabulary) {
    dict[v.native] = v.translit;
  }
  for (const ex of lesson.exercises) {
    if (ex.type === "wordBank") {
      if (ex.target && ex.targetTranslit) dict[ex.target] = ex.targetTranslit;
      const translits = ex.wordTranslits;
      if (translits) {
        ex.words.forEach((w, i) => {
          const t = translits[i];
          if (t) dict[w] = t;
        });
      }
    } else if (ex.type === "multipleChoice" || ex.type === "fillBlank") {
      const translits = ex.optionTranslits;
      if (translits) {
        ex.options.forEach((opt, i) => {
          const t = translits[i];
          if (t) dict[opt] = t;
        });
      }
    }
  }
  return dict;
}

/**
 * Renders a native-script word with its transliteration shown below.
 * Looks up the translit from the PhoneticProvider context unless one
 * is supplied directly via the `translit` prop.
 */
export function Phonetic({
  native,
  translit,
  size = "md",
  className,
  translitClassName,
}: {
  native: string;
  translit?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  translitClassName?: string;
}) {
  const dict = usePhoneticDict();
  const resolved =
    translit ??
    dict[native] ??
    dict[native.trim()] ??
    dict[stripEdgePunct(native)];

  const nativeCls = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];
  const translitCls = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  }[size];

  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("font-kn", nativeCls)}>{native}</span>
      {resolved && (
        <span
          className={cn(
            "mt-0.5 italic text-cream-dim",
            translitCls,
            translitClassName
          )}
        >
          {resolved}
        </span>
      )}
    </span>
  );
}

const NATIVE_RUN = /([ಀ-೿஀-௿ഀ-ൿఀ-౿ऀ-ॿঀ-৿઀-૿਀-੿]+)/g;

/**
 * Renders mixed-script text (English with embedded native words), wrapping
 * each run of native script in a `<ruby>` element so its transliteration
 * appears small above the script inline.
 */
export function PhoneticText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const dict = usePhoneticDict();
  const parts = useMemo(() => splitOnNative(text), [text]);

  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.kind === "plain") return <span key={i}>{p.text}</span>;
        const translit =
          dict[p.text] ?? dict[p.text.trim()] ?? dict[stripEdgePunct(p.text)];
        return (
          <ruby key={i} className="font-kn">
            {p.text}
            {translit && <rt>{translit}</rt>}
          </ruby>
        );
      })}
    </span>
  );
}

function stripEdgePunct(s: string): string {
  return s.replace(/^[\s,.!?।॥\-]+|[\s,.!?।॥\-]+$/g, "");
}

type Part = { kind: "plain"; text: string } | { kind: "native"; text: string };

function splitOnNative(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  NATIVE_RUN.lastIndex = 0;
  while ((m = NATIVE_RUN.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "plain", text: text.slice(last, m.index) });
    parts.push({ kind: "native", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "plain", text: text.slice(last) });
  return parts;
}
