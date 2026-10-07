@echo off
title VidQA Full Stack Launcher
echo =======================================================
echo              Launching VidQA Full Stack
echo =======================================================

echo [Check] Verifying MongoDB service...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [Warning] MongoDB service is not currently running.
    echo Attempting to start MongoDB...
    net start MongoDB >nul 2>&1
)

echo 1. Starting Python FastAPI RAG Processing Service (port 8000)...
start "VidQA FastAPI (8000)" cmd /k "cd /d %~dp0processing && uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo 2. Starting Node.js Express API Backend (port 5000)...
start "VidQA Express Backend (5000)" cmd /k "cd /d %~dp0Backend && npm run dev"

timeout /t 2 /nobreak >nul

echo 3. Starting React Frontend Development Server (port 3000)...
start "VidQA React Frontend (3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo  VidQA Full Stack is running!
echo  - Frontend Web UI:  http://localhost:3000
echo  - Express REST API: http://localhost:5000/api/health
echo  - FastAPI Service:  http://localhost:8000/health
echo =======================================================
