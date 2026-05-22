# create-shortcuts.ps1
# Creates Windows Desktop Shortcuts for BrandCreator batch commands.

$ProjectRoot = "D:\Workspace\01_Projects\Active\BrandCreator_Ecosystem"
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')

Write-Host "Creating BrandCreator desktop shortcuts..."
Write-Host "Desktop Path: $DesktopPath"
Write-Host "Project Root: $ProjectRoot"
Write-Host "--------------------------------------------------"

$Shortcuts = @(
    @{
        Name = "BrandCreator - Start"
        Target = "Start-BrandCreator.bat"
    },
    @{
        Name = "BrandCreator - Verify"
        Target = "Verify-BrandCreator.bat"
    },
    @{
        Name = "BrandCreator - Stop"
        Target = "Stop-BrandCreator.bat"
    }
)

$WshShell = New-Object -ComObject WScript.Shell

foreach ($item in $Shortcuts) {
    $lnkPath = Join-Path $DesktopPath "$($item.Name).lnk"
    $targetPath = Join-Path $ProjectRoot $item.Target
    
    try {
        $Shortcut = $WshShell.CreateShortcut($lnkPath)
        $Shortcut.TargetPath = $targetPath
        $Shortcut.WorkingDirectory = $ProjectRoot
        $Shortcut.Description = "Launch, verify, or stop the local BrandCreator ecosystem."
        $Shortcut.Save()
        
        if (Test-Path $lnkPath) {
            Write-Host "[PASS] Created: $lnkPath" -ForegroundColor Green
            Write-Host "       Target:  $targetPath"
        } else {
            Write-Host "[FAIL] Failed to verify file: $lnkPath" -ForegroundColor Red
        }
    } catch {
        Write-Host "[FAIL] Error creating shortcut $($item.Name): $_" -ForegroundColor Red
    }
}
Write-Host "--------------------------------------------------"
Write-Host "Shortcut creation process complete."
