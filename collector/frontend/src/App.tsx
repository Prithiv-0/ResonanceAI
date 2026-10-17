// ============================================================
// App — Studio Booth Router
// Flow: Welcome → Booth ⇄ Annotate → Complete
// ============================================================

import { useState, useCallback } from 'react';
import WelcomePage from './pages/WelcomePage';
import BoothPage from './pages/BoothPage';
import AnnotatePage from './pages/AnnotatePage';
import CompletePage from './pages/CompletePage';
import { useSessionStore } from './hooks/useSessionStore';
import type { Annotation, SpeakerInfo } from './types';

type View = 'welcome' | 'booth' | 'annotate' | 'complete';

export default function App() {
  const [view, setView] = useState<View>('welcome');
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const store = useSessionStore();

  const handleStart = useCallback(async (speaker: SpeakerInfo) => {
    await store.createSession(speaker);
    setView('booth');
  }, [store]);

  const handleAcceptRecording = useCallback((scenarioId: string, audioBlob: Blob) => {
    store.addRecording(scenarioId, audioBlob);
    setPendingAudioUrl(URL.createObjectURL(audioBlob));
    setView('annotate');
  }, [store]);

  const handleAnnotationSubmit = useCallback(async (annotation: Annotation) => {
    await store.annotateAndUpload(annotation);

    if (pendingAudioUrl) {
      URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioUrl(null);
    }

    store.advanceToNext();

    if (store.session && store.session.currentIndex + 1 >= store.session.scenarios.length) {
      setView('complete');
    } else {
      setView('booth');
    }
  }, [store, pendingAudioUrl]);

  const handleSkip = useCallback(() => {
    store.advanceToNext();
    if (store.isComplete) {
      setView('complete');
    }
  }, [store]);

  const handleNewSession = useCallback(() => {
    setView('welcome');
    window.location.reload();
  }, []);

  // Render current view
  switch (view) {
    case 'welcome':
      return (
        <WelcomePage
          onStart={handleStart}
          isLoading={store.isLoading}
          error={store.error}
        />
      );

    case 'booth': {
      const scenario = store.getCurrentScenario();
      if (!scenario || !store.session) {
        setView('complete');
        return null;
      }
      return (
        <BoothPage
          scenario={scenario}
          completed={store.session.recordings.length}
          total={store.session.scenarios.length}
          speakerId={store.session.speaker.speaker_id}
          onAccept={handleAcceptRecording}
          onSkip={handleSkip}
        />
      );
    }

    case 'annotate':
      return (
        <AnnotatePage
          audioUrl={pendingAudioUrl}
          onSubmit={handleAnnotationSubmit}
          completed={store.session?.recordings.length || 0}
          total={store.session?.scenarios.length || 0}
        />
      );

    case 'complete':
      return (
        <CompletePage
          speakerId={store.session?.speaker.speaker_id || ''}
          recordings={store.session?.recordings || []}
          onNewSession={handleNewSession}
          exportBackupZip={store.exportBackupZip}
        />
      );
  }
}
