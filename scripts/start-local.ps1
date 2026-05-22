# scripts/start-local.ps1
# Script to launch the BrandCreator Express backend engine and verify IIS storefront availability

$ErrorActionPreference = "Stop"

$engineDir = Join-Path $PSScriptRoot "..\bc_engine"
$logDir = Join-Path $engineDir "logs"

# Ensure log directory exists
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "LAUNCHING BRANDCREATOR ECOSYSTEM LOCALLY" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Starting Express backend
Write-Host "1. Starting Express Backend Engine on Port 5000..." -ForegroundColor Yellow
$logFile = Join-Path $logDir "server.log"

# Stop existing instance if running
$existingProcess = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "Found existing process on port 5000. Stopping it first..." -ForegroundColor DarkYellow
    $procId = $existingProcess.OwningProcess
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start backend process in background
$errFile = Join-Path $logDir "server-error.log"
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $engineDir -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $errFile

# 2. Wait for Backend /health to be responsive
Write-Host "Waiting for Express server to start..." -ForegroundColor Yellow
$retries = 10
$started = $false
while ($retries -gt 0 -and -not $started) {
    try {
        $res = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:5000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($res.StatusCode -eq 200) {
            $started = $true
            Write-Host "Express backend engine is ONLINE! [Port 5000]" -ForegroundColor Green
        }
    } catch {
        $retries--
        Start-Sleep -Seconds 1
    }
}

if (-not $started) {
    Write-Error "Express server failed to start on Port 5000. Inspect logs at: $logFile"
}

# 3. Check IIS Storefront status
Write-Host "2. Checking IIS Storefront on Port 8080..." -ForegroundColor Yellow
try {
    $iisRes = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/login" -TimeoutSec 3 -ErrorAction Stop
    if ($iisRes.StatusCode -eq 200) {
        Write-Host "IIS Storefront server is ONLINE! [Port 8080]" -ForegroundColor Green
    } else {
        Write-Host "IIS storefront returned status: $($iisRes.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not connect to IIS storefront on port 8080. Please ensure IIS Website is started." -ForegroundColor Red
}

# 4. Useful entrypoints print
Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "BRANDCREATOR LOCAL PORTALS READY" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Customer Shop:     http://localhost:8080/shop" -ForegroundColor Cyan
Write-Host "Supplier Portal:   http://localhost:8080/supplier" -ForegroundColor Cyan
Write-Host "Admin Dashboard:   http://localhost:8080/admin" -ForegroundColor Cyan
Write-Host "Ecosystem Health:  http://localhost:5000/health" -ForegroundColor Cyan
Write-Host "Deep System Audit: http://localhost:5000/health/deep" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
