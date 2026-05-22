@echo off
title Verify BrandCreator Ecosystem
echo ==================================================
echo Starting BrandCreator Ecosystem Integration Checks...
echo ==================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-local.ps1"

echo.
echo ==================================================
echo Diagnostic checks completed.
echo Press any key to close this console window.
echo ==================================================
pause > nul
