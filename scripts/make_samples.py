"""Generate synthetic sample WAV files into ./samples (speech-like signals, NOT real speech)."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.synth import speech_like, to_wav_bytes  # noqa: E402

out = ROOT / "samples"
out.mkdir(exist_ok=True)
specs = {
    "synthetic_low_pitch.wav": dict(duration_s=4.0, f0_base=110, vibrato=0.04, syllable_rate=2.2, level=0.35, seed=1),
    "synthetic_mid_pitch.wav": dict(duration_s=4.0, f0_base=170, vibrato=0.08, syllable_rate=3.5, level=0.5, seed=2),
    "synthetic_high_pitch.wav": dict(duration_s=4.0, f0_base=240, vibrato=0.18, syllable_rate=5.0, level=0.8, seed=3),
}
for name, kw in specs.items():
    (out / name).write_bytes(to_wav_bytes(speech_like(**kw)))
    print("wrote", out / name)
