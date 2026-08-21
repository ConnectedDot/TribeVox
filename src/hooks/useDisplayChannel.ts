import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveState } from "../types/speech";
const NAME = "tribevox-live";
const STORAGE_KEY = "tribevox.live-state.v5";

function readStoredState(): LiveState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as LiveState : null;
  } catch { return null; }
}

export function useDisplayPublisher() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastStateRef = useRef<LiveState | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(NAME);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === "REQUEST_STATE" && lastStateRef.current) {
          channel.postMessage({ type: "STATE", state: lastStateRef.current });
        }
      };
      return () => channel.close();
    }
  }, []);

  return useCallback((state: LiveState) => {
    lastStateRef.current = state;
    // Persist as a second same-origin transport. This makes refreshes/new tabs recover
    // immediately even if BroadcastChannel delivery is missed.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    channelRef.current?.postMessage({ type: "STATE", state });
  }, []);
}

export function useDisplaySubscriber() {
  const [state, setState] = useState<LiveState | null>(() => {
    if (typeof window === "undefined") return null;
    return readStoredState();
  });

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "STATE") setState(event.data.state);
      };
      channel.postMessage({ type: "REQUEST_STATE" });
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { setState(JSON.parse(event.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    // Low-cost recovery for browsers that throttle cross-tab events.
    const timer = window.setInterval(() => {
      const stored = readStoredState();
      if (stored) setState(prev => !prev || stored.updatedAt > prev.updatedAt ? stored : prev);
    }, 500);

    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, []);
  return state;
}
