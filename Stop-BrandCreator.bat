@echo off
title Stop BrandCreator Ecosystem
echo ==================================================
echo Terminating BrandCreator Ecosystem Services...
echo ==================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-local.ps1"

echo.
echo ==================================================
echo Shutdown completed.
echo Press any key to close this console window.
echo ==================================================
pause > nul
