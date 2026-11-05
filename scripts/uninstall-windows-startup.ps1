$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupFolder, 'EcoGlobal-Attendance-Connector.lnk')

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Output "SUCCESS: Removed Startup shortcut $shortcutPath"
} else {
    Write-Output "Shortcut not found in Startup folder."
}
