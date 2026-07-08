import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';

export const WebcamCapture = ({
  apiEndpoint = '/api/photo',
  onSuccess,
  onError
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [state, setState] = useState('streaming');
  const [countdownValue, setCountdownValue] = useState(3);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setState('error');
        setErrorMessage('Failed to access camera');
        onError?.(err instanceof Error ? err : new Error('Camera access failed'));
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }
    };
  }, []);

  // Handle countdown
  useEffect(() => {
    if (state !== 'countdown') return;

    if (countdownValue === 0) {
      capturePhoto();
      return;
    }

    const timer = setTimeout(() => {
      setCountdownValue((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, countdownValue]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedUrl(URL.createObjectURL(blob));
          setState('preview');
        }
      },
      'image/png',
      0.5
    );
  }, []);

  const startCountdown = () => {
    setCountdownValue(3);
    setState('countdown');
  };

  const retake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedBlob(null);
    setCapturedUrl(null);
    setState('streaming');
  };

  const uploadPhoto = async () => {
    if (!capturedBlob) return;

    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, 'photo.png');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      setState('success');
      onSuccess?.();
    } catch (err) {
      setState('error');
      const error = err instanceof Error ? err : new Error('Upload failed');
      setErrorMessage(error.message);
      onError?.(error);
    }
  };

  const handleTryAgain = () => {
    setErrorMessage('');
    retake();
  };

  const showVideo = state === 'streaming' || state === 'countdown';
  const showCapturedImage = state === 'preview' || state === 'uploading' || state === 'success';

  return (
    <Stack 
      direction="column"
      spacing={4}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>Photobooth</Typography>

      {/* Video / Image Display */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          aspectRatio: '4/3',
          backgroundColor: 'black',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: showVideo ? 'block' : 'none',
          }}
        />

        {showCapturedImage && capturedUrl && (
          <img
            src={capturedUrl}
            alt="Captured photo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Countdown Overlay */}
        {state === 'countdown' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <Typography
              variant="h1"
              sx={{
                color: 'white',
                fontSize: '8rem',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {countdownValue}
            </Typography>
          </Box>
        )}

        {/* Uploading Overlay */}
        {state === 'uploading' && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <CircularProgress size={64} sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Controls */}
      <Stack spacing={2} alignItems="center">
        {state === 'streaming' && (
          <button onClick={startCountdown} style={{ fontSize: '36px' }}>
            Take Photo
          </button>
        )}

        {state === 'preview' && (
          <>
            <Typography variant='h4'>Happy with the photo?</Typography>
            <Stack direction="row" spacing={2}>
              <button variant="outlined" onClick={retake} style={{ fontSize: '36px' }}>
                <ReplayIcon /> Retake
              </button>
              <button variant="contained" onClick={uploadPhoto} style={{ fontSize: '36px' }}>
                Continue
              </button>
            </Stack>
          </>
        )}

        {state === 'success' && (
          <Alert severity="success">Photo uploaded successfully!</Alert>
        )}

        {state === 'error' && (
          <>
            <Alert severity="error">{errorMessage}</Alert>
            <button variant="outlined" onClick={handleTryAgain}>
              Try Again
            </button>
          </>
        )}
      </Stack>
    </Stack>
  );
};