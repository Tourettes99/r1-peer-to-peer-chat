@echo off
echo Starting R1 Chat Real Signaling Server...
echo.
echo This will start the real signaling server for cross-platform communication.
echo Desktop and mobile devices can now communicate with each other!
echo.
echo Server will be available at: http://localhost:8001
echo App will be available at: http://localhost:8000/test.html
echo.
echo Press Ctrl+C to stop the server.
echo.
python real-signaling-server.py
pause
