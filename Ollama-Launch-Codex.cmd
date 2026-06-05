@echo off
title Ollama Launch Codex (Qwen 2.5 Coder 3B)
echo ==================================================
echo Starting Ollama local services...
echo ==================================================
start "" "C:\Users\Admin\AppData\Local\Programs\Ollama\ollama.exe" serve >nul 2>&1
timeout /t 3 >nul

echo ==================================================
echo Auto-configuring Codex (OpenClaw) with qwen2.5-coder:3b...
echo ==================================================
set OLLAMA_API_KEY=ollama-local
"C:\Program Files\nodejs\node.exe" "C:\Users\Admin\AppData\Roaming\npm\node_modules\openclaw\openclaw.mjs" onboard --non-interactive --auth-choice ollama --custom-base-url "http://127.0.0.1:11434" --custom-model-id "qwen2.5-coder:3b" --accept-risk

echo.
echo ==================================================
echo Launching Codex Chat Client...
echo ==================================================
"C:\Program Files\nodejs\node.exe" "C:\Users\Admin\AppData\Roaming\npm\node_modules\openclaw\openclaw.mjs" chat
