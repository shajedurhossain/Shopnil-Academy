# =============================================================================
# Shopnil Academy - Manual Publish Script
# Runs git add . → commit → push origin main
#
# Usage:
#   .\publish.ps1                          # uses default commit message
#   .\publish.ps1 "your commit message"    # custom commit message
# =============================================================================

param(
    [string]$Message = ""
)

$RepoFolder = "G:\My Drive\Shopnil-Academy"

# Build commit message
if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "publish: manual update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host ""
Write-Host "  Shopnil Academy Publisher" -ForegroundColor Green
Write-Host "  Repo   : $RepoFolder"
Write-Host "  Commit : $Message"
Write-Host ""

Push-Location $RepoFolder
try {
    Write-Host ">> git add ." -ForegroundColor Yellow
    git add .

    Write-Host ">> git commit" -ForegroundColor Yellow
    $commitOut = git commit -m $Message 2>&1
    Write-Host $commitOut

    if ($commitOut -match 'nothing to commit') {
        Write-Host "Nothing to commit — repo is already up to date." -ForegroundColor Cyan
        exit 0
    }

    Write-Host ">> git push origin main" -ForegroundColor Yellow
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  Published successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Push failed. Check your git credentials or network." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
