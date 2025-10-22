@echo off
echo ===================================================
echo Starting AgriBlock Frontend Development Server
echo ===================================================
echo.

cd frontend

echo Checking for node_modules...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Starting frontend development server...
echo.
echo When you see the message "Local: http://localhost:5173" the server is ready.
echo You can access the application at http://localhost:5173 in your browser.
echo.
echo To stop the server, press Ctrl+C
echo.
call npm run dev