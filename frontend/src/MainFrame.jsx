import { useEffect, useMemo, useState } from "react";
import Elvis from "./Elvis";
import SystemResources from "./SystemResources";
import { Stepper, Step, StepLabel } from "@mui/material";
import Stack from "@mui/material/Stack";
import { WebcamCapture } from "./WebcamCapture";
import Recorder from "./Recorder";
import Attract from "./Attract";
import Typography from "@mui/material/Typography";
import LyricsFrame from "./LyricsFrame";
import IntroFrame from "./IntroFrame";
import SongFrame from "./SongFrame";
import MontageFrame from "./MontageFrame";
import DownloadFrame from "./DownloadFrame";
import MyStepper from "./MyStepper";
import PhotoIntro from "./PhotoIntro";

function MainFrame() {
  const [userTask, setCurrentUserTask] = useState(0);

  const resetApp = async () => {
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Reset failed: HTTP ${res.status}`);
      }
      console.log("Backend reset OK:", await res.json().catch(() => null));
    } catch (err) {
      console.error("Backend reset error:", err);
    } finally {
      setCurrentUserTask(0);
    }
  };

  // ---------- Screens ----------
  const tasks = [
    <Attract onDone={() => setCurrentUserTask(userTask + 1)} />,

    <IntroFrame onDone={() => setCurrentUserTask(userTask + 1)} />,

    <Recorder
      onSuccess={() => setCurrentUserTask(userTask + 1)}
      onError={(err) => console.error("Audio step failed:", err)}
    />,

    <PhotoIntro onDone={() => setCurrentUserTask(userTask + 1)} />,

    <WebcamCapture
      apiEndpoint="/api/photo"
      onSuccess={() => setCurrentUserTask(userTask + 1)}
      onError={(err) => console.error("Photo step failed:", err)}
    />,

    <LyricsFrame onDone={() => setCurrentUserTask(userTask + 1)} />,

    <SongFrame onDone={() => setCurrentUserTask(userTask + 1)} />,

    <MontageFrame onDone={() => setCurrentUserTask(userTask + 1)} />,

    // <DownloadFrame onDone={resetApp} />,
  ];

  if (userTask === 0) return <>{tasks[0]}</>;

  return (
    <Stack direction="column" spacing={0} sx={{ height: "100vh" }}>
      <div style={{ padding: "20px 20px 0px 20px", textAlign: "left" }}>
        <button onClick={resetApp} style={{ fontSize: "20px" }}>
          Reset App
        </button>
      </div>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: "stretch",
          height: "100%",
        }}
      >
        <Elvis />
        {tasks[userTask]}
        <SystemResources />
      </Stack>

      <MyStepper />
    </Stack>
  );
}

export default MainFrame;
