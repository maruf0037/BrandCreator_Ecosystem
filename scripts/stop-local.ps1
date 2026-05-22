# scripts/stop-local.ps1
# Script to safely terminate only the Express backend process on port 5000

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "STOPPING BRANDCREATOR EXPRESS ENGINE" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($connection) {
    $procId = $connection.OwningProcess
    $processName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    
    Write-Host "Found process '$processName' (PID: $procId) listening on port 5000." -ForegroundColor Yellow
    Write-Host "Stopping process..." -ForegroundColor Yellow
    
    try {
        Stop-Process -Id $procId -Force
        Write-Host "Express backend engine has been stopped successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error stopping process: $_" -ForegroundColor Red
    }
} else {
    Write-Host "No active processes found listening on port 5000." -ForegroundColor Green
}

Write-Host "IIS port 8080 continues running in background (global IIS)." -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Yellow
