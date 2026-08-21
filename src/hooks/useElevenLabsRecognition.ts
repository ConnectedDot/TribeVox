import { useCallback, useMemo, useRef, useState } from "react";
import { useScribe } from "@elevenlabs/react";

export function useElevenLabsRecognition() {
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const lastPartialAt = useRef<number>(0);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: "en",
    includeTimestamps: true,
    onPartialTranscript: (data: { text?: string }) => {
      lastPartialAt.current = performance.now();
      setInterim(data.text || "");
    },
    onCommittedTranscript: (data: { text?: string }) => {
      const text = (data.text || "").trim();
      if (!text) return;
      if (lastPartialAt.current) {
        setLatencyMs(Math.max(0, Math.round(performance.now() - lastPartialAt.current)));
        lastPartialAt.current = 0;
      }
      setFinalText((prev) => `${prev}${prev ? " " : ""}${text}`.trim());
      setInterim("");
    },
  });

  const start = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/scribe-token", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.token) throw new Error(payload.error || "Could not create ElevenLabs session token");
      await scribe.connect({
        token: payload.token,
        commitStrategy: "vad",
        vadSilenceThresholdSecs: 0.48,
        vadThreshold: 0.4,
        minSpeechDurationMs: 70,
        minSilenceDurationMs: 80,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setStartedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to ElevenLabs Scribe");
    }
  }, [scribe]);

  const stop = useCallback(() => {
    try { scribe.disconnect(); } catch {}
    setInterim("");
    setStartedAt(null);
  }, [scribe]);

  const reset = useCallback(() => {
    setFinalText(""); setInterim(""); setError(""); setLatencyMs(null); lastPartialAt.current = 0;
  }, []);

  return useMemo(() => ({
    supported: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    listening: Boolean(scribe.isConnected),
    connecting: Boolean(scribe.isConnecting),
    finalText,
    interim,
    error,
    latencyMs,
    startedAt,
    start,
    stop,
    reset,
  }), [scribe.isConnected, scribe.isConnecting, finalText, interim, error, latencyMs, startedAt, start, stop, reset]);
}
