# ==============================================================================
# Shopnil Academy - Auto-publish Watcher
# ==============================================================================

$WatchFolder    = "E:\SA"
$RepoFolder     = "G:\My Drive\Shopnil-Academy"
$LogFile        = Join-Path $PSScriptRoot "watcher.log"
$PidFile        = Join-Path $PSScriptRoot "watcher.pid"
$RepoIgnoreDirs = @('.git', '.automation')

# --- Single-instance guard ----------------------------------------------------
# If another instance is already running, exit immediately.

if (Test-Path $PidFile) {
    $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        Write-Host "Watcher already running (PID $oldPid). Exiting." -ForegroundColor Yellow
        exit 0
    }
}
$PID | Set-Content $PidFile

# Clean up PID file on exit
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
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

# --- Filename-mode routing (root-level E:\SA files) ---------------------------

function Get-FilenameDestination {
    param([string]$FileName)
    $base = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $ext  = [System.IO.Path]::GetExtension($FileName).ToLower()

    if ($base -match '^course-(.+)$') {
        $n = $Matches[1]
        $f = if ($ext -eq '.html') { 'index.html' } else { $FileName }
        return "courses\$n\$f"
    }
    if ($base -match '^blog-(.+)$') {
        $n = $Matches[1]
        return "blog\$n$ext"
    }
    if ($base -match '^lesson-(.+)$') {
        $remainder     = $Matches[1]
        $coursesRoot   = Join-Path $RepoFolder "courses"
        $matchedCourse = $null
        $matchedLesson = $null
        if (Test-Path $coursesRoot) {
            $courseFolders = Get-ChildItem -Path $coursesRoot -Directory |
                             Select-Object -ExpandProperty Name |
                             Sort-Object { $_.Length } -Descending
            foreach ($cf in $courseFolders) {
                if ($remainder.StartsWith("$cf-", [System.StringComparison]::OrdinalIgnoreCase)) {
                    $matchedCourse = $cf
                    $matchedLesson = $remainder.Substring($cf.Length + 1)
                    break
                }
            }
        }
        if (-not $matchedCourse) {
            if ($remainder -match '^([^-]+)-(.+)$') {
                $matchedCourse = $Matches[1]; $matchedLesson = $Matches[2]
            } else {
                $matchedCourse = $remainder; $matchedLesson = "index"
            }
        }
        return "courses\$matchedCourse\lessons\$matchedLesson$ext"
    }
    return $FileName
}

# --- Resolve destination for a drop-zone file ---------------------------------

function Get-DropZoneDestination {
    param([string]$FilePath)
    $watchRoot    = $WatchFolder.TrimEnd('\') + '\'
    $relativePath = $FilePath.Substring($watchRoot.Length)
    $parts        = $relativePath -split '\\'
    if ($parts.Count -gt 1) {
        return $relativePath
    } else {
        return Get-FilenameDestination -FileName $parts[0]
    }
}

# --- Wait until a file is fully written ---------------------------------------

function Wait-FileReady {
    param([string]$FilePath)
    for ($i = 0; $i -lt 15; $i++) {
        try {
            $s = [System.IO.File]::Open($FilePath, 'Open', 'Read', 'None')
            $s.Close()
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
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
    param([string[]]$ChangedFiles, [string]$Source = "")

    if ($ChangedFiles.Count -eq 0) { return }

    $summary = if ($ChangedFiles.Count -eq 1) { $ChangedFiles[0] } else { "$($ChangedFiles.Count) files" }
    $msg     = "publish: $(if ($Source) { "[$Source] " })$summary"

    Remove-GitLock

    Push-Location $RepoFolder
    try {
        # Pull first so we never commit on top of a stale base
        $pullOut = git pull origin main 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Pull failed: $pullOut" "ERROR"
            return
        }

        git add . | Out-Null

        $commitOut = git commit -m $msg 2>&1
        if ("$commitOut" -match 'nothing to commit') {
            Write-Log "Nothing to commit after pull."
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

if (-not (Test-Path $WatchFolder)) { Write-Log "Drop zone not found: $WatchFolder" "ERROR"; exit 1 }
if (-not (Test-Path $RepoFolder))  { Write-Log "Repo not found: $RepoFolder" "ERROR"; exit 1 }

Remove-GitLock

Write-Log "Watcher started (PID $PID)."
Write-Host ""
Write-Host "  Shopnil Academy Auto-Publisher" -ForegroundColor Green
Write-Host "  Drop zone : $WatchFolder"
Write-Host "  Repo      : $RepoFolder"
Write-Host "  Log       : $LogFile"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

$inProgress     = @{}
$gitBusy        = $false
$lastPushTime   = [datetime]::MinValue

# --- Main polling loop --------------------------------------------------------

while ($true) {

    # 1. Process drop zone
    $dropFiles = Get-ChildItem -Path $WatchFolder -Recurse -File -ErrorAction SilentlyContinue |
                 Where-Object { $_.Extension -in @('.html', '.css') }

    $movedThisCycle = [System.Collections.Generic.List[string]]::new()

    foreach ($file in $dropFiles) {
        $key = $file.FullName
        if ($inProgress.ContainsKey($key)) { continue }
        $inProgress[$key] = $true
        try {
            if (-not (Wait-FileReady $file.FullName)) {
                Write-Log "Skipped (locked): $($file.Name)" "ERROR"; continue
            }
            $relDest  = Get-DropZoneDestination $file.FullName
            $destFull = Join-Path $RepoFolder $relDest
            $destDir  = Split-Path $destFull -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                Write-Log "Created dir: $destDir"
            }
            Copy-Item $file.FullName $destFull -Force
            Remove-Item $file.FullName -Force
            Write-Log "Moved $($file.Name) -> $relDest"
            $movedThisCycle.Add($file.Name)
        } catch {
            Write-Log "Error (drop zone) $($file.Name): $_" "ERROR"
        } finally {
            $inProgress.Remove($key)
        }
    }

    if ($movedThisCycle.Count -gt 0 -and -not $gitBusy) {
        $gitBusy = $true
        try { Invoke-GitPublish $movedThisCycle.ToArray() "drop" }
        finally { $gitBusy = $false; $lastPushTime = [datetime]::UtcNow }
    }

    # 2. Watch repo for direct edits — wait 5s after a push before re-checking
    $cooldownOk = ([datetime]::UtcNow - $lastPushTime).TotalSeconds -gt 5
    if ($movedThisCycle.Count -eq 0 -and -not $gitBusy -and $cooldownOk -and (Get-RepoDirty)) {
        Write-Log "Repo has uncommitted changes - pushing..."
        $gitBusy = $true
        try { Invoke-GitPublish @("repo update") "repo" }
        finally { $gitBusy = $false; $lastPushTime = [datetime]::UtcNow }
    }

    Start-Sleep -Seconds 3
}
