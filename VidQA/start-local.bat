@echo off
title VidQA Standalone Launcher
echo ==============================================
echo   Starting VidQA Services (Local Development)
echo ==============================================

echo Starting Python FastAPI Processing Service on port 8000...
start "VidQA FastAPI (8000)" cmd /k "cd /d %~dp0 && uvicorn processing_service:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Node.js Express Service on port 3000...
start "VidQA Node (3000)" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo ==============================================
echo  Both services launched!
echo  Visit http://localhost:3000/ for Login
echo  Default Accounts:
echo    - sushanth@gmail.com / 1234
echo    - rahul@gmail.com / 4321
echo  After login, you will be redirected to /vidqa
echo ==============================================
