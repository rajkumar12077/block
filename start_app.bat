@echo off
echo ===================================================
echo Starting AgriBlock Application
echo ===================================================
echo.

echo This script will start both the backend and frontend servers
echo in separate windows.
echo.

echo Starting the backend server...
start cmd.exe /k "cd backend && npm run build && npm start"

echo Waiting for backend to initialize (10 seconds)...
timeout /t 10 /nobreak

echo Starting the frontend server...
start cmd.exe /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Application is starting
echo ===================================================
echo.
echo Backend server will be available at: http://localhost:3000
echo Frontend application will be available at: http://localhost:5173
echo.
echo If you encounter connection issues, please refer to:
echo CONNECTION_TROUBLESHOOTING.md
echo.