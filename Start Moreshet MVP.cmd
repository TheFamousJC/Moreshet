@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Install dependencies with npm ci before first use.
  pause
  exit /b 1
)
start "Moreshet MVP" "http://localhost:3220/"
npm run dev
pause
