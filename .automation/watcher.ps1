# ==============================================================================
# Shopnil Academy - Auto-publish Watcher
# Monitors two locations and auto-pushes changes to GitHub Pages.
#
# 1. E:\SA  (drop zone)
#    Mirror mode  : E:\SA\courses\german-bangla\index.html
#                    -> repo\courses\german-bangla\index.html
#    Filename mode: course-[name].html  -> courses/[name]/index.html
#                   blog-[name].html    -> blog/[name].html
#                   lesson-[c]-[n].*   -> courses/[c]/lessons/[n].*
#                   anything else      -> repo root
#
# 2. G:\My Drive\Shopnil-Academy  (repo folder)
#    Any change detected by git status triggers an auto-commit and push.
#
# Usage: powershell -ExecutionPolicy Bypass -File watcher.ps1
# ==============================================================================

$WatchFolder    = "E:\SA"
$RepoFolder     = "G:\My Drive\Shopnil-Academy"
$LogFile        = Join-Path $PSScriptRoot "watcher.log"
$RepoIgnoreDirs = @('.git', '.automation')

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

# --- Resolve destination for a file from E:\SA --------------------------------

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
    $retries = 0
    while ($retries -lt 15) {
        try {
            $s = [System.IO.File]::Open($FilePath, 'Open', 'Read', 'None')
            $s.Close()
            return $true
        } catch {
            Start-Sleep -Seconds 1
            $retries++
        }
    }
    return $false
}

# --- Check if repo has uncommitted changes ------------------------------------

function Get-RepoDirty {
    Push-Location $RepoFolder
    try {
        $status = git status --porcelain 2>&1
        return ($null -ne $status -and $status.ToString().Trim() -ne '')
    } finally {
        Pop-Location
    }
}

# --- Git commit and push ------------------------------------------------------

function Invoke-GitPublish {
    param([string[]]$ChangedFiles, [string]$Source = "")
    if ($ChangedFiles.Count -eq 0) { return }
    $summary = if ($ChangedFiles.Count -eq 1) { $ChangedFiles[0] } else { "$($ChangedFiles.Count) files" }
    $prefix  = if ($Source) { "[$Source] " } else { "" }
    $msg     = "publish: $prefix$summary"

    Push-Location $RepoFolder
    try {
        git add . | Out-Null
        $commitOut = git commit -m $msg 2>&1
        if ($commitOut -match 'nothing to commit') {
            Write-Log "Nothing new to commit."
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

# --- Startup checks -----------------------------------------------------------

if (-not (Test-Path $WatchFolder)) {
    Write-Log "Drop zone not found: $WatchFolder" "ERROR"
    exit 1
}
if (-not (Test-Path $RepoFolder)) {
    Write-Log "Repo folder not found: $RepoFolder" "ERROR"
    exit 1
}

Write-Log "Watcher started."
Write-Host ""
Write-Host "  Shopnil Academy Auto-Publisher" -ForegroundColor Green
Write-Host "  Drop zone : $WatchFolder"
Write-Host "  Repo      : $RepoFolder"
Write-Host "  Log       : $LogFile"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

$inProgress = @{}

# --- Main polling loop --------------------------------------------------------

while ($true) {

    # 1. Process drop zone (E:\SA)
    $dropFiles = Get-ChildItem -Path $WatchFolder -Recurse -File -ErrorAction SilentlyContinue |
                 Where-Object { $_.Extension -in @('.html', '.css') }

    $movedThisCycle = [System.Collections.Generic.List[string]]::new()

    foreach ($file in $dropFiles) {
        $key = $file.FullName
        if ($inProgress.ContainsKey($key)) { continue }
        $inProgress[$key] = $true
        try {
            if (-not (Wait-FileReady -FilePath $file.FullName)) {
                Write-Log "Skipped (locked): $($file.Name)" "ERROR"
                continue
            }
            $relDest  = Get-DropZoneDestination -FilePath $file.FullName
            $destFull = Join-Path $RepoFolder $relDest
            $destDir  = [System.IO.Path]::GetDirectoryName($destFull)
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                Write-Log "Created dir: $destDir"
            }
            Copy-Item -Path $file.FullName -Destination $destFull -Force
            Remove-Item -Path $file.FullName -Force
            Write-Log "Moved $($file.Name) -> $relDest"
            $movedThisCycle.Add($file.Name)
        } catch {
            Write-Log "Error (drop zone) $($file.Name): $_" "ERROR"
        } finally {
            $inProgress.Remove($key)
        }
    }

    if ($movedThisCycle.Count -gt 0) {
        Invoke-GitPublish -ChangedFiles $movedThisCycle.ToArray() -Source "drop"
    }

    # 2. Watch repo folder for direct edits (via git status)
    if ($movedThisCycle.Count -eq 0 -and (Get-RepoDirty)) {
        Write-Log "Repo has uncommitted changes - pushing..."
        Invoke-GitPublish -ChangedFiles @("repo update") -Source "repo"
    }

    Start-Sleep -Seconds 3
}
