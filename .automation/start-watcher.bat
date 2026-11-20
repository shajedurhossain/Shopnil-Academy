@echo off
title Shopnil Academy - File Watcher
echo.
echo  Starting Shopnil Academy file watcher...
echo  Watching: G:\My Drive\Shopnil-Academy
echo  Any change in that folder is auto-published to GitHub.
echo  Close this window to stop.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0watcher.ps1"
pause
