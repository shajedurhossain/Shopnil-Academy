# =============================================================================
# Shopnil Academy - Auto-publish Watcher
# Monitors E:\SA for new .html/.css files and routes them to the correct
# location in the local repo, then commits and pushes to GitHub Pages.
#
# Filename routing conventions:
#   course-[name].html        → courses/[name]/index.html
#   course-[name].css         → courses/[name]/[filename]
#   blog-[name].html/.css     → blog/[name].[ext]
#   lesson-[course]-[name].*  → courses/[course]/lessons/[name].[ext]
#   anything else             → repo root
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

# ── File routing ─────────────────────────────────────────────────────────────

function Get-Destination {
    param([string]$FileName)

    $base = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $ext  = [System.IO.Path]::GetExtension($FileName).ToLower()

    if ($base -match '^course-(.+)$') {
        $courseName = $Matches[1]
        $destFile   = if ($ext -eq '.html') { 'index.html' } else { $FileName }
        return @{ RelPath = "courses\$courseName\$destFile"; Dir = "courses\$courseName" }
    }

    if ($base -match '^blog-(.+)$') {
        $blogName = $Matches[1]
        return @{ RelPath = "blog\$blogName$ext"; Dir = "blog" }
    }

    if ($base -match '^lesson-(.+)$') {
        $remainder   = $Matches[1]   # everything after "lesson-"
        $coursesRoot = Join-Path $RepoFolder "courses"

        # Find the longest known course-folder name that is a prefix of $remainder
        # e.g. remainder = "german-bangla-unit1", known folders = ["german-bangla","spanish-bangla"]
        # → matched course = "german-bangla", lesson = "unit1"
        $matchedCourse = $null
        $matchedLesson = $null

        if (Test-Path $coursesRoot) {
            $courseFolders = Get-ChildItem -Path $coursesRoot -Directory |
                             Select-Object -ExpandProperty Name |
                             Sort-Object { $_.Length } -Descending   # longest first

            foreach ($cf in $courseFolders) {
                $prefix = "$cf-"
                if ($remainder.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $matchedCourse = $cf
                    $matchedLesson = $remainder.Substring($prefix.Length)
                    break
                }
            }
        }

        # Fallback: first hyphen-delimited segment is the course name
        if (-not $matchedCourse) {
            if ($remainder -match '^([^-]+)-(.+)$') {
                $matchedCourse = $Matches[1]
                $matchedLesson = $Matches[2]
            } else {
                $matchedCourse = $remainder
                $matchedLesson = "index"
            }
        }

        return @{ RelPath = "courses\$matchedCourse\lessons\$matchedLesson$ext"
                  Dir     = "courses\$matchedCourse\lessons" }
    }

    # Fallback: repo root
    return @{ RelPath = $FileName; Dir = "" }
}

# ── Git push ─────────────────────────────────────────────────────────────────

function Invoke-GitPublish {
    param([string]$CommitMessage)

    Push-Location $RepoFolder
    try {
        $addOut    = git add . 2>&1
        $commitOut = git commit -m $CommitMessage 2>&1
        if ($LASTEXITCODE -ne 0 -and $commitOut -match 'nothing to commit') {
            Write-Log "Nothing new to commit."
            return
        }
        $pushOut = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pushed: $CommitMessage"
        } else {
            Write-Log "Push failed: $pushOut" "ERROR"
        }
    } catch {
        Write-Log "Git error: $_" "ERROR"
    } finally {
        Pop-Location
    }
}

# ── Process a single file ────────────────────────────────────────────────────

function Invoke-ProcessFile {
    param([string]$FilePath)

    $fileName = [System.IO.Path]::GetFileName($FilePath)
    $ext      = [System.IO.Path]::GetExtension($fileName).ToLower()

    if ($ext -notin @('.html', '.css')) { return }
    if (-not (Test-Path $FilePath))     { return }

    # Wait for the file to finish writing (e.g. browser download still flushing)
    $retries = 0
    while ($retries -lt 10) {
        try {
            $stream = [System.IO.File]::Open($FilePath, 'Open', 'Read', 'None')
            $stream.Close()
            break
        } catch {
            Start-Sleep -Seconds 1
            $retries++
        }
    }

    $dest     = Get-Destination -FileName $fileName
    $destFull = Join-Path $RepoFolder $dest.RelPath

    # Create destination directory if it doesn't exist
    $destDir = [System.IO.Path]::GetDirectoryName($destFull)
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Write-Log "Created directory: $destDir"
    }

    Move-Item -Path $FilePath -Destination $destFull -Force
    Write-Log "Moved  $fileName  →  $($dest.RelPath)"

    Invoke-GitPublish -CommitMessage "publish: $fileName"
}

# ── Main polling loop ────────────────────────────────────────────────────────

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
    $files = Get-ChildItem -Path $WatchFolder -File -ErrorAction SilentlyContinue |
             Where-Object { $_.Extension -in @('.html', '.css') }

    foreach ($file in $files) {
        $key = $file.FullName
        if (-not $inProgress.ContainsKey($key)) {
            $inProgress[$key] = $true
            try {
                Invoke-ProcessFile -FilePath $file.FullName
            } catch {
                Write-Log "Failed to process $($file.Name): $_" "ERROR"
            } finally {
                $inProgress.Remove($key)
            }
        }
    }

    Start-Sleep -Seconds 3
}
