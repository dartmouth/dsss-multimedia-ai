import React, { useEffect, useMemo, useState } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";


function Recorder({ onSuccess, onError }) {
  const [phase, setPhase] = useState("intro");
  // intro | recordingQ1 | readyQ2 | recordingQ2 | uploading | error

  const [uploadError, setUploadError] = useState("");

  const { status, formattedTime, recordings, start, togglePause, stop } =
    useAudioRecorder();

  const questions = useMemo(
    () => [
      "If you could run away to a simpler time and take up a slow, quiet profession working with your hands, what would you do?",
      "What would be your ideal vacation?",
    ],
    []
  );

  const questionIndex =
    phase === "readyQ2" || phase === "recordingQ2" || phase === "uploading"
      ? 1
      : 0;

  const currentQuestion = questions[questionIndex];

  const startQ1 = async () => {
    setUploadError("");
    setPhase("recordingQ1");
    await start();
  };

  const stopQ1 = async () => {
    await stop();
    setPhase("readyQ2");
  };

  const startQ2 = async () => {
    setUploadError("");
    setPhase("recordingQ2");
    await start();
  };

  const stopQ2 = async () => {
    await stop();
    setPhase("uploading");
  };

  const uploadBothRecordings = async () => {
    try {
      setUploadError("");

      if (recordings.length < 2) {
        throw new Error(
          `Expected 2 recordings but found ${recordings.length}.`
        );
      }

      // Use the first two recordings
      const [rec1, rec2] = recordings.slice(0, 2);

      const blob1 = await fetch(rec1.url).then((res) => res.blob());
      const blob2 = await fetch(rec2.url).then((res) => res.blob());

      const formData = new FormData();
      formData.append("file1", blob1, "audio1.mp3");
      formData.append("file2", blob2, "audio2.mp3");

      const response = await fetch("/api/audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to upload audio");
      }

      // ✅ Auto-advance ONLY after successful upload
      onSuccess?.();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      setPhase("error");
      onError?.(err);
    }
  };

  // When phase becomes uploading, wait until we actually have both recordings then upload.
  useEffect(() => {
    if (phase !== "uploading") return;
    if (recordings.length < 2) return;

    uploadBothRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recordings.length]);

  const retryUpload = () => {
    setUploadError("");
    setPhase("uploading");
  };

  return (
    <Stack 
      direction="column"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >

      <Typography variant="h4" gutterBottom>Interview</Typography>

      <Typography variant="h4" gutterBottom>{currentQuestion}</Typography>

      <p>
        Status: <strong>{status}</strong> • Time:{" "}
        <strong>{formattedTime}</strong>
      </p>

      {phase === "intro" && (
        <button onClick={startQ1} style={{ fontSize: '36px' }}>Record my Answer</button>
      )}

      {phase === "recordingQ1" && (
        <div style={{ display: "flex", columnGap: "0.5rem" }}>
          <button onClick={togglePause} style={{ fontSize: '36px' }} disabled={status === "idle"}>
            {status === "paused" ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button onClick={stopQ1} style={{ fontSize: '36px' }} disabled={status === "idle"}>
            ⏹ I'm done
          </button>
        </div>
      )}

      {phase === "readyQ2" && (
        <button onClick={startQ2} style={{ fontSize: '36px' }}>Record my Answer</button>
      )}

      {phase === "recordingQ2" && (
        <div style={{ display: "flex", columnGap: "0.5rem" }}>
          <button onClick={togglePause} style={{ fontSize: '36px' }} disabled={status === "idle"}>
            {status === "paused" ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button onClick={stopQ2} style={{ fontSize: '36px' }} disabled={status === "idle"}>
            ⏹ I'm done
          </button>
        </div>
      )}

      {phase === "uploading" && (
        <p>Uploading both recordings… (you will advance automatically)</p>
      )}

      {phase === "error" && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "red" }}>{uploadError}</p>
          <button onClick={retryUpload} style={{ fontSize: '36px' }}>Retry upload</button>
        </div>
      )}

      {/* <h2>Recordings</h2>
      {recordings.length === 0 && <p>No recordings yet.</p>}
      {recordings.map((rec) => (
        <div key={rec.id} style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.8rem" }}>
            <strong>{rec.id}</strong> • {rec.createdAt.toLocaleTimeString()}
          </div>
          <audio controls src={rec.url} />
        </div>
      ))} */}
    </Stack>
  );
}

export default Recorder;
