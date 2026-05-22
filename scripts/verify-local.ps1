# scripts/verify-local.ps1
# Comprehensive local validation script for BrandCreator Ecosystem

$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$storefrontDir = "$root\bc_storefront"
$engineDir = "$root\bc_engine"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "RUNNING INTEGRATED ECOSYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Check Backend API Engine Health
Write-Host "`n[1/4] Checking Express Backend Engine..." -ForegroundColor Yellow
try {
    $backendRes = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:5000/health" -TimeoutSec 3 -ErrorAction Stop
    if ($backendRes.StatusCode -eq 200) {
        Write-Host "      [PASS] Backend /health is ONLINE [200 OK]" -ForegroundColor Green
        Write-Host "      Payload: $($backendRes.Content)" -ForegroundColor DarkGray
    } else {
        Write-Host "      [FAIL] Backend returned status $($backendRes.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    $errMessage = $_.Exception.Message
    Write-Host "      [FAIL] Express Backend connection failed on port 5000: $errMessage" -ForegroundColor Red
    $allPassed = $false
}

# 2. Check IIS Route Resolution
Write-Host "`n[2/4] Checking IIS Routing Single Page Application Fallbacks..." -ForegroundColor Yellow
$routes = @("/admin", "/supplier", "/shop")
foreach ($r in $routes) {
    try {
        $iisRes = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080$r" -TimeoutSec 3 -ErrorAction Stop
        if ($iisRes.StatusCode -eq 200) {
            Write-Host "      [PASS] Route http://localhost:8080${r} resolved perfectly [200 OK]" -ForegroundColor Green
        } else {
            Write-Host "      [FAIL] Route http://localhost:8080${r} failed with status $($iisRes.StatusCode)" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        $errMessage = $_.Exception.Message
        Write-Host "      [FAIL] Failed to connect to route ${r} : $errMessage" -ForegroundColor Red
        $allPassed = $false
    }
}

# 3. Compile client bundle
Write-Host "`n[3/4] Running Client production build compilation..." -ForegroundColor Yellow
try {
    Push-Location $storefrontDir
    $buildOutput = npm.cmd run build 2>&1
    Pop-Location
    Write-Host "      [PASS] Storefront React Client compiled flawlessly!" -ForegroundColor Green
} catch {
    Pop-Location
    $errMessage = $_.Exception.Message
    Write-Host "      [FAIL] Client build compilation failed: $errMessage" -ForegroundColor Red
    $allPassed = $false
}

# 4. Run E2E Test Suite
Write-Host "`n[4/4] Running backend integration and ledger reconciliation tests..." -ForegroundColor Yellow
try {
    Push-Location $engineDir
    $testOutput = node test_e2e_walkthrough.js 2>&1
    Pop-Location
    
    # Check if the output contains the E2E success confirmation
    if ($testOutput -match "ALL E2E ROLE INTEGRATION FLOWS PASSED SUCCESSFULLY") {
        Write-Host "      [PASS] E2E ledger flow and role settlement passed successfully!" -ForegroundColor Green
    } else {
        Write-Host "      [FAIL] E2E walkthrough failed or returned incomplete outputs." -ForegroundColor Red
        Write-Host "Test Output:`n$testOutput" -ForegroundColor DarkRed
        $allPassed = $false
    }
} catch {
    Pop-Location
    $errMessage = $_.Exception.Message
    Write-Host "      [FAIL] Integration tests crashed: $errMessage" -ForegroundColor Red
    $allPassed = $false
}

# Final Verdict
Write-Host "`n==================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "SUCCESS: ECOSYSTEM VALIDATION VERDICT: ALL PASSED" -ForegroundColor Green
} else {
    Write-Host "FAILURE: ECOSYSTEM VALIDATION VERDICT: FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "==================================================" -ForegroundColor Cyan
