// ============================================================
// CompletePage — Session summary + backup ZIP download
// ============================================================

import { useState, useMemo } from 'react';
import { Download, CheckCircle2, RefreshCw } from 'lucide-react';
import { EMOTIONS, EMOTION_COLORS, type Emotion } from '../types';
import type { RecordingEntry } from '../types';
import { saveAs } from 'file-saver';

interface Props {
  speakerId: string;
  recordings: RecordingEntry[];
  onNewSession: () => void;
  exportBackupZip: () => Promise<Blob>;
}

export default function CompletePage({ speakerId, recordings, onNewSession, exportBackupZip }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    const perEmotion: Record<string, number> = {};
    let totalDuration = 0;
    let uploadedCount = 0;

    for (const r of recordings) {
      if (r.annotation) {
        const e = r.annotation.self_reported_emotion;
        perEmotion[e] = (perEmotion[e] || 0) + 1;
      }
      if (r.quality) {
        totalDuration += r.quality.duration_sec;
      }
      if (r.uploaded) {
        uploadedCount++;
      }
    }

    return { perEmotion, totalDuration, uploadedCount, total: recordings.length };
  }, [recordings]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportBackupZip();
      saveAs(blob, `resonance_backup_${speakerId}_${Date.now()}.zip`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="complete-page">
      <div className="complete-container">
        <div className="complete-icon">
          <CheckCircle2 size={64} strokeWidth={1.5} />
        </div>

        <h1 className="complete-title">Session Complete!</h1>
        <p className="complete-subtitle">
          Thank you, <strong>{speakerId}</strong>. Your recordings have been submitted.
        </p>

        {/* Stats */}
        <div className="complete-stats">
          <div className="complete-stat">
            <div className="complete-stat-value">{stats.total}</div>
            <div className="complete-stat-label">Recordings</div>
          </div>
          <div className="complete-stat">
            <div className="complete-stat-value">{Math.round(stats.totalDuration)}s</div>
            <div className="complete-stat-label">Total Audio</div>
          </div>
          <div className="complete-stat">
            <div className="complete-stat-value">{stats.uploadedCount}/{stats.total}</div>
            <div className="complete-stat-label">Uploaded</div>
          </div>
        </div>

        {/* Per-emotion breakdown */}
        <div className="complete-breakdown">
          <h3>Self-Reported Emotions</h3>
          <div className="complete-breakdown-grid">
            {EMOTIONS.map((emotion) => {
              const count = stats.perEmotion[emotion] || 0;
              const color = EMOTION_COLORS[emotion as Emotion];
              return (
                <div key={emotion} className="complete-breakdown-row">
                  <span className="complete-breakdown-label" style={{ color }}>
                    {emotion}
                  </span>
                  <div className="complete-breakdown-bar-track">
                    <div
                      className="complete-breakdown-bar-fill"
                      style={{
                        width: `${(count / Math.max(stats.total, 1)) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="complete-breakdown-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload warning */}
        {stats.uploadedCount < stats.total && (
          <div className="complete-warning">
            ⚠️ {stats.total - stats.uploadedCount} recording(s) failed to upload.
            Please download the backup ZIP below.
          </div>
        )}

        {/* Actions */}
        <div className="complete-actions">
          <button
            className="complete-btn complete-btn--primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={18} />
            {isExporting ? 'Creating ZIP...' : 'Download Backup ZIP'}
          </button>

          <button
            className="complete-btn complete-btn--secondary"
            onClick={onNewSession}
          >
            <RefreshCw size={18} />
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}
