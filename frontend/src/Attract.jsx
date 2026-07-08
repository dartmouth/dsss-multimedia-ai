import elvisLogo from './assets/ELVIS.png'
import Stack from "@mui/material/Stack" 

function Attract({onDone}){
      return (
        <Stack direction="column"
          spacing={2}
          sx={{
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img src={elvisLogo} height={700} alt="React logo" />
          <button onClick={onDone} style={{ fontSize: '36px' }}>Get Started!</button>
        </Stack>
      )
    }

export default Attract