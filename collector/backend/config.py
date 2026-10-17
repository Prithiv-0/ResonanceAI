"""
RESONANCE Studio Booth — Configuration
All configurable constants for the data collection pipeline.
"""

from pathlib import Path

# ── Emotion Classes (matching Resonance's six-class task) ──
EMOTIONS = ["Anger", "Disgust", "Fear", "Happiness", "Sadness", "Neutral"]

# ── Audio Processing ──
SAMPLE_RATE = 16000          # Hz — matches Resonance preprocessing
CHANNELS = 1                  # Mono
TARGET_LOUDNESS_DB = -20.0    # RMS normalization target
MAX_DURATION_SEC = 15.0       # Spontaneous responses can be longer than scripted
MIN_DURATION_SEC = 0.8        # Reject extremely short clips
SILENCE_THRESHOLD_DB = -40.0  # For leading/trailing silence trimming
SILENCE_PAD_SEC = 0.1         # Keep this much silence at edges after trim

# ── Session Defaults ──
SCENARIOS_PER_EMOTION = 4     # Number of scenario prompts per emotion per session
# Total prompts per session = SCENARIOS_PER_EMOTION * len(EMOTIONS) = 24

# ── Paths ──
BASE_DIR = Path(__file__).resolve().parent.parent  # collector/
DATASET_DIR = BASE_DIR / "dataset"
AUDIO_DIR = DATASET_DIR / "audio"
METADATA_CSV = DATASET_DIR / "metadata.csv"

# ── Metadata CSV Columns ──
METADATA_COLUMNS = [
    "sample_id",
    "filename",
    "source_dataset",
    "speaker_id",
    "gender",
    "age_range",
    "native_language",
    "scenario_id",
    "scenario_intended_emotion",
    "self_reported_emotion",
    "intensity_score",
    "valence",
    "arousal",
    "duration_sec",
    "sample_rate",
    "collection_timestamp",
    "split",
]
