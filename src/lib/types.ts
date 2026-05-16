export type LanguageCode = "kn" | "ta" | "ml" | "te" | "hi" | "mr" | "bn";

export interface Course {
  language: LanguageCode;
  name: string;
  nameNative: string;
  description: string;
  units: Unit[];
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  titleNative?: string;
  description: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  order: number;
  title: string;
  titleNative: string;
  titleNativeTranslit?: string;
  description: string;
  estimatedMinutes: number;
  xp: number;
  vocabulary: VocabItem[];
  exercises: Exercise[];
  bridges?: BridgeNotes;
}

export interface VocabItem {
  native: string;
  translit: string;
  en: string;
  notes?: string;
  audio?: string;
  bridges?: {
    ta?: BridgeWord;
    ml?: BridgeWord;
  };
}

export interface BridgeWord {
  word: string;
  translit: string;
  note: string;
}

export interface BridgeNotes {
  ta?: string;
  ml?: string;
}

export type Exercise =
  | MultipleChoiceExercise
  | WordBankExercise
  | FillBlankExercise;

export interface MultipleChoiceExercise {
  type: "multipleChoice";
  prompt: string;
  promptNative?: string;
  options: string[];
  optionTranslits?: (string | null)[];
  correctIndex: number;
  explanation?: string;
  audio?: string;
}

export interface WordBankExercise {
  type: "wordBank";
  prompt: string;
  target: string;
  targetTranslit: string;
  words: string[];
  wordTranslits?: (string | null)[];
  correctOrder: number[];
  explanation?: string;
  targetAudio?: string;
}

export interface FillBlankExercise {
  type: "fillBlank";
  prompt: string;
  promptParts: [string, string];
  options: string[];
  optionTranslits?: (string | null)[];
  correctIndex: number;
  explanation?: string;
  audio?: string;
}
