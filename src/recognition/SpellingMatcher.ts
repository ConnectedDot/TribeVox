import type { ComparisonToken, IntelligenceMetrics } from "../types/speech";
import { normalizeWords } from "./normalization";
const aliases: Record<string, string> = {
  a: "A",
  ay: "A",
  b: "B",
  bee: "B",
  c: "C",
  see: "C",
  sea: "C",
  d: "D",
  dee: "D",
  e: "E",
  ee: "E",
  f: "F",
  eff: "F",
  g: "G",
  gee: "G",
  h: "H",
  aitch: "H",
  i: "I",
  eye: "I",
  j: "J",
  jay: "J",
  k: "K",
  kay: "K",
  l: "L",
  el: "L",
  m: "M",
  em: "M",
  n: "N",
  en: "N",
  o: "O",
  oh: "O",
  p: "P",
  pee: "P",
  q: "Q",
  cue: "Q",
  queue: "Q",
  r: "R",
  are: "R",
  s: "S",
  ess: "S",
  t: "T",
  tee: "T",
  u: "U",
  you: "U",
  v: "V",
  vee: "V",
  w: "W",
  doubleyou: "W",
  x: "X",
  ex: "X",
  y: "Y",
  why: "Y",
  z: "Z",
  zee: "Z",
  zed: "Z",
};

export function speechToLettersSmart(text: string) {
  // Realtime STT often returns spelling as "A-C-C-O-M...", "A C C O M...",
  // or as letter names ("ay see see oh"). Normalize all of those into one stream.
  let cleaned = normalizeWords(text)
    .replace(/\b(?:spell|spelling|the word|word is|my answer is|the answer is)\b/g, " ")
    .replace(/[,:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Hyphenated single-letter runs are a very common Scribe output for spelling.
  // Convert A-C-C-O-M-M-O-D-A-T-E -> A C C O M M O D A T E before token parsing.
  cleaned = cleaned.replace(/\b(?:[a-z]-){2,}[a-z]\b/gi, (run) => run.replace(/-/g, " "));

  const words = cleaned.split(/[\s-]+/).filter(Boolean);
  let out: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "restart" || w === "again" || (w === "start" && words[i + 1] === "again")) {
      out = [];
      if (w === "start") i++;
      continue;
    }
    if (["backspace", "undo", "correction", "correct"].includes(w)) {
      out.pop();
      continue;
    }
    if (w === "double" && words[i + 1]) {
      const l = aliases[words[i + 1]];
      if (l) {
        out.push(l, l);
        i++;
      }
      continue;
    }

    const l = aliases[w] || (/^[a-z]$/.test(w) ? w.toUpperCase() : "");
    if (l) {
      // A provisional STT result can repeat the immediately previous letter while revising.
      // We preserve true doubles because the expected-word matcher decides whether both are needed.
      out.push(l);
      continue;
    }

    // Some engines collapse short spelling runs to strings like "acco". Expand only
    // small alphabetic tokens so ordinary spoken words are not accidentally treated as letters.
    if (/^[a-z]{2,5}$/.test(w) && !aliases[w]) {
      out.push(...w.toUpperCase().split(""));
    }
  }
  return out;
}
export function matchSpelling(
  expectedWord: string,
  transcript: string,
  interim = false,
) {
  const expected = expectedWord
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .split("");
  const actual = speechToLettersSmart(transcript);
  const tokens: ComparisonToken[] = expected.map((letter, i) => ({
    expected: letter,
    actual: actual[i],
    status:
      actual[i] == null
        ? "pending"
        : actual[i] === letter
          ? "correct"
          : interim && i === actual.length - 1
            ? "interim"
            : "incorrect",
  }));
  const metrics: IntelligenceMetrics = {
    ignoredRepetitions: 0,
    ignoredNoise: 0,
    recoveries: 0,
    skippedWords: 0,
    currentIndex: Math.min(actual.length, expected.length),
  };
  return { tokens, metrics, letters: actual };
}
