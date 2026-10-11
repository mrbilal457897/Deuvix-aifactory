"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface VoiceRecorderApi {
  supported: boolean;
  recording: boolean;
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

/**
 * MediaRecorder wrapper for the admin agent. On stop (auto at `maxSeconds` or by
 * the user) it hands the finished clip to `onComplete`; the caller transcribes
 * it. Nothing here sends or executes anything.
 */
export function useVoiceRecorder(maxSeconds: number, onComplete: (blob: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const supported =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    const recorder = mediaRef.current;
    chunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    setRecording(false);
    setSeconds(0);
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!supported || recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        cleanup();
        setRecording(false);
        setSeconds(0);
        if (blob.size > 0) completeRef.current(blob);
      };

      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((previous) => {
          const next = previous + 1;
          if (next >= maxSeconds) stop();
          return next;
        });
      }, 1000);
    } catch (err) {
      cleanup();
      setRecording(false);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not start recording.",
      );
    }
  }, [supported, recording, maxSeconds, cleanup, stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { supported, recording, seconds, error, start, stop, cancel };
}
