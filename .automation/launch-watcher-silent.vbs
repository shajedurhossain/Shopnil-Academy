Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Minimized -File """ & "G:\My Drive\Shopnil-Academy\.automation\watcher.ps1" & """", 0, False
