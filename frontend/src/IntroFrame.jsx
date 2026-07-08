import { useEffect, useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import elvisChart from "./assets/ELVIS-chart.png";
import Stack from '@mui/material/Stack';

export default function IntroFrame({ onDone }) {

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>Welcome to the Electronic Likeness, Voice, & Interview Synthesizer (ELVIS)</Typography>

      <Typography variant="h6" gutterBottom sx={{ mb: "40px" }}>

      <strong>Welcome to the world of ELVIS</strong> — your pocket-sized AI super-studio! Together, we’re going to turn your snapshot into a fully animated, comic-book adventure. I’ll ask you a few quick questions, snap a photo, and bring your hero’s journey to life with custom animation and an original song written just for you.
      <br />
      <br />
      Tap “Continue” to let my tricks loose, and I'll hand you a downloadable masterpiece you can share with your friends. Ready to see what a tiny DGX Spark can do? Let’s make some magic!
      </Typography>
      <img src={elvisChart} style={{ width: '640px'}} />
      <button onClick={onDone} style={{ fontSize: '36px' }}>Continue</button>
    </Stack>
  );
}
