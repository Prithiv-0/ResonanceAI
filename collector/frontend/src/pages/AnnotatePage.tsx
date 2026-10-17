// ============================================================
// AnnotatePage — Post-recording self-report annotation
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import EmotionSelector from '../components/EmotionSelector';
import IntensitySlider from '../components/IntensitySlider';
import ValenceArousalPad from '../components/ValenceArousalPad';
import type { Annotation, Emotion } from '../types';
import { EMOTION_COLORS } from '../types';

interface Props {
  audioUrl: string | null;
  onSubmit: (annotation: Annotation) => void;
  completed: number;
  total: number;
}

export default function AnnotatePage({ audioUrl, onSubmit, completed, total }: Props) {
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [valence, setValence] = useState<number | null>(null);
  const [arousal, setArousal] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  }, [audioUrl]);

  const handleSubmit = useCallback(() => {
    if (!emotion) return;
    onSubmit({
      self_reported_emotion: emotion,
      intensity_score: intensity,
      valence,
      arousal,
    });
    // Reset for next
    setEmotion(null);
    setIntensity(5);
    setValence(null);
    setArousal(null);
  }, [emotion, intensity, valence, arousal, onSubmit]);

  // Enter key to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Enter' && emotion) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handlePlay, emotion]);

  const emotionColor = emotion ? EMOTION_COLORS[emotion] : undefined;

  return (
    <div className="annotate-page">
      <audio ref={audioRef} style={{ display: 'none' }} />

      <div className="annotate-container">
        {/* Header */}
        <div className="annotate-header">
          <h2>How did that feel?</h2>
          <span className="annotate-progress">{completed + 1} / {total}</span>
        </div>

        {/* Playback */}
        <div className="annotate-playback">
          <span>Your recording:</span>
          <button className="annotate-play-btn" onClick={handlePlay} type="button">
            <Play size={14} /> Listen <kbd>P</kbd>
          </button>
        </div>

        {/* Emotion Selector */}
        <EmotionSelector selected={emotion} onSelect={setEmotion} />

        {/* Intensity Slider */}
        <IntensitySlider
          value={intensity}
          onChange={setIntensity}
          emotionColor={emotionColor}
        />

        {/* Valence-Arousal Pad */}
        <ValenceArousalPad
          valence={valence}
          arousal={arousal}
          onChange={(v, a) => { setValence(v); setArousal(a); }}
          onClear={() => { setValence(null); setArousal(null); }}
        />

        {/* Submit */}
        <button
          className="annotate-submit-btn"
          onClick={handleSubmit}
          disabled={!emotion}
          type="button"
        >
          Submit & Next Scenario <ArrowRight size={16} />
          <kbd>Enter</kbd>
        </button>

        {!emotion && (
          <p className="annotate-hint">Select an emotion above to continue</p>
        )}
      </div>
    </div>
  );
}
