import type { ComparisonToken, IntelligenceMetrics } from "../types/speech";
import {
  isLikelyFiller,
  normalizeWords,
  stripSpokenScriptureReferences,
  wordsMatch,
} from "./normalization";

export type MatchOptions = {
  interim?: boolean;
  skipTolerance?: number;
  recoveryLookahead?: number;
};

export function buildVerseMap(
  reference: string,
  text: string,
  wordCount: number,
) {
  const map = Array<number>(wordCount).fill(0);
  const m = reference.match(/:(\d+)(?:\s*[-–]\s*(\d+))?/);
  const start = m ? Number(m[1]) : 1,
    end = m?.[2] ? Number(m[2]) : start;
  const count = Math.max(1, end - start + 1);
  if (count === 1) return { map, labels: [String(start)] };
  const sentenceWords = text
    .split(/(?<=[.!?])\s+/)
    .map((x) => normalizeWords(x).split(" ").filter(Boolean).length)
    .filter(Boolean);
  if (sentenceWords.length === count) {
    let p = 0;
    sentenceWords.forEach((len, idx) => {
      for (let k = 0; k < len && p < wordCount; k++, p++) map[p] = idx;
    });
    while (p < wordCount) map[p++] = count - 1;
  } else {
    for (let i = 0; i < wordCount; i++)
      map[i] = Math.min(count - 1, Math.floor(i / (wordCount / count)));
  }
  return {
    map,
    labels: Array.from({ length: count }, (_, i) => String(start + i)),
  };
}

export function matchRecitation(
  expectedText: string,
  spokenText: string,
  reference = "",
  opts: MatchOptions = {},
) {
  const expected = normalizeWords(expectedText).split(" ").filter(Boolean);
  const spoken = normalizeWords(stripSpokenScriptureReferences(spokenText))
    .split(" ")
    .filter(Boolean);
  const verse = buildVerseMap(reference, expectedText, expected.length);
  const tokens: ComparisonToken[] = expected.map((w, i) => ({
    expected: w,
    status: "pending",
    verse: verse.map[i],
  }));
  const metrics: IntelligenceMetrics = {
    ignoredRepetitions: 0,
    ignoredNoise: 0,
    recoveries: 0,
    skippedWords: 0,
    currentIndex: 0,
  };
  const skipTol = opts.skipTolerance ?? 5,
    recoverAhead = opts.recoveryLookahead ?? 3;
  let i = 0,
    j = 0;
  while (i < expected.length && j < spoken.length) {
    const heard = spoken[j];
    if (wordsMatch(expected[i], heard)) {
      tokens[i] = { ...tokens[i], actual: heard, status: "correct" };
      i++;
      j++;
      continue;
    }
    // Stutter/repetition: a recently accepted word repeated does not advance or penalise.
    let repeated = false;
    for (let back = 1; back <= Math.min(4, i); back++)
      if (wordsMatch(expected[i - back], heard)) {
        repeated = true;
        break;
      }
    if (repeated || (j > 0 && spoken[j - 1] === heard)) {
      metrics.ignoredRepetitions++;
      j++;
      continue;
    }
    if (isLikelyFiller(heard)) {
      metrics.ignoredNoise++;
      j++;
      continue;
    }
    // Before the first reliable anchor, treat unrelated speech as room noise rather than a contestant error.
    if (i === 0) {
      let startAnchor = -1;
      for (let k = 0; k <= Math.min(3, expected.length - 1); k++)
        if (wordsMatch(expected[k], heard)) {
          startAnchor = k;
          break;
        }
      if (startAnchor < 0) {
        metrics.ignoredNoise++;
        j++;
        continue;
      }
    }

    // Participant skipped ahead: recover to the nearest expected word and mark only the skipped words.
    let found = -1;
    for (let k = i + 1; k <= Math.min(expected.length - 1, i + skipTol); k++)
      if (wordsMatch(expected[k], heard)) {
        found = k;
        break;
      }
    if (found >= 0) {
      for (let k = i; k < found; k++)
        tokens[k] = { ...tokens[k], status: "incorrect" };
      metrics.skippedWords += found - i;
      metrics.recoveries++;
      tokens[found] = { ...tokens[found], actual: heard, status: "correct" };
      i = found + 1;
      j++;
      continue;
    }

    // An inserted/background word before the correct sequence: ignore it if the next few heard words re-anchor us.
    let reanchor = -1;
    for (let k = j + 1; k <= Math.min(spoken.length - 1, j + recoverAhead); k++)
      if (wordsMatch(expected[i], spoken[k])) {
        reanchor = k;
        break;
      }
    if (reanchor >= 0) {
      metrics.ignoredNoise += reanchor - j;
      j = reanchor;
      continue;
    }

    // Do not turn unstable interim words into hard errors.
    const atTail = j >= spoken.length - 1;
    if (opts.interim && atTail) {
      tokens[i] = { ...tokens[i], actual: heard, status: "interim" };
      j++;
      break;
    }
    tokens[i] = { ...tokens[i], actual: heard, status: "incorrect" };
    i++;
    j++;
  }
  metrics.currentIndex = Math.min(i, expected.length);
  if (expected.length) {
    const idx = Math.min(Math.max(0, i - 1), expected.length - 1);
    metrics.currentVerse = verse.labels[verse.map[idx]];
  }
  return { tokens, metrics, cleanedSpoken: spoken.join(" ") };
}
