import { useCallback, useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import { useJobStatus } from "./useJobStatus";
import CircleIcon from '@mui/icons-material/Circle';
import AlarmIcon from '@mui/icons-material/Alarm';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

// Map step keys to their result-fetching config.
// Steps without a dedicated API endpoint show a generic message.
const RESULT_CONFIG = {
  generate_lyrics: {
    endpoint: "/api/lyrics",
    extract: (json) => ({ type: "lyrics", data: json.lyrics }),
  },
  generate_song: {
    endpoint: "/api/song",
    extract: (json) => ({ type: "song", data: json.song }),
  },
  generate_video: {
    endpoint: "/api/video",
    extract: (json) => ({ type: "video", data: json.video }),
  },
  generate_transcripts: {
    endpoint: "/api/interview_details",
    extract: (json) => ({ type: "interview", data: json.interview }),
  },
  generate_storyboard: {
    endpoint: "/api/storyboard_details",
    extract: (json) => ({ type: "storyboard", data: json.storyboard }),
  },
  generate_photos: {
    endpoint: "/api/photo_details",
    extract: (json) => ({ type: "photo", data: json.photo }),
  },
};

export default function MyStepper() {
  const steps = [
    { label: "Interview", key: "generate_transcripts" },
    { label: "Storyboard", key: "generate_storyboard" },
    { label: "Lyrics", key: "generate_lyrics" },         
    { label: "Song", key: "generate_song" },             
    { label: "Photos", key: "generate_photos" },
    // { label: "Voice", key: "generate_voice" },           
    { label: "Montage", key: "generate_video" },         
  ];

  // Poll job-status ONLY in production (and only after stepper starts)
  const { jobs } = useJobStatus({
    enabled: true,
    intervalMs: 1000,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(null);   // { label, key }
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResult, setModalResult] = useState(null); // { type, data } | null
  const [modalError, setModalError] = useState(null);

  // Track if the interview step has been clicked
  const [interviewClicked, setInterviewClicked] = useState(false);

  const handleClickCompleted = useCallback(async (step) => {
    // Mark the interview step as clicked if it's the interview
    if (step.key === "generate_transcripts") {
      setInterviewClicked(true);
    }

    setModalStep(step);
    setModalOpen(true);
    setModalResult(null);
    setModalError(null);

    const config = RESULT_CONFIG[step.key];
    if (!config) {
      // No endpoint for this step — show generic message
      setModalLoading(false);
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch(config.endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const result = config.extract(json);
      if (result.data == null) {
        setModalError("Result not available yet.");
      } else {
        setModalResult(result);
      }
    } catch (err) {
      setModalError(err.message || "Failed to load result.");
    } finally {
      setModalLoading(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setModalStep(null);
    setModalResult(null);
    setModalError(null);
    setModalLoading(false);
  }, []);

  // Build the audio/video src strings only when needed
  const audioSrc = useMemo(() => {
    if (modalResult?.type !== "song" || !modalResult.data) return "";
    return `data:audio/mpeg;base64,${modalResult.data}`;
  }, [modalResult]);

  const videoSrc = useMemo(() => {
    if (modalResult?.type !== "video" || !modalResult.data) return "";
    return `data:video/mp4;base64,${modalResult.data}`;
  }, [modalResult]);

  return (
    <div style={{ width: '80%', margin: '0 auto', paddingTop: '20px', paddingBottom: '30px'}}>
      <hr style={{ border: '1px solid #555' }}/>
      <Typography variant="h6">
        ~ Tasks ~
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {steps.map((step) => (
            <Stack key={step.key} direction="column" alignItems="center" spacing={1}>
              { jobs?.[step['key']] == "QUEUED" && (
                <AlarmIcon color="disabled" sx={{ fontSize: 60 }} />
              )}
              { jobs?.[step['key']] == "PROCESSING" && (
                <PlayCircleIcon color="success" sx={{ fontSize: 60 }} />
              )}
              { jobs?.[step['key']] == "COMPLETED" && (
                step.key === "generate_transcripts" ? (
                  <Tooltip 
                    title="Click me to get more details!"
                    arrow
                    placement="top"
                    open={!interviewClicked}
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: 'primary.main',
                          fontSize: '1.25rem',
                          '& .MuiTooltip-arrow': {
                            color: 'primary.main',
                          },
                        },
                      },
                    }}
                  >
                    <CheckCircleIcon
                      color="success"
                      sx={{ fontSize: 60, cursor: "pointer" }}
                      onClick={() => handleClickCompleted(step)}
                    />
                  </Tooltip>
                ) : (
                  <CheckCircleIcon
                    color="success"
                    sx={{ fontSize: 60, cursor: "pointer" }}
                    onClick={() => handleClickCompleted(step)}
                  />
                )
              )}
              { (jobs?.[step['key']] == null) && (
                <CircleIcon color="disabled" sx={{ fontSize: 60 }} />
              )}
              <Typography variant="body1">
                {step.label}
              </Typography>
            </Stack>
        ))}
      </Stack>

      {/* Result modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="100"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {modalStep?.label}
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon sx={{ fontSize: 40 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ fontSize: 20 }}>
          {modalLoading && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={64} />
              <Typography sx={{ mt: 2 }}>Loading result...</Typography>
            </Stack>
          )}

          {modalError && (
            <Typography color="error">{modalError}</Typography>
          )}

          {/* Generic completed message for steps without endpoints */}
          {!modalLoading && !modalError && !modalResult && (
            <Typography>
              This step has been completed successfully.
            </Typography>
          )}

          {modalResult?.type === "lyrics" && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                maxHeight: "60vh",
                overflowY: "auto",
                margin: 0,
              }}
            >
              With the storyboard text, I generated these lyrics to a song about your quest.
              I used the <strong>Gemma3</strong> model to generate them.<br /><br />
		          {modalResult.data}
            </pre>
          )}

          {modalResult?.type === "interview" && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                maxHeight: "60vh",
                overflowY: "auto",
                margin: 0,
              }}
            >
              In order for me to understand what you said in the interview, I need the recorded audio to be converted to text.
              The way I convert it to text is by using the <strong>whisper</strong> automatic speech recognition (ASR) model.<br /><br />
              For the question regarding your chosen profession I heard:<br />
              <strong>{modalResult.data.generated_transcript_audio2}</strong><br /><br />
              For the question regarding your ideal vacation I heard:<br />
              <strong>{modalResult.data.generated_transcript_audio1}</strong><br /><br />
              This is the object I decided you'll seek during your quest:<br />
              <strong>{modalResult.data.user_object}</strong><br /><br />
              This is the location of the vacation I chose:<br />
              <strong>{modalResult.data.user_location}</strong>
            </pre>
          )}

          {modalResult?.type === "storyboard" && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                maxHeight: "60vh",
                overflowY: "scroll",
                margin: 0,
              }}
            >
              Now that I know what object you will be seeking during your quest and the location where the quest will conclude,
              I can now create a 10 frame storyboard for your quest. When generating the image for each frame, I have found
              that providing your description helps keep the images looking more like you.<br /><br />
              I used the vision capabilities of the <strong>Gemma3</strong> model to get your description:<br />
              <strong>{modalResult.data.user_description}</strong><br /><br />
              I used the <strong>Gemma3</strong> model to generate these descriptions that will be used to generate the images of your quest:<br /><br />
              <strong>Storyboard Frame 1:</strong><br />{modalResult.data.user_storyboard_frame_1}<br /><br />
              <strong>Storyboard Frame 2:</strong><br />{modalResult.data.user_storyboard_frame_2}<br /><br />
              <strong>Storyboard Frame 3:</strong><br />{modalResult.data.user_storyboard_frame_3}<br /><br />
              <strong>Storyboard Frame 4:</strong><br />{modalResult.data.user_storyboard_frame_4}<br /><br />
              <strong>Storyboard Frame 5:</strong><br />{modalResult.data.user_storyboard_frame_5}<br /><br />
              <strong>Storyboard Frame 6:</strong><br />{modalResult.data.user_storyboard_frame_6}<br /><br />
              <strong>Storyboard Frame 7:</strong><br />{modalResult.data.user_storyboard_frame_7}<br /><br />
              <strong>Storyboard Frame 8:</strong><br />{modalResult.data.user_storyboard_frame_8}<br /><br />
              <strong>Storyboard Frame 9:</strong><br />{modalResult.data.user_storyboard_frame_9}<br /><br />
              <strong>Storyboard Frame 10:</strong><br />{modalResult.data.user_storyboard_frame_10}<br /><br />
            </pre>
          )}

          {modalResult?.type === "photo" && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                maxHeight: "60vh",
                overflowY: "scroll",
                margin: 0,
              }}
            >
              To generate the images in the storyboard, I used the <strong>FLUX.2-klein-4B</strong> model. 
              This model takes the photo I took of you as input, and a text description for the image it generates.
              It tries to retain your likeness in the images it generates.
              <br />
              <br />
              <strong>Here is the original photo I took of you:</strong><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.user_photo}`} /><br />
              <br />
              <strong>Here are the generated images and the descriptions used to generate them:</strong>
              <br /><br />
              <img src={`data:image/jpeg;base64,${modalResult.data.generated_photo_1}`} /><br />
              {modalResult.data.user_storyboard_frame_1}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_2}`} /><br />
              {modalResult.data.user_storyboard_frame_2}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_3}`} /><br />
              {modalResult.data.user_storyboard_frame_3}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_4}`} /><br />
              {modalResult.data.user_storyboard_frame_4}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_5}`} /><br />
              {modalResult.data.user_storyboard_frame_5}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_6}`} /><br />
              {modalResult.data.user_storyboard_frame_6}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_7}`} /><br />
              {modalResult.data.user_storyboard_frame_7}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_8}`} /><br />
              {modalResult.data.user_storyboard_frame_8}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_9}`} /><br />
              {modalResult.data.user_storyboard_frame_9}
              <br /><br /><br />
              <img src={`data:image/png;base64,${modalResult.data.generated_photo_10}`} /><br />
              {modalResult.data.user_storyboard_frame_10}
            </pre>
          )}

          {/* Audio result (song) */}
          {modalResult?.type === "song" && (
            <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  margin: 0,
                }}
              >
                With the previously generated lyrics, I used the <strong>ACE-Step</strong> model to create a 60 second song.
              </pre>
              <audio controls preload="none" src={audioSrc} style={{ width: "45%", transform: "scale(2)"}} />
              <br />
            </Stack>
          )}

          {/* Video result (montage) */}
          {modalResult?.type === "video" && (
            <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  maxHeight: "60vh",
                  overflowY: "auto",
                  margin: 0,
                }}
              >
                With the song and images generated, I used <strong>ffmpeg</strong> to bring them together to form this video montage.
              </pre>
              {/* <video controls preload="none" src={videoSrc} style={{ width: "100%", maxHeight: "60vh" }} /> */}
              <video
                controls
                src={videoSrc}
                style={{ maxWidth: "720px", width: "50%", borderRadius: 12}}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <button onClick={handleCloseModal} style={{ fontSize: "20px", padding: "8px 24px" }}>
            Close
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
