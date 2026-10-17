Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  1. Running Backend Pytest Test Suite" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\backend"
try {
    py -m pytest -q
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend tests failed!"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  2. Building Frontend (TypeScript check and Vite build)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed!"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  All Tests and Builds Passed Successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
