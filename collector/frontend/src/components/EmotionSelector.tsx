// ============================================================
// EmotionSelector — 6 selectable emotion buttons for self-report
// ============================================================

import { EMOTIONS, EMOTION_COLORS, EMOTION_KEYS, type Emotion } from '../types';
import { useEffect } from 'react';

interface Props {
  selected: Emotion | null;
  onSelect: (emotion: Emotion) => void;
}

export default function EmotionSelector({ selected, onSelect }: Props) {
  // Keyboard shortcuts 1–6
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const emotion = EMOTION_KEYS[e.key];
      if (emotion) {
        e.preventDefault();
        onSelect(emotion);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSelect]);

  return (
    <div className="emotion-selector">
      <div className="emotion-selector-label">What emotion did you express?</div>
      <div className="emotion-selector-grid">
        {EMOTIONS.map((emotion, i) => {
          const isActive = selected === emotion;
          const color = EMOTION_COLORS[emotion];
          return (
            <button
              key={emotion}
              className={`emotion-btn ${isActive ? 'emotion-btn--active' : ''}`}
              style={{
                '--emotion-color': color,
                '--emotion-color-bg': `${color}15`,
                '--emotion-color-border': `${color}40`,
              } as React.CSSProperties}
              onClick={() => onSelect(emotion)}
              type="button"
            >
              <span className="emotion-btn-name">{emotion}</span>
              <kbd className="emotion-btn-key">{i + 1}</kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
