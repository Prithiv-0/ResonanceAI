// ============================================================
// QualityIndicators — Duration, peak level, clipping warnings
// ============================================================

import { AlertTriangle, Check } from 'lucide-react';

interface Props {
  duration: number;
  isRecording?: boolean;
}

export default function QualityIndicators({ duration, isRecording }: Props) {
  const tooShort = duration > 0 && duration < 0.8;
  const tooLong = duration > 15;
  const good = duration >= 0.8 && duration <= 15;

  return (
    <div className="quality-indicators">
      <div className={`quality-badge ${isRecording ? 'quality-badge--recording' : ''}`}>
        <span className="quality-badge-value">{duration.toFixed(1)}s</span>
        <span className="quality-badge-label">Duration</span>
      </div>

      {!isRecording && duration > 0 && (
        <div className={`quality-badge ${good ? 'quality-badge--good' : 'quality-badge--warn'}`}>
          {good ? (
            <>
              <Check size={14} />
              <span>Audio looks good</span>
            </>
          ) : tooShort ? (
            <>
              <AlertTriangle size={14} />
              <span>Too short — try speaking more</span>
            </>
          ) : tooLong ? (
            <>
              <AlertTriangle size={14} />
              <span>Very long — try to be more concise</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
