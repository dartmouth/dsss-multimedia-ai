import { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

export default function LyricsFrame({ onDone }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const POLLING_INTERVAL = 2000; // Poll every 2 seconds
  const [err, setErr] = useState("");

  const fetchData = async () => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch("/api/lyrics", { cache: "no-store" });
      const result = await response.json();

      // Check if the result meets the desired condition
      if (result && result.lyrics != null) {
        setData(result.lyrics);
        setLoading(false); // Stop polling
      } else {
        console.log('Condition not met, polling again...');
      }
    } catch (error) {
      console.error('API call failed:', error);
      // Handle error, perhaps stop polling on specific errors
    }
  }

  useEffect(() => {
    let intervalId;

    if (loading) {
      // Start polling
      intervalId = setInterval(() => {
        fetchData();
      }, POLLING_INTERVAL);
    }

    // Cleanup function to stop polling when the component unmounts
    // or when the condition is met
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loading]); // Re-run effect if hasDesiredResult changes

  return (
    <Stack 
      direction="column"
      spacing={4}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>Song Lyrics</Typography>

      {loading && <Typography variant="h6">Please wait while your lyrics are generated...</Typography>}
      {loading && <CircularProgress />}
      {err && <Typography color="error">{err}</Typography>}

      {!loading && (
        <>
          {/* <Typography variant="body1" gutterBottom sx={{ mb: "16px" }}>
            Here are the Lyrics.
          </Typography> */}
          <pre
            style={{
              whiteSpace: "pre-wrap",
              padding: 16,
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              maxWidth: 800,
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            {data}
          </pre>
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <button onClick={onDone} disabled={ loading } style={{ fontSize: '36px' }}>
          Continue
        </button>
      </div>
    </Stack>
  );
}
