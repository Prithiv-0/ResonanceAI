# ==============================================================================
# Resonance SER — Hybrid Local Models + Public Cloudflare Tunnel
# ==============================================================================
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot ".")
Set-Location $repoRoot

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Resonance SER — Hybrid Local AI Engine + Public Cloudflare Tunnel  " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Starting local FastAPI backend (Port 8000)..." -ForegroundColor Yellow
Write-Host "      Running all 5 AI models with FULL PC RAM (No 512MB limit!)" -ForegroundColor Gray

Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$repoRoot\backend`" && py -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

Write-Host "`n[2/2] Launching Cloudflare Public HTTPS Tunnel..." -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "Look for the public tunnel URL below (ends in .trycloudflare.com)" -ForegroundColor White
Write-Host "Copy that URL, add /api at the end, and paste it into the online UI!" -ForegroundColor White
Write-Host "Example: https://random-name.trycloudflare.com/api" -ForegroundColor Green
Write-Host "Online UI: https://kenaike-resonance-ser.static.hf.space" -ForegroundColor Cyan
Write-Host "====================================================================`n" -ForegroundColor Green

& "$repoRoot\scripts\cloudflared.exe" tunnel --url http://127.0.0.1:8000
