"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { transcribeAudio } from "@/lib/api";

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

/**
 * Microphone capture with two modes:
 *  - push-to-talk: hold to record, release to transcribe
 *  - always-listening: silence detection auto-segments continuous speech
 *
 * Each speech segment gets its own recorder + its own chunk buffer, so
 * segmentation works repeatedly (no shared-buffer races).
 */
export function useVoice(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mimeRef = useRef<string>("");
  const rafRef = useRef<number>(0);
  const lastVoiceRef = useRef<number>(0);
  const spokeRef = useRef(false);
  const listeningRef = useRef(false);

  const transcribeChunks = useCallback(
    async (chunks: Blob[]) => {
      const blob = new Blob(chunks, { type: mimeRef.current || "audio/webm" });
      if (blob.size < 1200) return; // ignore clicks / micro-noise
      setTranscribing(true);
      try {
        const text = await transcribeAudio(blob);
        if (text) {
          setError(null);
          onTranscript(text);
        }
      } catch {
        setError("Transcription failed — is the backend running?");
      } finally {
        setTranscribing(false);
      }
    },
    [onTranscript],
  );

  /** Create + start a fresh recorder that owns its own chunk buffer. */
  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const rec = mimeRef.current
      ? new MediaRecorder(stream, { mimeType: mimeRef.current })
      : new MediaRecorder(stream);
    const localChunks: Blob[] = [];
    recorderRef.current = rec;
    rec.ondataavailable = (e) => e.data.size > 0 && localChunks.push(e.data);
    rec.onstop = () => void transcribeChunks(localChunks);
    rec.start(250);
  }, [transcribeChunks]);

  const openMic = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone not available in this browser.");
    }
    mimeRef.current = pickMimeType();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    startSegment();

    // live input level + silence detection for always-listening mode
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    lastVoiceRef.current = performance.now();
    spokeRef.current = false;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += (v - 128) ** 2;
      const rms = Math.sqrt(sum / data.length) / 128;
      setLevel(rms);

      if (listeningRef.current) {
        const now = performance.now();
        if (rms > 0.045) {
          spokeRef.current = true;
          lastVoiceRef.current = now;
        } else if (spokeRef.current && now - lastVoiceRef.current > 1100) {
          // end of an utterance → close this segment and open the next
          spokeRef.current = false;
          const rec = recorderRef.current;
          if (rec && rec.state !== "inactive") rec.stop(); // fires transcribe
          setTimeout(() => {
            if (listeningRef.current) startSegment();
          }, 60);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [startSegment]);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void audioCtxRef.current?.close().catch(() => undefined);
    recorderRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    setRecording(false);
    setListening(false);
    listeningRef.current = false;
    setLevel(0);
  }, []);

  const micErr = (e: unknown) =>
    e instanceof DOMException && e.name === "NotAllowedError"
      ? "Microphone blocked — allow mic access in the browser and reload."
      : "Could not start microphone.";

  const startPushToTalk = useCallback(async () => {
    if (recording || listening) return;
    setError(null);
    setRecording(true);
    try {
      await openMic();
    } catch (e) {
      setRecording(false);
      setError(micErr(e));
    }
  }, [recording, listening, openMic]);

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
      await openMic();
    } catch (e) {
      setListening(false);
      listeningRef.current = false;
      setError(micErr(e));
    }
  }, [listening, openMic, stopAll]);

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
