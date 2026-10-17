// ============================================================
// WelcomePage — Speaker registration + microphone check
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, ArrowRight } from 'lucide-react';
import type { SpeakerInfo } from '../types';

interface Props {
  onStart: (speaker: SpeakerInfo) => void;
  isLoading: boolean;
  error: string | null;
}

export default function WelcomePage({ onStart, isLoading, error }: Props) {
  const [speakerId, setSpeakerId] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [ageRange, setAgeRange] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [micTested, setMicTested] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const testMicrophone = useCallback(async () => {
    setIsTesting(true);
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }

        stream.getTracks().forEach((t) => t.stop());
        setMicTested(true);
        setIsTesting(false);
      };

      recorder.start();
      // Record for 2 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 2000);
    } catch (err) {
      setMicError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow access in your browser settings.'
          : 'Could not access microphone. Please check your device.'
      );
      setIsTesting(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerId.trim()) return;

    onStart({
      speaker_id: speakerId.trim(),
      gender,
      age_range: ageRange,
      native_language: nativeLanguage,
    });
  };

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-brand">RESONANCE</div>
          <h1 className="welcome-title">Studio Booth</h1>
          <p className="welcome-subtitle">
            Help us build a speech emotion dataset by recording your voice in different scenarios.
          </p>
        </div>

        {/* Instructions */}
        <div className="welcome-instructions">
          <h3>How it works</h3>
          <ol>
            <li>You'll see <strong>situational scenarios</strong> on screen — vivid situations designed to evoke different feelings.</li>
            <li><strong>Read the scenario</strong>, then respond naturally by speaking out loud as if you're really in that situation.</li>
            <li>After each recording, you'll <strong>self-report</strong> what emotion you think you expressed and how intensely.</li>
            <li>The session takes about <strong>15–20 minutes</strong> (~24 scenarios).</li>
          </ol>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="welcome-form">
          <h3>Speaker Registration</h3>

          <div className="form-group">
            <label htmlFor="speaker-id">Speaker ID *</label>
            <input
              id="speaker-id"
              type="text"
              placeholder="e.g., SPK_001"
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'O')}>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="age-range">Age Range</label>
              <select id="age-range" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
                <option value="">— Select —</option>
                <option value="18-25">18 – 25</option>
                <option value="26-35">26 – 35</option>
                <option value="36-45">36 – 45</option>
                <option value="46+">46+</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="native-lang">Native Language</label>
            <input
              id="native-lang"
              type="text"
              placeholder="e.g., English, Hindi, Tamil"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
            />
          </div>

          {/* Microphone Test */}
          <div className="mic-test-section">
            <h3>Microphone Check</h3>
            <p>Test your microphone before starting. We'll record 2 seconds and play it back.</p>
            <button
              type="button"
              className={`mic-test-btn ${isTesting ? 'mic-test-btn--testing' : ''} ${micTested ? 'mic-test-btn--done' : ''}`}
              onClick={testMicrophone}
              disabled={isTesting}
            >
              {isTesting ? (
                <><Volume2 size={18} className="animate-pulse" /> Recording... (2s)</>
              ) : micTested ? (
                <><Mic size={18} /> Mic tested ✓ — Click to test again</>
              ) : (
                <><Mic size={18} /> Test Microphone</>
              )}
            </button>
            <audio ref={audioRef} style={{ display: 'none' }} />
            {micError && (
              <div className="mic-error">
                <MicOff size={16} />
                {micError}
              </div>
            )}
          </div>

          {/* Errors */}
          {error && <div className="form-error">{error}</div>}

          {/* Submit */}
          <button
            type="submit"
            className="welcome-start-btn"
            disabled={!speakerId.trim() || isLoading}
          >
            {isLoading ? 'Creating Session...' : (
              <>Start Recording Session <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
