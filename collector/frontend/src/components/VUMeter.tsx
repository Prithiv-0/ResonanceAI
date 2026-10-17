// ============================================================
// VUMeter — Real-time volume level indicator
// ============================================================

import { useRef, useEffect } from 'react';

interface Props {
  getVolumeLevel: () => number; // 0–1
  isActive: boolean;
}

export default function VUMeter({ getVolumeLevel, isActive }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      if (barRef.current) {
        barRef.current.style.width = '0%';
      }
      return;
    }

    const update = () => {
      const level = getVolumeLevel();
      if (barRef.current) {
        const pct = Math.min(100, level * 100);
        barRef.current.style.width = `${pct}%`;

        // Color based on level
        if (level > 0.85) {
          barRef.current.style.background = 'var(--color-error, #A0522D)';
        } else if (level > 0.6) {
          barRef.current.style.background = 'var(--color-warning, #B8860B)';
        } else {
          barRef.current.style.background = 'var(--color-success, #4A7C59)';
        }
      }
      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isActive, getVolumeLevel]);

  return (
    <div className="vu-meter">
      <div className="vu-meter-track">
        <div ref={barRef} className="vu-meter-bar" />
      </div>
      <span className="vu-meter-label">Volume</span>
    </div>
  );
}
