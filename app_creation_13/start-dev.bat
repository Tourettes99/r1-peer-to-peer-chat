@echo off
echo Starting R1 Chat Development Server...
echo.
echo This will start a local server for testing the R1 Chat application.
echo The app will be available at: http://localhost:8000/test.html
echo.
echo Press Ctrl+C to stop the server when you're done testing.
echo.
python serve.py
pause
