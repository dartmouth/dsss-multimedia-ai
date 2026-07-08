import { useEffect, useMemo, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

export default function SongFrame({ onDone }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const POLLING_INTERVAL = 1000; // Poll every 2 seconds
  const [err, setErr] = useState("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      if (isFetchingRef.current) return; // Prevent concurrent requests
      isFetchingRef.current = true;
      try {
        const response = await fetch("/api/song", { cache: "no-store" });
        const result = await response.json();

        if (result && result.song != null) {
          setData(result.song);
          setLoading(false);
          clearInterval(intervalId);
        } else {
          console.log('Condition not met, polling again...');
        }
      } catch (error) {
        console.error('API call failed:', error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    if (loading) {
      fetchData(); // Fire immediately on mount
      intervalId = setInterval(fetchData, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loading]);

  const audioSrc = useMemo(() => {
    if (!data) return "";
    return `data:audio/mpeg;base64,${data}`;
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
      <Typography variant="h4" gutterBottom>Listen to the song</Typography>

      {loading && <Typography variant="h6">Please wait while your song is generated...</Typography>}
      {loading && <CircularProgress size={64} sx={{ color: 'white' }} />}
      {err && <Typography color="error">{err}</Typography>}

      {!loading && (
        <div>
          <audio controls preload="none" src={audioSrc}
            style={{ borderRadius: 12, transform: "scale(1.5)", }}
          />
          <Typography variant="body2" sx={{ opacity: 0.8, mt: '20px' }}>
            Tip: use the controls to play/pause and scrub.
          </Typography>  
        </div>
      )}

      <div>
        <button onClick={onDone} disabled={loading} style={{ fontSize: '36px' }}>
          Continue
        </button>
      </div>
    </Stack>
  );
}
