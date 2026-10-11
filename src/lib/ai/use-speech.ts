"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks agent replies aloud. Uses the self-hosted TTS server when one is
 * configured, and otherwise the browser's built-in SpeechSynthesis — so audio
 * never leaves the device unless the operator opted into a server.
 */
export interface SpeechApi {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, voice?: string) => Promise<void>;
  stop: () => void;
}

export function useSpeech(serverConfigured: boolean): SpeechApi {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supported =
    serverConfigured || (typeof window !== "undefined" && "speechSynthesis" in window);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  useEffect(() => stop, [stop]);

  const browserSpeak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text: string, voice?: string) => {
      const clean = text.trim();
      if (!clean) return;
      stop();
      setSpeaking(true);

      if (serverConfigured) {
        try {
          const res = await fetch("/api/admin/agent/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clean, voice }),
          });
          if (!res.ok) throw new Error("tts failed");
          const url = URL.createObjectURL(await res.blob());
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            setSpeaking(false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            browserSpeak(clean);
          };
          await audio.play();
          return;
        } catch {
          // fall through to the browser voice
        }
      }
      browserSpeak(clean);
    },
    [serverConfigured, stop, browserSpeak],
  );

  return { supported, speaking, speak, stop };
}
