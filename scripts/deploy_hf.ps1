# ==============================================================================
# Resonance SER Platform - Automated Hugging Face Spaces Deployment Script
# ==============================================================================
param(
    [string]$Username,
    [string]$SpaceName = "resonance-ser",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Resonance SER — Hugging Face Spaces Cloud Deployment Script       " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. Verify Git and Git LFS
try {
    $null = git --version
} catch {
    Write-Error "Git is not installed or not in your PATH. Please install Git: https://git-scm.com/"
    exit 1
}

try {
    $null = git lfs version
} catch {
    Write-Error "Git LFS is not installed. Run 'git lfs install' or download from: https://git-lfs.com/"
    exit 1
}

# 2. Get User Inputs if not provided
if (-not $Username) {
    Write-Host "`nTo deploy, you need a free Hugging Face account (https://huggingface.co/join)." -ForegroundColor Yellow
    $Username = Read-Host "Enter your Hugging Face Username"
    if (-not $Username) {
        Write-Error "Username is required."
        exit 1
    }
}

if (-not $SpaceName) {
    $SpaceName = Read-Host "Enter your Space name [default: resonance-ser]"
    if (-not $SpaceName) { $SpaceName = "resonance-ser" }
}

$SpaceUrl = "https://huggingface.co/spaces/$Username/$SpaceName"
$LiveAppUrl = "https://$($Username.ToLower())-$($SpaceName.ToLower()).hf.space"

Write-Host "`nTarget Space: $SpaceUrl" -ForegroundColor Green
Write-Host "Target Live App URL: $LiveAppUrl`n" -ForegroundColor Green

# 3. Initialize Git if needed
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-Path ".git")) {
    Write-Host "Initializing local git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# 4. Initialize Git LFS
Write-Host "Configuring Git LFS for AI model weights..." -ForegroundColor Yellow
git lfs install
git lfs track "*.pt" "*.bin" "*.safetensors" "*.onnx"

# 5. Set or update remote
$remotes = git remote
if ($remotes -contains "space") {
    Write-Host "Updating existing 'space' git remote..." -ForegroundColor Yellow
    git remote set-url space $SpaceUrl
} else {
    Write-Host "Adding 'space' git remote ($SpaceUrl)..." -ForegroundColor Yellow
    git remote add space $SpaceUrl
}

# 6. Build frontend dist to ensure latest build is ready
Write-Host "`nBuilding React frontend..." -ForegroundColor Yellow
npm --prefix frontend run build

# 7. Stage and commit
Write-Host "`nStaging files and models for deployment..." -ForegroundColor Yellow
git add .gitattributes .gitignore Dockerfile docker-compose.yml render.yaml README.md backend frontend scripts
git commit -m "Deploy Resonance SER platform with full neural model suite" --allow-empty

# 8. Push to Hugging Face Spaces
Write-Host "`nPushing to Hugging Face Spaces ($SpaceUrl)..." -ForegroundColor Cyan
Write-Host "NOTE: When prompted for password, enter your Hugging Face Access Token (write permission)" -ForegroundColor Yellow
Write-Host "Get your token at: https://huggingface.co/settings/tokens`n" -ForegroundColor Yellow

try {
    git push -u space main --force
    Write-Host "`n====================================================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT PUSH SUCCESSFUL!                                       " -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "Hugging Face is building your container (takes ~2-4 minutes)." -ForegroundColor White
    Write-Host "Track build progress at: $SpaceUrl" -ForegroundColor Cyan
    Write-Host "Your live application will be available at:" -ForegroundColor White
    Write-Host "  $LiveAppUrl" -ForegroundColor Green
    Write-Host "====================================================================`n" -ForegroundColor Green
} catch {
    Write-Host "`nPush encountered an issue. Please verify:" -ForegroundColor Red
    Write-Host "1. You created the Space at https://huggingface.co/new-space (Choose Docker -> Blank)." -ForegroundColor Yellow
    Write-Host "2. Your token has WRITE permissions." -ForegroundColor Yellow
    Write-Host "3. You can also run manually: git push space main`n" -ForegroundColor Yellow
}
