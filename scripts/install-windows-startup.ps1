$WshShell = New-Object -ComObject WScript.Shell
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, 'EcoGlobal-Attendance-Connector.lnk')

$targetBat = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\start-connector.bat'))

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetBat
$Shortcut.WorkingDirectory = [System.IO.Path]::GetDirectoryName($targetBat)
$Shortcut.Description = 'EcoGlobal Trading BD - MB460 Biometric Connector Auto-Start'
$Shortcut.WindowStyle = 7 # Minimized
$Shortcut.Save()

Write-Output "SUCCESS: Created Startup shortcut at $shortcutPath pointing to $targetBat"
