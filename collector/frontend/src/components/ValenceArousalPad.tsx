// ============================================================
// ValenceArousalPad — 2D clickable emotion coordinate space
// ============================================================

import { useRef, useState, useCallback } from 'react';

interface Props {
  valence: number | null;     // -1 to +1 (x-axis)
  arousal: number | null;     // -1 to +1 (y-axis)
  onChange: (valence: number, arousal: number) => void;
  onClear: () => void;
}

export default function ValenceArousalPad({ valence, arousal, onChange, onClear }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0–1
    const y = (e.clientY - rect.top) / rect.height;     // 0–1

    // Convert to -1..+1 coordinate space
    const v = (x * 2) - 1;   // left=-1, right=+1
    const a = -((y * 2) - 1); // top=+1, bottom=-1

    onChange(
      Math.round(v * 100) / 100,
      Math.round(a * 100) / 100,
    );
  }, [onChange]);

  // Convert valence/arousal back to CSS position
  const markerX = valence !== null ? ((valence + 1) / 2) * 100 : 50;
  const markerY = arousal !== null ? ((1 - (arousal + 1) / 2)) * 100 : 50;

  return (
    <div className="va-pad-container">
      <div className="va-pad-header">
        <span className="va-pad-label">Where on the emotion map? <span className="va-pad-optional">(optional)</span></span>
        {valence !== null && (
          <button className="va-pad-clear" onClick={onClear} type="button">Clear</button>
        )}
      </div>

      <div
        ref={padRef}
        className={`va-pad ${isHovering ? 'va-pad--hover' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Axis lines */}
        <div className="va-pad-axis va-pad-axis--h" />
        <div className="va-pad-axis va-pad-axis--v" />

        {/* Quadrant labels */}
        <span className="va-pad-quadrant va-pad-q-tl">Angry · Afraid</span>
        <span className="va-pad-quadrant va-pad-q-tr">Excited · Happy</span>
        <span className="va-pad-quadrant va-pad-q-bl">Sad · Bored</span>
        <span className="va-pad-quadrant va-pad-q-br">Calm · Content</span>

        {/* Axis labels */}
        <span className="va-pad-axis-label va-pad-axis-top">High Arousal ↑</span>
        <span className="va-pad-axis-label va-pad-axis-bottom">Low Arousal ↓</span>
        <span className="va-pad-axis-label va-pad-axis-left">Negative ←</span>
        <span className="va-pad-axis-label va-pad-axis-right">→ Positive</span>

        {/* Marker */}
        {valence !== null && arousal !== null && (
          <div
            className="va-pad-marker"
            style={{
              left: `${markerX}%`,
              top: `${markerY}%`,
            }}
          />
        )}
      </div>

      {/* Coordinates display */}
      {valence !== null && arousal !== null && (
        <div className="va-pad-coords">
          V: {valence > 0 ? '+' : ''}{valence.toFixed(2)} &nbsp;·&nbsp; A: {arousal > 0 ? '+' : ''}{arousal.toFixed(2)}
        </div>
      )}
    </div>
  );
}
