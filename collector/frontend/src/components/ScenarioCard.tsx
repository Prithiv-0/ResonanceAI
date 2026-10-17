// ============================================================
// ScenarioCard — Displays the situational prompt
// ============================================================

import type { Scenario } from '../types';

interface Props {
  scenario: Scenario;
}

export default function ScenarioCard({ scenario }: Props) {
  return (
    <div className="scenario-card">
      <div className="scenario-label">Scenario</div>
      <blockquote className="scenario-text">
        "{scenario.text}"
      </blockquote>
      <div className="scenario-instruction">
        <span className="scenario-instruction-icon">💡</span>
        {scenario.instruction}
      </div>
    </div>
  );
}
