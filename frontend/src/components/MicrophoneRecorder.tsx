import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Mic, Square, Volume2 } from 'lucide-react'
import { encodeWav } from '../utils/audio'
import { Badge, Spinner } from './ui'

interface MicrophoneRecorderProps {
  onAudioRecorded: (file: File) => void
  maxDurationSeconds?: number
}

export function MicrophoneRecorder({
  onAudioRecorded,
  maxDurationSeconds = 30,
}: MicrophoneRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks()
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close()
      }
    }
  }, [])

  const stopTracks = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
  }

  const startRecording = async () => {
    setErrorMessage(null)
    audioChunksRef.current = []
    setRecordingSeconds(0)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      audioStreamRef.current = stream

      // Set up AudioContext & Analyser for real-time visual feedback meter
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const audioCtx = new Ctx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const updateLevel = () => {
          if (!isRecording && !audioStreamRef.current) return
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }
        updateLevel()
      }

      // Initialize MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : ''

      const options = mimeType ? { mimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        try {
          const rawBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm',
          })
          const wavFile = await convertBlobToWavFile(rawBlob)
          onAudioRecorded(wavFile)
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to finalize microphone recording.')
        } finally {
          setIsProcessing(false)
          setIsRecording(false)
          stopTracks()
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          setAudioLevel(0)
        }
      }

      mediaRecorder.start(200) // collect chunks every 200ms
      setIsRecording(true)

      // Start duration timer
      const startTime = Date.now()
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setRecordingSeconds(elapsed)
        if (elapsed >= maxDurationSeconds) {
          stopRecording()
        }
      }, 250)
    } catch (err) {
      setIsRecording(false)
      stopTracks()
      const msg =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to record directly.'
          : err instanceof Error
            ? err.message
            : 'Could not access microphone.'
      setErrorMessage(msg)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const convertBlobToWavFile = async (blob: Blob): Promise<File> => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
    const filename = `mic_speech_${timestamp}.wav`

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) {
      // Fallback: return raw blob
      return new File([blob], filename.replace(/\.wav$/, '.webm'), { type: blob.type || 'audio/webm' })
    }

    const audioCtx = new Ctx()
    try {
      const arrayBuf = await blob.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
      const monoSamples = audioBuffer.getChannelData(0)
      const wavArrayBuffer = encodeWav(monoSamples, audioBuffer.sampleRate)
      return new File([wavArrayBuffer], filename, { type: 'audio/wav' })
    } catch {
      // If decoding fails, return raw blob file
      return new File([blob], filename, { type: blob.type || 'audio/wav' })
    } finally {
      void audioCtx.close()
    }
  }

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-md border border-navy-200 bg-white p-4">
      {errorMessage && (
        <div className="mb-3 flex items-start gap-2 rounded bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            className="text-amber-700 font-bold hover:text-amber-950 text-sm leading-none"
            onClick={() => setErrorMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {!isRecording && !isProcessing && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-4 ring-brand-50">
            <Mic size={22} />
          </div>
          <h4 className="text-sm font-semibold text-navy-950">Direct Voice Recording</h4>
          <p className="mt-1 max-w-sm text-xs text-navy-600">
            Speak directly into your microphone to test emotion classification live without needing to upload an audio file.
          </p>
          <button
            type="button"
            data-testid="start-mic-button"
            onClick={() => void startRecording()}
            className="btn btn-primary mt-3 !px-4 !py-2 !text-xs font-medium"
          >
            <Mic size={14} className="mr-1 text-red-400" /> Start Speaking
          </button>
          <span className="mt-2 text-[11px] text-navy-400">Max recording: {maxDurationSeconds} seconds · Encodes standard 16-bit WAV</span>
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col items-center justify-center py-3 text-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="font-mono text-base font-bold text-red-600">
              {formatSeconds(recordingSeconds)} / {formatSeconds(maxDurationSeconds)}
            </span>
            <Badge tone="bad">Live Recording</Badge>
          </div>

          {/* Audio volume visualizer meter */}
          <div className="w-full max-w-xs my-2">
            <div className="flex items-center justify-between text-[11px] text-navy-500 mb-1">
              <span className="flex items-center gap-1">
                <Volume2 size={12} /> Mic Level
              </span>
              <span className="font-mono">{audioLevel}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                style={{ width: `${Math.max(4, audioLevel)}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-navy-600 mt-1 mb-3">
            Speak a sentence showing anger, happiness, fear, sadness, disgust, or neutral tone...
          </p>

          <button
            type="button"
            data-testid="stop-mic-button"
            onClick={stopRecording}
            className="btn btn-secondary !border-red-300 !bg-red-50 !text-red-700 hover:!bg-red-100 !px-4 !py-2 !text-xs font-semibold"
          >
            <Square size={13} className="mr-1 fill-current" /> Stop &amp; Analyze Voice
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Spinner label="Finalizing voice recording and encoding WAV..." />
          <p className="mt-2 text-xs text-navy-500">Processing audio buffer with 16-bit PCM encoder...</p>
        </div>
      )}
    </div>
  )
}
