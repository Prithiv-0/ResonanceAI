// ============================================================
// IntensitySlider — Continuous 1–10 intensity scale
// ============================================================

interface Props {
  value: number;
  onChange: (value: number) => void;
  emotionColor?: string;
}

export default function IntensitySlider({ value, onChange, emotionColor }: Props) {
  const color = emotionColor || 'var(--accent-steel)';

  return (
    <div className="intensity-slider">
      <div className="intensity-slider-label">How intensely?</div>
      <div className="intensity-slider-track-container">
        <span className="intensity-slider-end">Subtle</span>
        <div className="intensity-slider-track">
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="intensity-slider-input"
            style={{
              '--slider-color': color,
              '--slider-pct': `${((value - 1) / 9) * 100}%`,
            } as React.CSSProperties}
          />
          <div className="intensity-slider-ticks">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <span key={n} className="intensity-slider-tick">{n}</span>
            ))}
          </div>
        </div>
        <span className="intensity-slider-end">Very Strong</span>
      </div>
      <div className="intensity-slider-value" style={{ color }}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}
