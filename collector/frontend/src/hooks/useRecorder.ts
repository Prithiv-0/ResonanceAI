// ============================================================
// useRecorder — MediaRecorder wrapper for audio capture
// ============================================================

import { useState, useRef, useCallback } from 'react';

interface RecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  error: string | null;
}

interface RecorderControls extends RecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  stream: MediaStream | null;
}

export function useRecorder(): RecorderControls {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - startTimeRef.current) / 1000;

        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
          duration: Math.round(duration * 10) / 10,
        }));

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      recorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();

      // Update duration every 100ms
      timerRef.current = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.round((Date.now() - startTimeRef.current) / 100) / 10,
        }));
      }, 100);

      setState({
        isRecording: true,
        audioBlob: null,
        audioUrl: null,
        duration: 0,
        error: null,
      });
    } catch (err) {
      let errorMsg = 'Failed to access microphone.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Microphone access was denied. Please allow microphone access in your browser settings and reload.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No microphone found. Please connect a microphone and try again.';
        }
      }
      setState((prev) => ({ ...prev, error: errorMsg }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // Don't stop the stream tracks here — we need them for the VU meter
    // They'll be stopped when starting a new recording or on cleanup
  }, []);

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState((prev) => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      duration: 0,
    }));
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    clearRecording,
    stream: streamRef.current,
  };
}
