import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { FileAudio, Mic, Sliders, Upload, X } from 'lucide-react'
import { useSession } from '../state/session'
import { SUPPORTED_EXTENSIONS, SYNTHETIC_PRESETS, makeSyntheticFile } from '../utils/audio'
import { formatBytes, formatDuration, formatHz } from '../utils/format'
import { Spinner, Stat, ErrorMessage, Badge } from './ui'
import { Waveform } from './Waveform'
import { MicrophoneRecorder } from './MicrophoneRecorder'

type InputTab = 'mic' | 'upload' | 'preset'

export function AudioSourcePanel({ showPlayer = true }: { showPlayer?: boolean }) {
  const { state, fileUrl, audioError, audioBusy, setAudioFile, clearAudio } = useSession()
  const [activeTab, setActiveTab] = useState<InputTab>('mic')
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const a = state.audio
  const backendAudio = state.analysis?.audio && state.analysis.audio.filename === a?.name ? state.analysis.audio : null

  const accept = (f: File | undefined, origin: 'upload' | 'synthetic' = 'upload') => {
    if (f) void setAudioFile(f, origin)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files?.[0])
  }

  return (
    <div className="space-y-3">
      {/* Input Mode Selector Tabs */}
      <div className="flex rounded-md border border-navy-200 bg-navy-50/70 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mic'}
          onClick={() => setActiveTab('mic')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'mic'
              ? 'bg-white text-navy-950 shadow-sm'
              : 'text-navy-600 hover:text-navy-950 hover:bg-white/50'
          }`}
        >
          <Mic size={14} className={activeTab === 'mic' ? 'text-red-500' : 'text-navy-400'} />
          <span>Direct Mic</span>
          <span className="hidden sm:inline text-[10px] font-normal text-navy-400">(Record live)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          onClick={() => setActiveTab('upload')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-navy-950 shadow-sm'
              : 'text-navy-600 hover:text-navy-950 hover:bg-white/50'
          }`}
        >
          <Upload size={14} className={activeTab === 'upload' ? 'text-brand-700' : 'text-navy-400'} />
          <span>Upload Audio</span>
          <span className="hidden sm:inline text-[10px] font-normal text-navy-400">(WAV, MP3)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preset'}
          onClick={() => setActiveTab('preset')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'preset'
              ? 'bg-white text-navy-950 shadow-sm'
              : 'text-navy-600 hover:text-navy-950 hover:bg-white/50'
          }`}
        >
          <Sliders size={14} className={activeTab === 'preset' ? 'text-amber-600' : 'text-navy-400'} />
          <span>Test Signals</span>
          <span className="hidden sm:inline text-[10px] font-normal text-navy-400">(Synthetic)</span>
        </button>
      </div>

      {/* Tab 1: Direct Microphone */}
      {activeTab === 'mic' && (
        <MicrophoneRecorder
          onAudioRecorded={(micFile) => accept(micFile, 'upload')}
          maxDurationSeconds={30}
        />
      )}

      {/* Tab 2: Upload File / Drag and Drop */}
      {activeTab === 'upload' && (
        <div
          data-testid="dropzone"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? 'border-brand-600 bg-brand-50' : 'border-navy-300 bg-navy-50/60'
          }`}
        >
          <Upload size={20} className="text-navy-500" />
          <p className="text-[13px] text-navy-800">
            Drag and drop an audio file here, or{' '}
            <button
              type="button"
              className="font-medium text-brand-700 underline underline-offset-2"
              onClick={() => input.current?.click()}
            >
              choose a file
            </button>
          </p>
          <p className="text-[11px] text-navy-500">Supported: {SUPPORTED_EXTENSIONS.join(' ')} · up to 25 MB / 60 s</p>
          <input
            ref={input}
            id="audio-file-input"
            data-testid="file-input"
            type="file"
            accept={`${SUPPORTED_EXTENSIONS.join(',')},audio/*`}
            className="sr-only"
            onChange={(e) => {
              accept(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Tab 3: Test Signals */}
      {activeTab === 'preset' && (
        <div className="rounded-md border border-navy-200 bg-navy-50/50 p-3 text-center">
          <p className="text-xs text-navy-600 mb-2 font-medium">Select a benchmark speech sample:</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {Object.entries(SYNTHETIC_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                data-testid={`synthetic-${key}`}
                className="btn btn-secondary !px-2.5 !py-1 !text-xs"
                onClick={() => accept(makeSyntheticFile(key), 'synthetic')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {audioBusy && <Spinner label="Decoding audio…" />}
      {audioError && <ErrorMessage title="Could not load audio" message={audioError} onDismiss={() => void 0} />}

      {/* Active Audio Metadata, Waveform & Player */}
      {a && (
        <div className="rounded-md border border-navy-200 bg-white" data-testid="audio-meta">
          <div className="flex items-center justify-between gap-2 border-b border-navy-100 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileAudio size={16} className="shrink-0 text-brand-700" />
              <span className="truncate text-[13px] font-medium text-navy-950" data-testid="meta-filename">
                {a.name}
              </span>
              {a.origin === 'synthetic' ? (
                <Badge tone="steel">sample audio</Badge>
              ) : a.name.startsWith('mic_speech_') ? (
                <Badge tone="good">direct mic recording</Badge>
              ) : (
                <Badge tone="brand">uploaded audio</Badge>
              )}
            </div>
            <button
              type="button"
              className="text-navy-500 hover:text-navy-900"
              onClick={clearAudio}
              aria-label="Remove audio"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 px-3 py-3 sm:grid-cols-4">
            <Stat label="Duration" value={<span data-testid="meta-duration">{formatDuration(a.durationS)}</span>} />
            <Stat
              label="Sampling rate"
              value={<span data-testid="meta-sr">{formatHz(backendAudio?.native_sample_rate_hz ?? a.sampleRate)}</span>}
              hint={backendAudio ? 'native, from backend' : a.sampleRateSource === 'wav-header' ? 'native, WAV header' : 'browser decoder rate'}
            />
            <Stat label="File size" value={<span data-testid="meta-size">{formatBytes(a.size)}</span>} />
            <Stat label="Channels" value={backendAudio?.channels ?? a.channels} hint={backendAudio?.container} />
          </div>
          <div className="px-3 pb-3">
            <Waveform peaks={a.waveform} height={72} />
            {showPlayer &&
              (fileUrl ? (
                <audio data-testid="audio-player" className="mt-2 h-9 w-full" controls src={fileUrl} preload="metadata" />
              ) : (
                <p className="mt-2 text-xs text-amber-800" data-testid="reselect-note">
                  Metadata was restored from this browser session, but the file itself is not in memory. Re-select it to enable playback and analysis.
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
