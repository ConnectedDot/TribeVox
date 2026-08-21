import { useCallback, useEffect, useRef, useState } from "react";

export type ElevenVoice = { voice_id: string; name: string; category?: string; labels?: Record<string,string> };

export function useElevenLabsTTS() {
  const [voices, setVoices] = useState<ElevenVoice[]>([]);
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem("tribevox.eleven.voice") || "JBFqnCBsd6RMkjVDRZzb");
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem("tribevox.eleven.speed") || 1));
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [limitedVoices, setLimitedVoices] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/elevenlabs-voices").then(async r => ({ ok:r.ok, data:await r.json() })).then(({ok,data}) => {
      if (!ok) throw new Error(data.error || "Could not load voices");
      setVoices(data.voices || []); setLimitedVoices(Boolean(data.limited));
      if (!voiceId && data.voices?.[0]) setVoiceId(data.voices[0].voice_id);
    }).catch(e => setError(e instanceof Error ? e.message : "Could not load voices"));
  }, []);
  useEffect(() => localStorage.setItem("tribevox.eleven.voice", voiceId), [voiceId]);
  useEffect(() => localStorage.setItem("tribevox.eleven.speed", String(speed)), [speed]);

  const stop = useCallback(() => { audioRef.current?.pause(); audioRef.current = null; setSpeaking(false); }, []);
  const speak = useCallback(async (text:string) => {
    stop(); setError(""); setSpeaking(true);
    try {
      const response = await fetch("/api/elevenlabs-tts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text,voiceId,speed}) });
      if (!response.ok) { const e = await response.json().catch(()=>({})); throw new Error(e.error || "Pronunciation failed"); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url); audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); setError("Could not play generated pronunciation"); };
      await audio.play();
    } catch (e) { setSpeaking(false); setError(e instanceof Error ? e.message : "Pronunciation failed"); }
  }, [voiceId,speed,stop]);

  return { voices, voiceId, setVoiceId, speed, setSpeed, speaking, speak, stop, error, limitedVoices };
}
