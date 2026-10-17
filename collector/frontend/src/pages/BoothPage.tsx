// ============================================================
// BoothPage — Main recording studio interface
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { Mic, Square, Play, RotateCcw, ArrowRight } from 'lucide-react';
import ScenarioCard from '../components/ScenarioCard';
import WaveformVisualizer from '../components/WaveformVisualizer';
import VUMeter from '../components/VUMeter';
import QualityIndicators from '../components/QualityIndicators';
import ProgressTracker from '../components/ProgressTracker';
import type { Scenario } from '../types';
import { useRecorder } from '../hooks/useRecorder';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';

interface Props {
  scenario: Scenario;
  completed: number;
  total: number;
  speakerId: string;
  onAccept: (scenarioId: string, audioBlob: Blob) => void;
  onSkip: () => void;
}

export default function BoothPage({ scenario, completed, total, speakerId, onAccept, onSkip }: Props) {
  const recorder = useRecorder();
  const analysis = useAudioAnalysis();
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const hasRecording = recorder.audioBlob !== null;

  // Connect audio analysis when recording starts
  useEffect(() => {
    if (recorder.isRecording && recorder.stream) {
      analysis.connectStream(recorder.stream);
    }
  }, [recorder.isRecording, recorder.stream, analysis]);

  const handleToggleRecord = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      recorder.clearRecording();
      await recorder.startRecording();
    }
  }, [recorder]);

  const handleRedo = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.pause();
    }
    recorder.clearRecording();
  }, [recorder]);

  const handlePlay = useCallback(() => {
    if (recorder.audioUrl && playbackRef.current) {
      playbackRef.current.src = recorder.audioUrl;
      playbackRef.current.play();
    }
  }, [recorder.audioUrl]);

  const handleAccept = useCallback(() => {
    if (recorder.audioBlob) {
      onAccept(scenario.id, recorder.audioBlob);
      recorder.clearRecording();
    }
  }, [recorder, scenario.id, onAccept]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleToggleRecord();
          break;
        case 'KeyR':
          e.preventDefault();
          handleRedo();
          break;
        case 'KeyP':
          e.preventDefault();
          if (hasRecording) handlePlay();
          break;
        case 'Enter':
          e.preventDefault();
          if (hasRecording && !recorder.isRecording) handleAccept();
          break;
        case 'KeyS':
          e.preventDefault();
          onSkip();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleToggleRecord, handleRedo, handlePlay, handleAccept, hasRecording, recorder.isRecording, onSkip]);

  return (
    <div className="booth-page">
      <audio ref={playbackRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div className="booth-topbar">
        <div className="booth-brand">RESONANCE <span className="booth-brand-sub">Studio Booth</span></div>
        <ProgressTracker completed={completed} total={total} speakerId={speakerId} />
      </div>

      {/* Main content */}
      <div className="booth-main">
        {/* Scenario */}
        <ScenarioCard scenario={scenario} />

        {/* Recording area */}
        <div className="booth-recorder">
          {/* Waveform */}
          <div className="booth-waveform-container">
            <WaveformVisualizer
              getWaveformData={analysis.getWaveformData}
              audioUrl={recorder.audioUrl}
              isRecording={recorder.isRecording}
              height={100}
            />
          </div>

          {/* VU Meter */}
          <VUMeter
            getVolumeLevel={analysis.getVolumeLevel}
            isActive={recorder.isRecording}
          />

          {/* Quality */}
          <QualityIndicators
            duration={recorder.duration}
            isRecording={recorder.isRecording}
          />

          {/* Error */}
          {recorder.error && (
            <div className="booth-error">{recorder.error}</div>
          )}

          {/* Controls */}
          <div className="booth-controls">
            <div className="booth-controls-main">
              <button
                className={`booth-btn booth-btn--record ${recorder.isRecording ? 'booth-btn--recording' : ''}`}
                onClick={handleToggleRecord}
                type="button"
              >
                {recorder.isRecording ? (
                  <><Square size={18} /> Stop</>
                ) : (
                  <><Mic size={18} /> Record</>
                )}
                <kbd>Space</kbd>
              </button>

              <button
                className="booth-btn booth-btn--secondary"
                onClick={handlePlay}
                disabled={!hasRecording || recorder.isRecording}
                type="button"
              >
                <Play size={16} /> Play
                <kbd>P</kbd>
              </button>

              <button
                className="booth-btn booth-btn--secondary"
                onClick={handleRedo}
                disabled={recorder.isRecording && !hasRecording}
                type="button"
              >
                <RotateCcw size={16} /> Redo
                <kbd>R</kbd>
              </button>
            </div>

            <button
              className="booth-btn booth-btn--primary"
              onClick={handleAccept}
              disabled={!hasRecording || recorder.isRecording}
              type="button"
            >
              Continue to Annotation <ArrowRight size={16} />
              <kbd>Enter</kbd>
            </button>
          </div>

          {/* Skip */}
          <button className="booth-skip" onClick={onSkip} type="button">
            Skip this scenario <kbd>S</kbd>
          </button>
        </div>
      </div>

      {/* Keyboard reference */}
      <div className="booth-shortcuts">
        <span><kbd>Space</kbd> Record/Stop</span>
        <span><kbd>Enter</kbd> Continue</span>
        <span><kbd>R</kbd> Redo</span>
        <span><kbd>P</kbd> Play</span>
        <span><kbd>S</kbd> Skip</span>
      </div>
    </div>
  );
}
