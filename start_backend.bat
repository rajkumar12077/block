@echo off
echo ===================================================
echo Starting AgriBlock Backend Server
echo ===================================================
echo.

cd backend

echo Checking for node_modules...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Building backend...
call npm run build

echo Starting backend server...
echo.
echo When you see the message "Application is running" the server is ready.
echo You can then run the frontend in another terminal.
echo.
echo To stop the server, press Ctrl+C
echo.
call npm start