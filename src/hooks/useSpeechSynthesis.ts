import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type VoiceProfile = { name: string; lang: string; localService: boolean; default: boolean };

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceName, setVoiceName] = useState(() => localStorage.getItem("tribevox.tts.voice") || "");
  const [rate, setRate] = useState(() => Number(localStorage.getItem("tribevox.tts.rate") || 0.9));
  const [pitch, setPitch] = useState(() => Number(localStorage.getItem("tribevox.tts.pitch") || 1));
  const warmupRef = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length) {
        setVoices(list);
        if (!voiceName) {
          const preferred = list.find(v => /en-NG/i.test(v.lang)) || list.find(v => /en-GB/i.test(v.lang)) || list.find(v => /^en/i.test(v.lang));
          if (preferred) setVoiceName(preferred.name);
        }
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const timer = window.setTimeout(load, 250);
    return () => { clearTimeout(timer); if (window.speechSynthesis.onvoiceschanged === load) window.speechSynthesis.onvoiceschanged = null; };
  }, [voiceName]);

  useEffect(() => { localStorage.setItem("tribevox.tts.voice", voiceName); }, [voiceName]);
  useEffect(() => { localStorage.setItem("tribevox.tts.rate", String(rate)); }, [rate]);
  useEffect(() => { localStorage.setItem("tribevox.tts.pitch", String(pitch)); }, [pitch]);

  const selectedVoice = useMemo(() => voices.find(v => v.name === voiceName) || voices.find(v => /^en/i.test(v.lang)) || voices[0], [voices, voiceName]);
  const voiceProfiles: VoiceProfile[] = useMemo(() => voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default })), [voices]);

  const stop = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; voiceName?: string }) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    // Some Chromium builds wake the synthesis service lazily. A cancelled blank utterance reduces first-click lag.
    if (!warmupRef.current) {
      const primer = new SpeechSynthesisUtterance(" ");
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
      window.speechSynthesis.cancel();
      warmupRef.current = true;
    }
    const u = new SpeechSynthesisUtterance(text.trim());
    const chosen = voices.find(v => v.name === options?.voiceName) || selectedVoice;
    if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else { u.lang = "en-GB"; }
    u.rate = Math.min(1.6, Math.max(0.5, options?.rate ?? rate));
    u.pitch = Math.min(1.5, Math.max(0.6, options?.pitch ?? pitch));
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [voices, selectedVoice, rate, pitch]);

  return { supported: "speechSynthesis" in window, voices: voiceProfiles, speaking, voiceName, setVoiceName, rate, setRate, pitch, setPitch, speak, stop };
}
