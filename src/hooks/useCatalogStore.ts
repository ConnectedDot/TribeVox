import { useCallback, useEffect, useState } from "react";
import seedScriptures from "../data/scriptures.json";
import seedWords from "../data/words.json";
import type { ScriptureItem, WordItem } from "../types/catalog";

const WORDS_KEY = "tribevox.words.v1";
const SCRIPTURES_KEY = "tribevox.scriptures.v1";

type CataloguePayload = {
  version: 1;
  exportedAt: string;
  words: WordItem[];
  scriptures: ScriptureItem[];
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function makeId(prefix: string, value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || prefix;
  return `${slug}-${Date.now().toString(36)}`;
}

export function useCatalogStore() {
  const [words, setWords] = useState<WordItem[]>(() => safeParse(localStorage.getItem(WORDS_KEY), seedWords as WordItem[]));
  const [scriptures, setScriptures] = useState<ScriptureItem[]>(() => safeParse(localStorage.getItem(SCRIPTURES_KEY), seedScriptures as ScriptureItem[]));

  useEffect(() => { localStorage.setItem(WORDS_KEY, JSON.stringify(words)); }, [words]);
  useEffect(() => { localStorage.setItem(SCRIPTURES_KEY, JSON.stringify(scriptures)); }, [scriptures]);

  const addWord = useCallback((input: Omit<WordItem, "id">) => {
    const item: WordItem = { ...input, word: input.word.trim(), category: input.category.trim(), hint: input.hint.trim(), id: makeId("word", input.word) };
    setWords(v => [item, ...v]); return item;
  }, []);
  const updateWord = useCallback((id: string, patch: Omit<WordItem, "id">) => setWords(v => v.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const deleteWord = useCallback((id: string) => setWords(v => v.filter(x => x.id !== id)), []);

  const addScripture = useCallback((input: Omit<ScriptureItem, "id">) => {
    const item: ScriptureItem = { ...input, reference: input.reference.trim(), title: input.title.trim(), text: input.text.trim(), id: makeId("scripture", input.reference) };
    setScriptures(v => [item, ...v]); return item;
  }, []);
  const updateScripture = useCallback((id: string, patch: Omit<ScriptureItem, "id">) => setScriptures(v => v.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const deleteScripture = useCallback((id: string) => setScriptures(v => v.filter(x => x.id !== id)), []);

  const resetToSeed = useCallback(() => {
    setWords(seedWords as WordItem[]);
    setScriptures(seedScriptures as ScriptureItem[]);
  }, []);

  const exportJson = useCallback(() => {
    const payload: CataloguePayload = { version: 1, exportedAt: new Date().toISOString(), words, scriptures };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tribevox-catalogue-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [words, scriptures]);

  const importJson = useCallback(async (file: File) => {
    const payload = JSON.parse(await file.text()) as Partial<CataloguePayload>;
    if (!Array.isArray(payload.words) || !Array.isArray(payload.scriptures)) throw new Error("Invalid TribeVox catalogue JSON.");
    setWords(payload.words as WordItem[]);
    setScriptures(payload.scriptures as ScriptureItem[]);
  }, []);

  return { words, scriptures, addWord, updateWord, deleteWord, addScripture, updateScripture, deleteScripture, resetToSeed, exportJson, importJson };
}
