import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveState } from "../types/speech";
const NAME = "tribevox-live";

export function useDisplayPublisher() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastStateRef = useRef<LiveState | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(NAME);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "REQUEST_STATE" && lastStateRef.current) {
        channel.postMessage({ type: "STATE", state: lastStateRef.current });
      }
    };
    return () => channel.close();
  }, []);

  return useCallback((state: LiveState) => {
    lastStateRef.current = state;
    channelRef.current?.postMessage({ type: "STATE", state });
  }, []);
}

export function useDisplaySubscriber() {
  const [state, setState] = useState<LiveState | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel(NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "STATE") setState(event.data.state);
    };
    channel.postMessage({ type: "REQUEST_STATE" });
    return () => channel.close();
  }, []);
  return state;
}
