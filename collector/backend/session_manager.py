"""
RESONANCE Studio Booth — Session Manager

Manages speaker sessions, generates prompt queues, tracks progress,
saves audio files, and appends metadata to the dataset CSV.
"""

import csv
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from config import (
    AUDIO_DIR,
    DATASET_DIR,
    METADATA_COLUMNS,
    METADATA_CSV,
    SAMPLE_RATE,
    SCENARIOS_PER_EMOTION,
)
from scenarios import Scenario, get_session_queue


@dataclass
class SpeakerInfo:
    speaker_id: str
    gender: str          # M / F / O
    age_range: str = ""  # 18-25, 26-35, 36-45, 46+
    native_language: str = ""


@dataclass
class SessionState:
    session_id: str
    speaker: SpeakerInfo
    scenarios: list[Scenario]
    completed: int = 0
    clip_counter: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# In-memory session store (sufficient for single-server deployment)
_sessions: dict[str, SessionState] = {}
_csv_lock = threading.Lock()
_sample_counter_lock = threading.Lock()
_global_sample_counter = 0


def _init_dataset_dir() -> None:
    """Ensure dataset directories and metadata CSV exist."""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    if not METADATA_CSV.exists():
        with open(METADATA_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(METADATA_COLUMNS)


def _get_next_sample_id() -> str:
    """Thread-safe global sample counter."""
    global _global_sample_counter
    with _sample_counter_lock:
        # On startup, count existing rows in CSV
        if _global_sample_counter == 0 and METADATA_CSV.exists():
            with open(METADATA_CSV, "r", encoding="utf-8") as f:
                # Subtract 1 for header
                _global_sample_counter = max(0, sum(1 for _ in f) - 1)
        _global_sample_counter += 1
        return f"CUSTOM_{_global_sample_counter:05d}"


def create_session(speaker: SpeakerInfo) -> SessionState:
    """
    Create a new recording session for a speaker.
    Returns the session state with a shuffled, balanced prompt queue.
    """
    _init_dataset_dir()

    # Collect recently used scenario IDs to try to diversify across sessions
    recent_ids: set[str] = set()
    for s in _sessions.values():
        for sc in s.scenarios:
            recent_ids.add(sc.id)

    scenarios = get_session_queue(
        scenarios_per_emotion=SCENARIOS_PER_EMOTION,
        exclude_ids=recent_ids if len(recent_ids) < 30 else None,
    )

    session_id = uuid.uuid4().hex[:12]
    state = SessionState(
        session_id=session_id,
        speaker=speaker,
        scenarios=scenarios,
    )
    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> SessionState | None:
    """Retrieve a session by ID."""
    return _sessions.get(session_id)


def save_clip(
    session_id: str,
    scenario_id: str,
    wav_bytes: bytes,
    self_reported_emotion: str,
    intensity_score: float,
    duration_sec: float,
    valence: float | None = None,
    arousal: float | None = None,
) -> str:
    """
    Save an audio clip and append its metadata to the CSV.

    Returns the saved filename.
    """
    session = _sessions.get(session_id)
    if session is None:
        raise ValueError(f"Unknown session: {session_id}")

    _init_dataset_dir()

    # Generate filename and sample ID
    session.clip_counter += 1
    sample_id = _get_next_sample_id()
    filename = f"CUSTOM_{session.speaker.speaker_id}_{session.clip_counter:03d}.wav"

    # Save WAV file
    filepath = AUDIO_DIR / filename
    filepath.write_bytes(wav_bytes)

    # Find the scenario to get its intended emotion
    scenario_intended = ""
    for sc in session.scenarios:
        if sc.id == scenario_id:
            scenario_intended = sc.intended_emotion
            break

    # Append row to CSV
    row = {
        "sample_id": sample_id,
        "filename": filename,
        "source_dataset": "CUSTOM",
        "speaker_id": session.speaker.speaker_id,
        "gender": session.speaker.gender,
        "age_range": session.speaker.age_range,
        "native_language": session.speaker.native_language,
        "scenario_id": scenario_id,
        "scenario_intended_emotion": scenario_intended,
        "self_reported_emotion": self_reported_emotion,
        "intensity_score": round(intensity_score, 1),
        "valence": round(valence, 2) if valence is not None else "",
        "arousal": round(arousal, 2) if arousal is not None else "",
        "duration_sec": round(duration_sec, 3),
        "sample_rate": SAMPLE_RATE,
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "split": "unassigned",
    }

    with _csv_lock:
        with open(METADATA_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=METADATA_COLUMNS)
            writer.writerow(row)

    session.completed += 1
    return filename


def get_global_stats() -> dict:
    """Return global dataset statistics."""
    _init_dataset_dir()

    stats = {
        "total_clips": 0,
        "per_emotion": {},
        "active_sessions": len(_sessions),
        "total_speakers": set(),
    }

    if METADATA_CSV.exists():
        with open(METADATA_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                stats["total_clips"] += 1
                emotion = row.get("self_reported_emotion", "Unknown")
                stats["per_emotion"][emotion] = stats["per_emotion"].get(emotion, 0) + 1
                stats["total_speakers"].add(row.get("speaker_id", ""))

    stats["total_speakers"] = len(stats["total_speakers"])
    return stats
