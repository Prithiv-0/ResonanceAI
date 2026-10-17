// ============================================================
// WaveformVisualizer — Canvas-based waveform display
// ============================================================

import { useRef, useEffect, useCallback } from 'react';

interface Props {
  /** Provide getWaveformData for live mode (during recording) */
  getWaveformData?: () => Float32Array;
  /** Provide audioUrl for static mode (after recording) */
  audioUrl?: string | null;
  /** Whether actively recording (enables animation loop) */
  isRecording?: boolean;
  /** Height in pixels */
  height?: number;
}

export default function WaveformVisualizer({
  getWaveformData,
  audioUrl,
  isRecording = false,
  height = 120,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const drawLive = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !getWaveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = getWaveformData();
    const width = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, width, h);

    // Draw center line
    ctx.strokeStyle = 'rgba(61, 90, 128, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    if (data.length === 0) return;

    // Draw waveform
    ctx.strokeStyle = '#3D5A80';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const y = (v + 1) / 2 * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    if (isRecording) {
      animFrameRef.current = requestAnimationFrame(drawLive);
    }
  }, [getWaveformData, isRecording]);

  // Live drawing loop
  useEffect(() => {
    if (isRecording && getWaveformData) {
      animFrameRef.current = requestAnimationFrame(drawLive);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, drawLive, getWaveformData]);

  // Static waveform from audioUrl
  useEffect(() => {
    if (!audioUrl || isRecording) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new AudioContext();

    fetch(audioUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => audioContext.decodeAudioData(buf))
      .then((audioBuffer) => {
        const rawData = audioBuffer.getChannelData(0);
        const width = canvas.width;
        const h = canvas.height;
        const samples = width;
        const blockSize = Math.floor(rawData.length / samples);

        ctx.clearRect(0, 0, width, h);

        // Draw center line
        ctx.strokeStyle = 'rgba(61, 90, 128, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();

        // Draw bars
        ctx.fillStyle = '#3D5A80';
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j] || 0);
          }
          const avg = sum / blockSize;
          const barHeight = avg * h * 0.8;
          ctx.fillRect(i, (h - barHeight) / 2, 1, barHeight);
        }
      })
      .catch(() => {
        // Silently handle decode errors
      })
      .finally(() => {
        audioContext.close();
      });
  }, [audioUrl, isRecording]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}
