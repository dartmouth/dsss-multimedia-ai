import { useEffect, useMemo, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

export default function MontageFrame({ onDone }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const POLLING_INTERVAL = 1000;
  const [err, setErr] = useState("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const response = await fetch("/api/video", { cache: "no-store" });
        const result = await response.json();

        if (result && result.video != null) {
          setData(result.video);
          setLoading(false);
        } else {
          console.log("Condition not met, polling again...");
        }
      } catch (error) {
        console.error("API call failed:", error);
        setErr("Failed to fetch video. Retrying...");
      } finally {
        isFetchingRef.current = false;
      }
    };

    if (loading) {
      fetchData();
      intervalId = setInterval(fetchData, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loading]);

  const videoSrc = useMemo(() => {
    if (!data) return "";
    return `data:video/mp4;base64,${data}`;
  }, [data]);

  return (
    <Stack
      direction="column"
      spacing={4}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Montage
      </Typography>

      {loading && (
        <Typography variant="h6">
          Please wait while your video is generated...
        </Typography>
      )}
      {loading && <CircularProgress size={64} sx={{ color: "white" }} />}
      {err && <Typography color="error">{err}</Typography>}

      {!loading && (
        <div>
          <video
            controls
            src={videoSrc}
            // style={{ maxWidth: "720px", width: "50%", borderRadius: 12, transform: "scale(2)" }}
          />
        </div>
      )}

      <div>
        <button
          onClick={onDone}
          disabled={loading}
          style={{ fontSize: "36px" }}
        >
          Continue
        </button>
      </div>
    </Stack>
  );
}
