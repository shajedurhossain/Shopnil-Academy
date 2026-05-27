# =============================================================================
# Shopnil Academy - Auto-start Setup
# Registers the watcher so it launches automatically at every Windows login.
#
# METHOD A (preferred) — Task Scheduler: run this script as Administrator.
# METHOD B (no-admin)  — Startup folder shortcut: works without elevation.
#
# The script detects which method is available and uses the best one.
# Usage: powershell -ExecutionPolicy Bypass -File setup-autostart.ps1
# =============================================================================

$TaskName    = "ShopnilAcademy-Watcher"
$WatcherPath = Join-Path $PSScriptRoot "watcher.ps1"
$StartupDir  = [System.IO.Path]::Combine(
                   $env:APPDATA,
                   "Microsoft\Windows\Start Menu\Programs\Startup")
$ShortcutPath = Join-Path $StartupDir "ShopnilAcademy-Watcher.lnk"

Write-Host ""
Write-Host "  Shopnil Academy - Autostart Setup" -ForegroundColor Green
Write-Host ""

# ── Detect administrator rights ───────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
               [Security.Principal.WindowsBuiltInRole]::Administrator)

# ── METHOD A: Task Scheduler (requires Admin) ─────────────────────────────────
if ($isAdmin) {
    Write-Host "  [Admin detected] Using Task Scheduler method." -ForegroundColor Cyan

    # Remove existing task if it exists
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "  Removed previous task." -ForegroundColor Yellow
    }

    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Minimized -File `"$WatcherPath`""

    $trigger   = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    $settings  = New-ScheduledTaskSettingsSet `
                     -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
                     -RestartCount 3 `
                     -RestartInterval (New-TimeSpan -Minutes 1) `
                     -MultipleInstances IgnoreNew

    Register-ScheduledTask `
        -TaskName  $TaskName `
        -Action    $action `
        -Trigger   $trigger `
        -Principal $principal `
        -Settings  $settings `
        -Force | Out-Null

    Write-Host "  Task '$TaskName' registered in Task Scheduler." -ForegroundColor Green
    Write-Host "  The watcher starts automatically at every login."
    Write-Host ""
    Write-Host "  Start it now (without rebooting):" -ForegroundColor Cyan
    Write-Host "    Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host ""
    Write-Host "  Remove autostart later:" -ForegroundColor Cyan
    Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"

# ── METHOD B: Startup folder shortcut (no Admin needed) ──────────────────────
} else {
    Write-Host "  [No admin] Using Startup folder method." -ForegroundColor Yellow
    Write-Host "  (Re-run as Administrator for the Task Scheduler method instead.)"
    Write-Host ""

    # Remove old shortcut if it exists
    if (Test-Path $ShortcutPath) {
        Remove-Item $ShortcutPath -Force
        Write-Host "  Removed previous shortcut." -ForegroundColor Yellow
    }

    # Create a hidden-window VBScript launcher so no console flashes at login
    $vbsPath = Join-Path $PSScriptRoot "launch-watcher-silent.vbs"
    $vbs = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Minimized -File """ & "$WatcherPath" & """", 0, False
"@
    Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII

    # Create the shortcut in the Startup folder pointing to the VBS launcher
    $shell    = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath       = "wscript.exe"
    $shortcut.Arguments        = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Description      = "Shopnil Academy File Watcher"
    $shortcut.WindowStyle      = 7   # minimised
    $shortcut.Save()

    Write-Host "  Startup shortcut created:" -ForegroundColor Green
    Write-Host "    $ShortcutPath"
    Write-Host "  The watcher will start silently at every login."
    Write-Host ""
    Write-Host "  Remove autostart later:" -ForegroundColor Cyan
    Write-Host "    Remove-Item `"$ShortcutPath`" -Force"
    Write-Host "    Remove-Item `"$vbsPath`" -Force"
}

Write-Host ""
