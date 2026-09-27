@echo off
title TruthLens
cd /d "%~dp0"
echo Installing dependencies if needed...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Make sure Node.js 18+ is installed and internet access is available for the first install.
  pause
  exit /b 1
)
echo.
echo Seeding demo data...
call npm run seed
echo.
echo Starting TruthLens...
call npm start
pause
