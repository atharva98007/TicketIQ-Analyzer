@echo off
echo =======================================
echo      Starting TicketIQ AI System
echo =======================================

echo 1. Launching FastAPI Backend...
start cmd /k "python -m uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

echo 2. Opening Ngrok Tunnel...
start cmd /k "ngrok http 8000"

echo All systems go! You can close this small window.
exit