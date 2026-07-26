"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { transcribeAudio } from "@/lib/api";

/**
 * Microphone capture with two modes:
 *  - push-to-talk: hold to record, release to transcribe
 *  - always-listening: silence detection auto-segments speech
 */
/** Pick the first audio recording format this browser actually supports.
 *  Windows Chrome/Edge don't always support bare "audio/webm". */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function useVoice(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const rafRef = useRef<number>(0);
  const silenceSinceRef = useRef<number>(0);
  const spokeRef = useRef(false);
  const listeningRef = useRef(false);

  const finishSegment = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 1200) return; // ignore micro-noises
    setTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      if (text) {
        setError(null);
        onTranscript(text);
      } else {
        setError("No speech detected — try again.");
      }
    } catch {
      setError("Transcription failed — is the backend running?");
    } finally {
      setTranscribing(false);
    }
  }, [onTranscript]);

  const makeRecorder = useCallback((stream: MediaStream): MediaRecorder => {
    const mime = mimeRef.current;
    return mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  }, []);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setRecording(false);
    setListening(false);
    listeningRef.current = false;
    setLevel(0);
  }, []);

  const startRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone not available in this browser.");
    }
    mimeRef.current = pickMimeType();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = makeRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => void finishSegment();
    recorder.start(250);

    // live input level for the HUD visualizer
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    silenceSinceRef.current = performance.now();
    spokeRef.current = false;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += (v - 128) ** 2;
      const rms = Math.sqrt(sum / data.length) / 128;
      setLevel(rms);

      if (listeningRef.current) {
        const now = performance.now();
        if (rms > 0.04) {
          spokeRef.current = true;
          silenceSinceRef.current = now;
        } else if (spokeRef.current && now - silenceSinceRef.current > 1400) {
          // speech segment ended → restart recorder to flush + transcribe
          recorder.stop();
          spokeRef.current = false;
          setTimeout(() => {
            if (listeningRef.current && streamRef.current) {
              const r2 = makeRecorder(streamRef.current);
              recorderRef.current = r2;
              chunksRef.current = [];
              r2.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
              r2.onstop = () => void finishSegment();
              r2.start(250);
            }
          }, 50);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [finishSegment]);

  const startPushToTalk = useCallback(async () => {
    if (recording || listening) return;
    setError(null);
    setRecording(true);
    try {
      await startRecorder();
    } catch (e) {
      setRecording(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone blocked — allow mic access in the browser and reload."
          : "Could not start microphone.",
      );
    }
  }, [recording, listening, startRecorder]);

  const stopPushToTalk = useCallback(() => {
    if (!recording) return;
    stopAll();
  }, [recording, stopAll]);

  const toggleListening = useCallback(async () => {
    if (listening) {
      stopAll();
      return;
    }
    setError(null);
    setListening(true);
    listeningRef.current = true;
    try {
      await startRecorder();
    } catch (e) {
      setListening(false);
      listeningRef.current = false;
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone blocked — allow mic access in the browser and reload."
          : "Could not start microphone.",
      );
    }
  }, [listening, startRecorder, stopAll]);

  useEffect(() => stopAll, [stopAll]);

  return {
    recording,
    listening,
    level,
    transcribing,
    error,
    startPushToTalk,
    stopPushToTalk,
    toggleListening,
  };
}
