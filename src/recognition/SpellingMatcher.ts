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
  const words = normalizeWords(text)
    .replace(/\b(?:spell|spelling|the word|word is|my answer is)\b/g, " ")
    .split(" ")
    .filter(Boolean);
  let out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (
      ["restart", "again"].includes(w) ||
      (w === "start" && words[i + 1] === "again")
    ) {
      out = [];
      if (w === "start") i++;
      continue;
    }
    if (["backspace", "undo", "correction"].includes(w)) {
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
    if (l) out.push(l);
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
