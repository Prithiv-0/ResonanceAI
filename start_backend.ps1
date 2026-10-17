Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Resonance Backend Service (FastAPI)" -ForegroundColor Cyan
Write-Host "  Listening on http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\backend"
try {
    py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
} finally {
    Pop-Location
}
