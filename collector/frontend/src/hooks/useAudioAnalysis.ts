// ============================================================
// useAudioAnalysis — Web Audio API for waveform & VU meter
// ============================================================

import { useRef, useCallback, useEffect } from 'react';

interface AudioAnalysis {
  connectStream: (stream: MediaStream) => void;
  disconnect: () => void;
  getWaveformData: () => Float32Array;
  getFrequencyData: () => Uint8Array;
  getVolumeLevel: () => number;      // 0–1 normalized
  getVolumeLevelDb: () => number;    // dB
}

export function useAudioAnalysis(): AudioAnalysis {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const connectStream = useCallback((stream: MediaStream) => {
    // Clean up any previous context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    // Don't connect to destination — we don't want to hear ourselves

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const getWaveformData = useCallback((): Float32Array => {
    const analyser = analyserRef.current;
    if (!analyser) return new Float32Array(0);

    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    return data;
  }, []);

  const getFrequencyData = useCallback((): Uint8Array => {
    const analyser = analyserRef.current;
    if (!analyser) return new Uint8Array(0);

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }, []);

  const getVolumeLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;

    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);

    // Compute RMS
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    // Normalize to 0–1 (RMS of a full-scale signal is ~0.707)
    return Math.min(1, rms / 0.5);
  }, []);

  const getVolumeLevelDb = useCallback((): number => {
    const level = getVolumeLevel();
    if (level === 0) return -Infinity;
    return 20 * Math.log10(level);
  }, [getVolumeLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectStream,
    disconnect,
    getWaveformData,
    getFrequencyData,
    getVolumeLevel,
    getVolumeLevelDb,
  };
}
