# Resonance Studio Booth

**Speech Emotion Data Collection Tool**

A standalone web application for crowdsourcing naturalistic speech emotion recordings with multi-dimensional self-reported annotations. Part of the [Resonance](../README.md) project.

## What Makes This Different

Unlike RAVDESS/CREMA-D where actors read scripted sentences in pretend emotions, Studio Booth uses:

1. **Scenario-Based Elicitation** — Participants see vivid situational prompts and respond spontaneously, producing naturalistic emotional speech
2. **Dual Annotation** — After each recording, speakers self-report: categorical emotion + continuous intensity (1–10 slider) + optional valence-arousal coordinates

## Quick Start

### 🚀 One-Command Launch (Unified Full-Stack)

You can launch both the frontend and backend together on a single port (`8000`):

```bash
cd collector
python run.py
```

Or on Windows, simply double-click `start.bat`.

The unified server:
- Automatically detects and prints your LAN IP for other devices
- Serves the compiled React UI at `http://localhost:8000`
- Serves the FastAPI REST endpoints at `http://localhost:8000/api/*`

---

### 🛠️ Development Mode (Hot Reload)

If you are developing and modifying React or FastAPI source code:

```bash
# Terminal 1 — Backend
cd collector/backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd collector/frontend
npm run dev
```

---

## Multi-Device & Mobile Access

### The Browser Microphone Rule (Crucial!)
Modern mobile browsers (iOS Safari, Android Chrome) **strictly require HTTPS** or `localhost` to grant microphone permissions (`getUserMedia`). Connecting via plain LAN IP (`http://192.168.x.x`) may block audio recording on phones.

### Instant Shareable HTTPS Link (Recommended for remote or phone testing)
Run a free HTTPS tunnel in a second terminal while `run.py` is active:

```bash
# Option A: Cloudflare Quick Tunnel (no account required)
cloudflared tunnel --url http://localhost:8000

# Option B: localtunnel (zero install with npx)
npx localtunnel --port 8000

# Option C: ngrok
ngrok http 8000
```

Share the generated `https://...` link with participants. It works immediately on any smartphone, tablet, or laptop worldwide with working microphone access!

## Dataset Output

Recordings are saved to `collector/dataset/`:

```
dataset/
├── metadata.csv    # Extended manifest
└── audio/          # 16kHz mono WAV files
    ├── CUSTOM_SPK001_001.wav
    ├── CUSTOM_SPK001_002.wav
    └── ...
```

### metadata.csv Schema

| Column | Description |
|--------|-------------|
| `sample_id` | Unique ID (e.g., `CUSTOM_00001`) |
| `filename` | WAV filename |
| `source_dataset` | Always `CUSTOM` |
| `speaker_id` | Participant identifier |
| `gender` | M / F / O |
| `scenario_id` | Which scenario was shown |
| `scenario_intended_emotion` | What the scenario was designed to elicit |
| `self_reported_emotion` | What the speaker says they expressed (**primary label**) |
| `intensity_score` | 1.0 – 10.0 continuous |
| `valence` | -1.0 to +1.0 (optional) |
| `arousal` | -1.0 to +1.0 (optional) |
| `duration_sec` | Post-processing duration |
| `split` | `unassigned` (assigned during merge) |

## Merging with Main Dataset

To combine custom recordings with RAVDESS/CREMA-D for training:

1. Copy `dataset/audio/` files to your main audio directory
2. Append `dataset/metadata.csv` rows to your main metadata CSV
3. Set `source_dataset = "CUSTOM"` to distinguish from RAVDESS/CREMA-D
4. Run speaker-independent split assignment on the merged dataset

## Architecture

```
collector/
├── frontend/          # React + Vite + TypeScript (port 5174)
│   └── src/
│       ├── pages/     # Welcome → Booth → Annotate → Complete
│       ├── components/# Waveform, VU meter, VA pad, etc.
│       └── hooks/     # useRecorder, useAudioAnalysis, useSessionStore
│
├── backend/           # FastAPI (port 8000)
│   ├── main.py        # REST API endpoints
│   ├── scenarios.py   # 42 situational prompts
│   ├── audio_processor.py  # WebM→WAV, normalize, trim
│   └── session_manager.py  # Sessions, file naming, CSV
│
└── dataset/           # Auto-created output
```
