import { useEffect, useMemo, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import {QRCodeSVG} from 'qrcode.react';
import elvisLogo from "./assets/ELVIS.png";
import CircularProgress from "@mui/material/CircularProgress";

export default function DownloadFrame({ onDone }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const response = await fetch("/api/download_filename", { cache: "no-store" });
        const result = await response.json();

        if (result && result.download_filename != null) {
          setData(result.download_filename);
          setLoading(false);
          console.log(result.download_filename);
        } else {
          console.log("Condition not met, exiting");
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
    }
  }, [loading]);
  
  return (
    <Stack 
      direction="column"
      spacing={4}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>Download Montage & Reset App</Typography>

      {!loading && (
      <Typography variant="h6" sx={{ opacity: 0.8 }}>
        If you'd like to download a copy of the video, scan the QR code below.<br />Don't click RESET until you have downloaded the video.
      </Typography>
      )}
      {loading && <CircularProgress size={64} sx={{ color: 'white' }} />}
      {!loading && (
        <div style={{backgroundColor: 'white', padding: '10px'}}>
          <QRCodeSVG
            value={"https://storage.googleapis.com/elvis-webapp-dgx-spark/" + data}
            title={"ELVIS Video Download"}
            size={228}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"L"}
            imageSettings={{
              src: elvisLogo,
              x: undefined,
              y: undefined,
              height: 54,
              width: 54,
              opacity: 1,
              excavate: true,
            }}
          />
        </div>
      )}
      {!loading && (
      <Typography variant="body1" sx={{ opacity: 0.8 }}>
        Everything we've done will be deleted when you click "RESET"
      </Typography>  
      )}
      <div>
        <button onClick={onDone} style={{ fontSize: '36px' }}>Reset</button>
      </div>
      
    </Stack>
  );
}
