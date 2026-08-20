export const normalizeWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BIBLE_BOOKS = [
  "genesis",
  "exodus",
  "leviticus",
  "numbers",
  "deuteronomy",
  "joshua",
  "judges",
  "ruth",
  "samuel",
  "kings",
  "chronicles",
  "ezra",
  "nehemiah",
  "esther",
  "job",
  "psalm",
  "psalms",
  "proverbs",
  "ecclesiastes",
  "song of solomon",
  "isaiah",
  "jeremiah",
  "lamentations",
  "ezekiel",
  "daniel",
  "hosea",
  "joel",
  "amos",
  "obadiah",
  "jonah",
  "micah",
  "nahum",
  "habakkuk",
  "zephaniah",
  "haggai",
  "zechariah",
  "malachi",
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "thessalonians",
  "timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "peter",
  "jude",
  "revelation",
];
const NUMBER_WORDS =
  "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|and|\\d+)";
const BOOK_PATTERN = [...BIBLE_BOOKS]
  .sort((a, b) => b.length - a.length)
  .map((x) => x.replace(/ /g, "\\s+"))
  .join("|");

export function stripSpokenScriptureReferences(value: string) {
  let text = ` ${normalizeWords(value)} `;
  const patterns = [
    new RegExp(
      `\\b(?:first|second|third|1st|2nd|3rd|1|2|3)?\\s*(?:${BOOK_PATTERN})\\s+(?:chapter\\s+)?${NUMBER_WORDS}(?:\\s+${NUMBER_WORDS}){0,4}\\s+(?:verse|verses)\\s+${NUMBER_WORDS}(?:\\s+(?:to|through|dash|-)?\\s*${NUMBER_WORDS}){0,4}\\b`,
      "gi",
    ),
    new RegExp(
      `\\b(?:first|second|third|1st|2nd|3rd|1|2|3)?\\s*(?:${BOOK_PATTERN})\\s+(?:chapter\\s+)?${NUMBER_WORDS}(?:\\s+${NUMBER_WORDS}){0,3}\\b`,
      "gi",
    ),
    new RegExp(
      `\\b(?:chapter\\s+${NUMBER_WORDS}(?:\\s+${NUMBER_WORDS}){0,2}\\s+)?verses?\\s+${NUMBER_WORDS}(?:\\s+(?:to|through)\\s+${NUMBER_WORDS})?\\b`,
      "gi",
    ),
  ];
  patterns.forEach((p) => {
    text = text.replace(p, " ");
  });
  return text.replace(/\s+/g, " ").trim();
}

const fillers = new Set([
  "um",
  "uh",
  "erm",
  "hmm",
  "okay",
  "ok",
  "please",
  "sorry",
  "actually",
]);
export function isLikelyFiller(word: string) {
  return fillers.has(word);
}

export function levenshtein(a: string, b: string) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = m[0];
    m[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = m[i];
      m[i] = Math.min(
        m[i] + 1,
        m[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return m[a.length];
}
export function wordsMatch(a: string, b: string) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length <= 3 || b.length <= 3) return false;
  const d = levenshtein(a, b);
  const max = Math.max(a.length, b.length);
  return (d === 1 && max >= 5) || 1 - d / max >= 0.86;
}
