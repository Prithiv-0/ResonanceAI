Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Resonance Frontend (Vite + React)" -ForegroundColor Cyan
Write-Host "  Listening on http://localhost:5173" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"
try {
    npm run dev
} finally {
    Pop-Location
}
