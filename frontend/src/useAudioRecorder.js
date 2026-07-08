// useAudioRecorder.js
import { useEffect, useRef, useState } from "react";

function generateId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export function useAudioRecorder({ mimeType = "audio/webm" } = {}) {
  const [status, setStatus] = useState("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordings, setRecordings] = useState([]);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);

  const timerIntervalRef = useRef(null);
  const startTimestampRef = useRef(null);
  const accumulatedMsRef = useRef(0);

  // --- timer helpers ---
  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    startTimestampRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const base = accumulatedMsRef.current;
      const current = startTimestampRef.current
        ? Date.now() - startTimestampRef.current
        : 0;
      setElapsedMs(base + current);
    }, 200);
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (startTimestampRef.current != null) {
      accumulatedMsRef.current += Date.now() - startTimestampRef.current;
      startTimestampRef.current = null;
    }
  };

  const resetTimer = () => {
    pauseTimer();
    accumulatedMsRef.current = 0;
    startTimestampRef.current = null;
    setElapsedMs(0);
  };

  // --- main controls ---
  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("getUserMedia is not supported in this browser.");
        return;
      }

      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        const id = generateId();
        const url = URL.createObjectURL(blob);
        const createdAt = new Date();

        setRecordings((prev) => [{ id, url, blob, createdAt }, ...prev]);
      };

      mediaRecorderRef.current = recorder;
      accumulatedMsRef.current = 0;
      setIsPaused(false);
      setStatus("recording");
      recorder.start();
      startTimer();
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Unable to start recording. Check mic permissions / HTTPS.");
    }
  };

  const pause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    setIsPaused(true);
    setStatus("paused");
    pauseTimer();
  };

  const resume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    setIsPaused(false);
    setStatus("recording");
    startTimer();
  };

  const togglePause = () => {
    if (status === "idle") return;
    if (isPaused) resume();
    else pause();
  };

  const stop = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    setIsPaused(false);
    setStatus("idle");
    resetTimer();
  };

  const reset = () => {
    // Just reset timer and status; recordings are preserved.
    stop();
    setRecordings([]);
  };

  const formattedTime = formatTime(elapsedMs);

  // --- cleanup on unmount ---
  useEffect(() => {
    return () => {
      // stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // stop recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      // stop tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // revoke object URLs
      recordings.forEach((r) => URL.revokeObjectURL(r.url));
    };
    // we intentionally *don't* include recordings in deps,
    // so this runs once with the final value on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isPaused,
    elapsedMs,
    formattedTime,
    recordings,
    start,
    pause,
    resume,
    togglePause,
    stop,
    reset,
  };
}
