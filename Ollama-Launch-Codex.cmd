@echo off
title Ollama Launch Codex (Gemma 4 31B Cloud)
echo ==================================================
echo Starting Ollama local services...
echo ==================================================
start "" "C:\Users\Admin\AppData\Local\Programs\Ollama\ollama.exe" serve >nul 2>&1
timeout /t 3 >nul

echo ==================================================
echo Auto-configuring Codex (OpenClaw) with gemma4:31b-cloud...
echo ==================================================
set OLLAMA_API_KEY=ollama-local
"C:\Program Files\nodejs\node.exe" "C:\Users\Admin\AppData\Roaming\npm\node_modules\openclaw\openclaw.mjs" onboard --non-interactive --auth-choice ollama --custom-base-url "http://127.0.0.1:11434" --custom-model-id "gemma4:31b-cloud" --accept-risk

echo.
echo ==================================================
echo Launching Codex Chat Client...
echo ==================================================
"C:\Program Files\nodejs\node.exe" "C:\Users\Admin\AppData\Roaming\npm\node_modules\openclaw\openclaw.mjs" chat
