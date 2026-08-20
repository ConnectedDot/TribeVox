export type Mode = "recitation" | "spelling";
export type Theme = "light" | "dark";
export type TokenStatus = "correct" | "incorrect" | "pending" | "interim" | "ignored";
export type ComparisonToken = { expected: string; actual?: string; status: TokenStatus; confidence?: number; verse?: number };
export type RecognitionSegment = { text: string; confidence: number | null; at: number };
export type IntelligenceMetrics = {
  ignoredRepetitions: number;
  ignoredNoise: number;
  recoveries: number;
  skippedWords: number;
  currentIndex: number;
  currentVerse?: string;
};
export type LiveState = {
  mode: Mode;
  title: string;
  reference: string;
  expected: string;
  transcript: string;
  interim: string;
  accuracy: number;
  progress?: number;
  confidence?: number;
  listening: boolean;
  tokens: ComparisonToken[];
  intelligence?: IntelligenceMetrics;
  turn?: number;
  updatedAt: number;
};
