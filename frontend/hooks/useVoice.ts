"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { transcribeAudio } from "@/lib/api";

/**
 * Microphone capture with two modes:
 *  - push-to-talk: hold to record, release to transcribe
 *  - always-listening: silence detection auto-segments speech
 */
export function useVoice(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const silenceSinceRef = useRef<number>(0);
  const spokeRef = useRef(false);
  const listeningRef = useRef(false);

  const finishSegment = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 2000) return; // ignore micro-noises
    setTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      if (text) onTranscript(text);
    } catch {
      /* backend offline — swallow */
    } finally {
      setTranscribing(false);
    }
  }, [onTranscript]);

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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
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
              const r2 = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
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
    setRecording(true);
    try {
      await startRecorder();
    } catch {
      setRecording(false);
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
    setListening(true);
    listeningRef.current = true;
    try {
      await startRecorder();
    } catch {
      setListening(false);
      listeningRef.current = false;
    }
  }, [listening, startRecorder, stopAll]);

  useEffect(() => stopAll, [stopAll]);

  return { recording, listening, level, transcribing, startPushToTalk, stopPushToTalk, toggleListening };
}
