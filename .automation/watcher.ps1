# =============================================================================
# Shopnil Academy - Auto-publish Watcher
# Monitors E:\SA for new .html/.css files and syncs them to the repo,
# then commits and pushes to GitHub Pages.
#
# TWO routing modes — detected automatically:
#
#   MIRROR MODE  (files inside a subfolder of E:\SA)
#     E:\SA\courses\german-bangla\index.html
#       → repo\courses\german-bangla\index.html
#     E:\SA\blog\my-post.html
#       → repo\blog\my-post.html
#     Works for any subfolder depth — the path is mirrored as-is.
#
#   FILENAME MODE  (files dropped directly into the root of E:\SA)
#     course-[name].html  → courses/[name]/index.html
#     course-[name].css   → courses/[name]/[filename]
#     blog-[name].html    → blog/[name].html
#     lesson-[course]-[name].* → courses/[course]/lessons/[name].*
#     anything else       → repo root
#
# Usage: powershell -ExecutionPolicy Bypass -File watcher.ps1
# =============================================================================

$WatchFolder = "E:\SA"
$RepoFolder  = "G:\My Drive\Shopnil-Academy"
$LogFile     = Join-Path $PSScriptRoot "watcher.log"

# ── Logging ──────────────────────────────────────────────────────────────────

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

# ── Filename-mode routing (root-level files only) ─────────────────────────────

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
        $remainder   = $Matches[1]
        $coursesRoot = Join-Path $RepoFolder "courses"
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

    return $FileName   # repo root
}

# ── Resolve destination path for any file ────────────────────────────────────

function Get-Destination {
    param([string]$FilePath)

    $watchRoot = $WatchFolder.TrimEnd('\') + '\'

    # Is the file inside a subfolder of E:\SA ?
    $relativePath = $FilePath.Substring($watchRoot.Length)   # e.g. "courses\german-bangla\index.html"
    $parts        = $relativePath -split '\\'

    if ($parts.Count -gt 1) {
        # MIRROR MODE — preserve the full relative path
        return $relativePath
    } else {
        # FILENAME MODE — route by filename prefix
        return Get-FilenameDestination -FileName $parts[0]
    }
}

# ── Wait until a file is fully written ───────────────────────────────────────

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

# ── Git commit + push ─────────────────────────────────────────────────────────

function Invoke-GitPublish {
    param([string[]]$MovedFiles)

    if ($MovedFiles.Count -eq 0) { return }

    $summary = if ($MovedFiles.Count -eq 1) { $MovedFiles[0] } else { "$($MovedFiles.Count) files" }
    $msg     = "publish: $summary"

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

# ── Main polling loop ─────────────────────────────────────────────────────────

if (-not (Test-Path $WatchFolder)) {
    Write-Log "Watch folder not found: $WatchFolder" "ERROR"
    exit 1
}

Write-Log "Watcher started. Monitoring: $WatchFolder"
Write-Host ""
Write-Host "  Shopnil Academy Auto-Publisher" -ForegroundColor Green
Write-Host "  Watching : $WatchFolder"
Write-Host "  Repo     : $RepoFolder"
Write-Host "  Log      : $LogFile"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

$inProgress = @{}

while ($true) {
    # Scan recursively for all .html and .css files anywhere under E:\SA
    $files = Get-ChildItem -Path $WatchFolder -Recurse -File -ErrorAction SilentlyContinue |
             Where-Object { $_.Extension -in @('.html', '.css') }

    $movedThisCycle = [System.Collections.Generic.List[string]]::new()

    foreach ($file in $files) {
        $key = $file.FullName
        if ($inProgress.ContainsKey($key)) { continue }
        $inProgress[$key] = $true

        try {
            if (-not (Wait-FileReady -FilePath $file.FullName)) {
                Write-Log "Skipped (file locked after 15s): $($file.Name)" "ERROR"
                continue
            }

            $relDest  = Get-Destination -FilePath $file.FullName
            $destFull = Join-Path $RepoFolder $relDest
            $destDir  = [System.IO.Path]::GetDirectoryName($destFull)

            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                Write-Log "Created dir : $destDir"
            }

            Copy-Item -Path $file.FullName -Destination $destFull -Force
            Remove-Item -Path $file.FullName -Force
            Write-Log "Moved  $($file.Name)  →  $relDest"
            $movedThisCycle.Add($file.Name)

        } catch {
            Write-Log "Error processing $($file.Name): $_" "ERROR"
        } finally {
            $inProgress.Remove($key)
        }
    }

    # One git push per cycle (batches all files moved this round)
    if ($movedThisCycle.Count -gt 0) {
        Invoke-GitPublish -MovedFiles $movedThisCycle.ToArray()
    }

    Start-Sleep -Seconds 3
}
