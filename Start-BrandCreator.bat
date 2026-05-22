@echo off
title Start BrandCreator Ecosystem
echo ==================================================
echo Launching BrandCreator Ecosystem Services...
echo ==================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"

echo.
echo ==================================================
echo Service launcher completed.
echo Press any key to close this launcher console window.
echo ==================================================
pause > nul
