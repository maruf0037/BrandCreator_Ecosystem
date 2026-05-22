# scripts/create-windows-deploy-bundle.ps1
# Automated production deployment bundler for BrandCreator Windows Server Environment

$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$storefrontDir = Join-Path $root "bc_storefront"
$engineDir = Join-Path $root "bc_engine"
$zipPath = "D:\Workspace\01_Projects\Active\BrandCreator_Windows_Deploy.zip"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "INITIALIZING WINDOWS SERVER DEPLOYMENT BUNDLER" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Compile Front-End Production Bundle
Write-Host "`n[1/4] Compiling React Front-End Storefront..." -ForegroundColor Yellow
try {
    Push-Location $storefrontDir
    Write-Host "Running Vite build in storefront..." -ForegroundColor DarkGray
    $buildOutput = npm.cmd run build 2>&1
    Pop-Location
    Write-Host "[SUCCESS] React storefront compiled flawlessly." -ForegroundColor Green
} catch {
    Pop-Location
    Write-Error "React compilation failed! Aborting release bundle creation."
}

# 2. Run Local Integrated Diagnostics & Verification
Write-Host "`n[2/4] Executing Ecosystem Verification Tests..." -ForegroundColor Yellow
try {
    # Trigger full system E2E tests and health pings
    $verifyScript = Join-Path $PSScriptRoot "verify-local.ps1"
    $testResult = powershell.exe -ExecutionPolicy Bypass -File $verifyScript
    
    # Check if the output contains validation success confirmation
    if ($testResult -match "SUCCESS: ECOSYSTEM VALIDATION VERDICT: ALL PASSED") {
        Write-Host "[SUCCESS] Ecosystem E2E checks passed perfectly." -ForegroundColor Green
    } else {
        Write-Host "Ecosystem output:`n$testResult" -ForegroundColor DarkRed
        throw "Integrated verification failed! Aborting release bundle creation."
    }
} catch {
    Write-Error "Sanity validation crashed! Aborting release bundle creation. Reason: $_"
}

# 3. Stage Production-Relevant Components
Write-Host "`n[3/4] Staging production-only components..." -ForegroundColor Yellow
$tempStaging = Join-Path $env:TEMP "BrandCreator_Deploy_Staging"
if (Test-Path $tempStaging) {
    Remove-Item $tempStaging -Recurse -Force
}
New-Item -ItemType Directory -Path $tempStaging -Force | Out-Null

# A. Copy bc_engine source excluding node_modules, logs, and secret files
$engineDest = Join-Path $tempStaging "bc_engine"
New-Item -ItemType Directory -Path $engineDest -Force | Out-Null

$engineFolders = @("controllers", "models", "routes", "config", "src")
foreach ($folder in $engineFolders) {
    $srcPath = Join-Path $engineDir $folder
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination (Join-Path $engineDest $folder) -Recurse -Force
    }
}

$engineFiles = Get-ChildItem -Path $engineDir -File
foreach ($file in $engineFiles) {
    # Skip environment, logs, and temp/scratch files
    if ($file.Name -ne ".env" -and $file.Name -ne "scratch_query.js" -and $file.Extension -ne ".log") {
        Copy-Item -Path $file.FullName -Destination (Join-Path $engineDest $file.Name) -Force
    }
}
Write-Host "      Staged: Express Engine (and SQL migrations)" -ForegroundColor DarkGray

# B. Copy bc_storefront built dist output ONLY (skip frontend source code)
$storefrontDest = Join-Path $tempStaging "bc_storefront\dist"
New-Item -ItemType Directory -Path $storefrontDest -Force | Out-Null
Copy-Item -Path (Join-Path $storefrontDir "dist\*") -Destination $storefrontDest -Recurse -Force
Write-Host "      Staged: Compiled storefront (dist bundle)" -ForegroundColor DarkGray

# C. Copy bc_docs runbooks
$docsDest = Join-Path $tempStaging "bc_docs"
New-Item -ItemType Directory -Path $docsDest -Force | Out-Null
Copy-Item -Path (Join-Path $root "bc_docs\*") -Destination $docsDest -Recurse -Force
Write-Host "      Staged: Operational runbooks" -ForegroundColor DarkGray

# D. Copy scripts directory (start/stop/verify scripts only)
$scriptsDest = Join-Path $tempStaging "scripts"
New-Item -ItemType Directory -Path $scriptsDest -Force | Out-Null
Copy-Item -Path (Join-Path $PSScriptRoot "start-local.ps1") -Destination $scriptsDest -Force
Copy-Item -Path (Join-Path $PSScriptRoot "stop-local.ps1") -Destination $scriptsDest -Force
Copy-Item -Path (Join-Path $PSScriptRoot "verify-local.ps1") -Destination $scriptsDest -Force
Write-Host "      Staged: Operational PowerShell utilities" -ForegroundColor DarkGray

# E. Copy root launchers and readmes
Copy-Item -Path (Join-Path $root "Start-BrandCreator.bat") -Destination $tempStaging -Force
Copy-Item -Path (Join-Path $root "Stop-BrandCreator.bat") -Destination $tempStaging -Force
Copy-Item -Path (Join-Path $root "Verify-BrandCreator.bat") -Destination $tempStaging -Force
Copy-Item -Path (Join-Path $root "README.md") -Destination $tempStaging -Force
Write-Host "      Staged: Root launchers & manuals" -ForegroundColor DarkGray

# 4. Compile ZIP Archive
Write-Host "`n[4/4] Packing production deployable archive..." -ForegroundColor Yellow
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "$tempStaging\*" -DestinationPath $zipPath -Force
Remove-Item $tempStaging -Recurse -Force

if (Test-Path $zipPath) {
    $size = (Get-Item $zipPath).Length
    $roundedSize = [Math]::Round($size / 1MB, 2)
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host "SUCCESS: DEPLOYMENT BUNDLE CREATED" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "Archive Location: $zipPath" -ForegroundColor Cyan
    Write-Host "Bundle Size:      $roundedSize MB" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Error "Failed to compress the deployment bundle staging directory."
}
