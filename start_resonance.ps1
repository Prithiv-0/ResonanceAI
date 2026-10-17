Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Resonance Speech Emotion Recognition Platform" -ForegroundColor Cyan
Write-Host "  1. Backend API: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  2. Frontend:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$PSScriptRoot\start_backend.ps1"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$PSScriptRoot\start_frontend.ps1"

Write-Host "Both services launched in separate windows." -ForegroundColor Green
Write-Host "Opening http://localhost:5173..." -ForegroundColor Green
Start-Process "http://localhost:5173"
