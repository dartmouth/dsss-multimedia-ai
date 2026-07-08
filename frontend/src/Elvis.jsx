import elvisLogo from "./assets/ELVIS.png";
import Stack from "@mui/material/Stack";

function Elvis() {
  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img src={elvisLogo} className="react logo" alt="React logo" />
    </Stack>
  );
}

export default Elvis;
