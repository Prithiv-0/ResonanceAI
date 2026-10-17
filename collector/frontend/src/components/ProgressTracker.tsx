// ============================================================
// ProgressTracker — Session progress bar
// ============================================================

interface Props {
  completed: number;
  total: number;
  speakerId: string;
}

export default function ProgressTracker({ completed, total, speakerId }: Props) {
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="progress-tracker">
      <div className="progress-tracker-info">
        <span className="progress-tracker-speaker">{speakerId}</span>
        <span className="progress-tracker-count">
          {completed} / {total} scenarios
        </span>
      </div>
      <div className="progress-tracker-bar">
        <div
          className="progress-tracker-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
