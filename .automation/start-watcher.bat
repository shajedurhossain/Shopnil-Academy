@echo off
title Shopnil Academy - File Watcher
echo.
echo  Starting Shopnil Academy file watcher...
echo  Drop .html or .css files into E:\SA to auto-publish.
echo  Close this window to stop.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0watcher.ps1"
pause
