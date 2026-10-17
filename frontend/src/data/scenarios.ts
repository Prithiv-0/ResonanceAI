import { EMOTIONS } from '../types'
import type { Emotion } from '../types'

export interface Scenario {
  id: Emotion
  label: string
  description: string
  /** Percent per class, fixed order (anger … neutral). Sums to exactly 100. */
  probabilities: Record<Emotion, number>
}

function dist(values: number[]): Record<Emotion, number> {
  return Object.fromEntries(EMOTIONS.map((e, i) => [e, values[i]])) as Record<Emotion, number>
}

/** Six predefined, deterministic scenarios (identical on every interaction and page refresh). */
export const SCENARIOS: Scenario[] = [
  { id: 'anger', label: 'Anger', description: 'Forceful, high-energy delivery', probabilities: dist([62.4, 11.3, 9.8, 6.2, 2.1, 8.2]) },
  { id: 'disgust', label: 'Disgust', description: 'Strained, low-pitched emphasis', probabilities: dist([9.6, 58.7, 12.4, 4.3, 7.8, 7.2]) },
  { id: 'fear', label: 'Fear', description: 'Tense, unsteady delivery', probabilities: dist([8.9, 12.1, 60.3, 5.4, 9.6, 3.7]) },
  { id: 'happiness', label: 'Happiness', description: 'Bright, lively delivery', probabilities: dist([6.8, 3.9, 5.7, 66.5, 4.6, 12.5]) },
  { id: 'sadness', label: 'Sadness', description: 'Slow, low-energy delivery', probabilities: dist([3.2, 7.4, 9.1, 2.8, 64.9, 12.6]) },
  { id: 'neutral', label: 'Neutral', description: 'Even, unmarked delivery', probabilities: dist([5.1, 6.3, 4.8, 9.7, 11.2, 62.9]) },
]

export function getScenario(id: string | undefined): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}

/** Highest-probability class, confidence-style score and runner-up margin derived from a scenario. */
export function summarize(s: Scenario) {
  const entries = EMOTIONS.map((e) => [e, s.probabilities[e]] as const)
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  return {
    label: sorted[0][0] as Emotion,
    score: sorted[0][1],
    margin: Math.round((sorted[0][1] - sorted[1][1]) * 10) / 10,
    total: Math.round(entries.reduce((t, [, v]) => t + v, 0) * 1000) / 1000,
  }
}
