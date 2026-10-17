// ============================================================
// useSessionStore — Session state management + IndexedDB backup
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Annotation, RecordingEntry, Scenario, SessionState, SpeakerInfo, UploadResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');
const DB_NAME = 'resonance-booth';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(entry: { sessionId: string; scenarioId: string; audioBlob: Blob; annotation: Annotation }) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllFromIndexedDB(): Promise<Array<{ sessionId: string; scenarioId: string; audioBlob: Blob; annotation: Annotation }>> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Hook ──

interface SessionStore {
  session: SessionState | null;
  isLoading: boolean;
  error: string | null;
  createSession: (speaker: SpeakerInfo) => Promise<void>;
  getCurrentScenario: () => Scenario | null;
  addRecording: (scenarioId: string, audioBlob: Blob) => void;
  annotateAndUpload: (annotation: Annotation) => Promise<UploadResponse | null>;
  advanceToNext: () => void;
  isComplete: boolean;
  exportBackupZip: () => Promise<Blob>;
}

export function useSessionStore(): SessionStore {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRecordingRef = useRef<{ scenarioId: string; audioBlob: Blob } | null>(null);

  const createSession = useCallback(async (speaker: SpeakerInfo) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker_id: speaker.speaker_id,
          gender: speaker.gender,
          age_range: speaker.age_range,
          native_language: speaker.native_language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setSession({
        session_id: data.session_id,
        speaker,
        scenarios: data.scenarios,
        currentIndex: 0,
        recordings: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentScenario = useCallback((): Scenario | null => {
    if (!session || session.currentIndex >= session.scenarios.length) return null;
    return session.scenarios[session.currentIndex];
  }, [session]);

  const addRecording = useCallback((scenarioId: string, audioBlob: Blob) => {
    pendingRecordingRef.current = { scenarioId, audioBlob };
  }, []);

  const annotateAndUpload = useCallback(async (annotation: Annotation): Promise<UploadResponse | null> => {
    const pending = pendingRecordingRef.current;
    if (!pending || !session) return null;

    const { scenarioId, audioBlob } = pending;

    // Save to IndexedDB first (safety backup)
    try {
      await saveToIndexedDB({
        sessionId: session.session_id,
        scenarioId,
        audioBlob,
        annotation,
      });
    } catch {
      console.warn('IndexedDB backup failed — continuing with server upload');
    }

    // Upload to server
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('session_id', session.session_id);
    formData.append('scenario_id', scenarioId);
    formData.append('self_reported_emotion', annotation.self_reported_emotion);
    formData.append('intensity_score', annotation.intensity_score.toString());
    if (annotation.valence !== null) {
      formData.append('valence', annotation.valence.toString());
    }
    if (annotation.arousal !== null) {
      formData.append('arousal', annotation.arousal.toString());
    }

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed: ${res.status}`);
      }

      const data: UploadResponse = await res.json();

      // Update session state
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recordings: [
            ...prev.recordings,
            {
              scenario_id: scenarioId,
              audioBlob,
              annotation,
              quality: data.quality,
              uploaded: true,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      });

      pendingRecordingRef.current = null;
      return data;
    } catch (err) {
      // Upload failed but IndexedDB backup exists
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recordings: [
            ...prev.recordings,
            {
              scenario_id: scenarioId,
              audioBlob,
              annotation,
              quality: null,
              uploaded: false,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      });

      pendingRecordingRef.current = null;
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}. Recording saved locally as backup.`);
      return null;
    }
  }, [session]);

  const advanceToNext = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      };
    });
    setError(null);
  }, []);

  const isComplete = session !== null && session.currentIndex >= session.scenarios.length;

  const exportBackupZip = useCallback(async (): Promise<Blob> => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const entries = await getAllFromIndexedDB();
    const manifest: Array<Record<string, unknown>> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const filename = `recording_${i + 1}.webm`;
      zip.file(filename, entry.audioBlob);
      manifest.push({
        filename,
        sessionId: entry.sessionId,
        scenarioId: entry.scenarioId,
        annotation: entry.annotation,
      });
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    return zip.generateAsync({ type: 'blob' });
  }, []);

  return {
    session,
    isLoading,
    error,
    createSession,
    getCurrentScenario,
    addRecording,
    annotateAndUpload,
    advanceToNext,
    isComplete,
    exportBackupZip,
  };
}
