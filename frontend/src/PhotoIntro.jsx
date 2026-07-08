import { useEffect, useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from '@mui/material/Stack';

export default function PhotoIntro({ onDone }) {

  return (
    <Stack
      direction="column"
      spacing={10}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>Photobooth</Typography>

      <Typography variant="h4" gutterBottom sx={{ mb: "140px" }}>
        Ready for me to take your photo?
      </Typography>

      <button onClick={onDone} style={{ fontSize: '36px' }}>Continue</button>
    </Stack>
  );
}
