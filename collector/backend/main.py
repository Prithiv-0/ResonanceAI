"""
RESONANCE Studio Booth — FastAPI Server

REST API for the data collection frontend.
Receives audio clips, processes them, and stores them in the dataset.
"""

import io
import zipfile
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.responses import FileResponse

from audio_processor import AudioProcessingError, process_upload
from config import AUDIO_DIR, DATASET_DIR, METADATA_CSV
from scenarios import SCENARIO_BANK
from session_manager import (
    SpeakerInfo,
    create_session,
    get_global_stats,
    get_session,
    save_clip,
)

app = FastAPI(
    title="Resonance Studio Booth API",
    description="Speech emotion data collection backend",
    version="1.0.0",
)

# Allow the Vite dev server and any tunnel origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──

class CreateSessionRequest(BaseModel):
    speaker_id: str
    gender: str  # M / F / O
    age_range: str = ""
    native_language: str = ""


class CreateSessionResponse(BaseModel):
    session_id: str
    total_scenarios: int
    scenarios: list[dict]


class UploadResponse(BaseModel):
    status: str
    filename: str
    quality: dict


class SessionStatusResponse(BaseModel):
    session_id: str
    speaker_id: str
    completed: int
    total: int


class GlobalStatusResponse(BaseModel):
    total_clips: int
    per_emotion: dict
    active_sessions: int
    total_speakers: int


# ── Endpoints ──

@app.post("/api/session", response_model=CreateSessionResponse)
async def api_create_session(req: CreateSessionRequest):
    """Create a new recording session for a participant."""
    speaker = SpeakerInfo(
        speaker_id=req.speaker_id,
        gender=req.gender,
        age_range=req.age_range,
        native_language=req.native_language,
    )
    state = create_session(speaker)

    scenarios_out = [
        {
            "id": s.id,
            "text": s.text,
            "instruction": s.instruction,
            # NOTE: intended_emotion is NOT sent to the participant
            # to avoid priming their self-report
        }
        for s in state.scenarios
    ]

    return CreateSessionResponse(
        session_id=state.session_id,
        total_scenarios=len(state.scenarios),
        scenarios=scenarios_out,
    )


@app.post("/api/upload", response_model=UploadResponse)
async def api_upload_clip(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    scenario_id: str = Form(...),
    self_reported_emotion: str = Form(...),
    intensity_score: float = Form(...),
    valence: Optional[float] = Form(None),
    arousal: Optional[float] = Form(None),
):
    """
    Upload a single recorded clip with its annotation.

    Accepts multipart form data with the audio blob and metadata fields.
    """
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")

    # Read the audio bytes
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Process the audio
    try:
        wav_bytes, quality = process_upload(audio_bytes, audio.filename or "recording.webm")
    except AudioProcessingError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Save to dataset
    filename = save_clip(
        session_id=session_id,
        scenario_id=scenario_id,
        wav_bytes=wav_bytes,
        self_reported_emotion=self_reported_emotion,
        intensity_score=intensity_score,
        duration_sec=quality.duration_sec,
        valence=valence,
        arousal=arousal,
    )

    return UploadResponse(
        status="ok",
        filename=filename,
        quality=asdict(quality),
    )


@app.get("/api/status", response_model=GlobalStatusResponse)
async def api_global_status():
    """Get global dataset statistics."""
    stats = get_global_stats()
    return GlobalStatusResponse(**stats)


@app.get("/api/session/{session_id}", response_model=SessionStatusResponse)
async def api_session_status(session_id: str):
    """Get progress for a specific session."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")

    return SessionStatusResponse(
        session_id=session.session_id,
        speaker_id=session.speaker.speaker_id,
        completed=session.completed,
        total=len(session.scenarios),
    )


@app.get("/api/scenarios")
async def api_get_scenarios():
    """Get all available scenarios (for client-side caching)."""
    return [
        {
            "id": s.id,
            "text": s.text,
            "instruction": s.instruction,
            "intended_emotion": s.intended_emotion,
        }
        for s in SCENARIO_BANK
    ]


@app.get("/api/export")
async def api_export_dataset():
    """Export the entire collected dataset (metadata.csv + audio WAVs) as a ZIP file."""
    if not DATASET_DIR.exists():
        raise HTTPException(status_code=404, detail="No dataset folder found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zip_file:
        if METADATA_CSV.exists():
            zip_file.write(METADATA_CSV, arcname="metadata.csv")

        if AUDIO_DIR.exists():
            for wav_path in AUDIO_DIR.glob("*.wav"):
                zip_file.write(wav_path, arcname=f"audio/{wav_path.name}")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=resonance_dataset.zip"},
    )



# ── Static Frontend Serving & SPA Fallback ──

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "Resonance Studio Booth API running. Frontend not built."}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not catch API or documentation endpoints
        if full_path.startswith("api") or full_path in ("docs", "openapi.json", "redoc"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="File Not Found")

