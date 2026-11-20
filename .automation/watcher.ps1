# ==============================================================================
# Shopnil Academy - Auto-publish Watcher
# Watches ONLY the repo folder. Any new/edited/deleted file (that git does not
# ignore) is automatically committed and pushed to GitHub (origin/main).
# ==============================================================================

$RepoFolder = "G:\My Drive\Shopnil-Academy"
$LogFile    = Join-Path $PSScriptRoot "watcher.log"

# --- Single-instance guard (named mutex, atomic) ------------------------------

$mutex    = New-Object System.Threading.Mutex($false, "Global\ShopnilAcademyWatcher")
$acquired = $mutex.WaitOne(0)
if (-not $acquired) {
    Write-Host "Watcher is already running. Close the other window first." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    exit 0
}

# --- Logging ------------------------------------------------------------------

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line
    if ($Level -eq "ERROR") {
        Write-Host $line -ForegroundColor Red
    } else {
        Write-Host $line -ForegroundColor Cyan
    }
}

# --- Check if repo has uncommitted changes ------------------------------------

function Get-RepoDirty {
    Push-Location $RepoFolder
    try {
        $out = git status --porcelain 2>&1
        return ($null -ne $out -and "$out".Trim() -ne '')
    } finally {
        Pop-Location
    }
}

# --- Remove stale git lock if present -----------------------------------------

function Remove-GitLock {
    $lock = Join-Path $RepoFolder ".git\index.lock"
    if (Test-Path $lock) {
        Remove-Item $lock -Force -ErrorAction SilentlyContinue
        Write-Log "Removed stale index.lock"
    }
}

# --- Git pull + commit + push -------------------------------------------------

function Invoke-GitPublish {
    Remove-GitLock

    Push-Location $RepoFolder
    try {
        git add . | Out-Null

        $msg       = "publish: [repo] repo update"
        $commitOut = git commit -m $msg 2>&1
        if ("$commitOut" -match 'nothing to commit') {
            Write-Log "Nothing to commit."
            return
        }

        # Pull remote changes (e.g. edits made on github.com) before pushing
        $pullOut = git pull origin main 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Pull failed: $pullOut" "ERROR"
            return
        }

        $pushOut = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pushed: $msg"
        } else {
            Write-Log "Push failed: $pushOut" "ERROR"
        }
    } catch {
        Write-Log "Git error: $_" "ERROR"
    } finally {
        Pop-Location
    }
}

# --- Startup ------------------------------------------------------------------

if (-not (Test-Path $RepoFolder)) { Write-Log "Repo not found: $RepoFolder" "ERROR"; exit 1 }

Remove-GitLock

Write-Log "Watcher started (PID $PID). Watching repo only: $RepoFolder"
Write-Host ""
Write-Host "  Shopnil Academy Auto-Publisher" -ForegroundColor Green
Write-Host "  Watching : $RepoFolder"
Write-Host "  Log      : $LogFile"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

$lastPushTime = [datetime]::MinValue

# --- Main polling loop --------------------------------------------------------

while ($true) {
    $cooldownOk = ([datetime]::UtcNow - $lastPushTime).TotalSeconds -gt 5
    if ($cooldownOk -and (Get-RepoDirty)) {
        Write-Log "Repo has uncommitted changes - pushing..."
        try { Invoke-GitPublish }
        finally { $lastPushTime = [datetime]::UtcNow }
    }
    Start-Sleep -Seconds 3
}
