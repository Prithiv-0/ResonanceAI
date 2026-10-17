// ============================================================
// RESONANCE Studio Booth — TypeScript Types
// ============================================================

export const EMOTIONS = ['Anger', 'Disgust', 'Fear', 'Happiness', 'Sadness', 'Neutral'] as const;
export type Emotion = typeof EMOTIONS[number];

/** Color palette for each emotion (used in badges, selectors, charts) */
export const EMOTION_COLORS: Record<Emotion, string> = {
  Anger: '#C0392B',
  Disgust: '#7D8C3E',
  Fear: '#6C3483',
  Happiness: '#D4A017',
  Sadness: '#5B7EA1',
  Neutral: '#8E8EA0',
};

/** Keyboard shortcut mapping for emotion selection */
export const EMOTION_KEYS: Record<string, Emotion> = {
  '1': 'Anger',
  '2': 'Disgust',
  '3': 'Fear',
  '4': 'Happiness',
  '5': 'Sadness',
  '6': 'Neutral',
};

export interface Scenario {
  id: string;
  text: string;
  instruction: string;
  // NOTE: intended_emotion is NOT provided by the session API
  // to avoid priming the participant
}

export interface SpeakerInfo {
  speaker_id: string;
  gender: 'M' | 'F' | 'O';
  age_range: string;
  native_language: string;
}

export interface Annotation {
  self_reported_emotion: Emotion;
  intensity_score: number;    // 1 – 10 continuous
  valence: number | null;     // -1 to +1 (optional)
  arousal: number | null;     // -1 to +1 (optional)
}

export interface RecordingEntry {
  scenario_id: string;
  audioBlob: Blob;
  annotation: Annotation | null;
  quality: AudioQuality | null;
  uploaded: boolean;
  timestamp: string;
}

export interface AudioQuality {
  duration_sec: number;
  peak_db: number;
  rms_db: number;
  clipping_detected: boolean;
  original_duration_sec: number;
}

export interface SessionState {
  session_id: string;
  speaker: SpeakerInfo;
  scenarios: Scenario[];
  currentIndex: number;
  recordings: RecordingEntry[];
}

export interface UploadResponse {
  status: string;
  filename: string;
  quality: AudioQuality;
}

export interface GlobalStatus {
  total_clips: number;
  per_emotion: Record<string, number>;
  active_sessions: number;
  total_speakers: number;
}
