@echo off
setlocal enabledelayedexpansion
title YouTube Development Servers
color 0A

echo.
echo ====================================================================
echo                   YOUTUBE CLONE - STARTUP SCRIPT
echo ====================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Download the LTS version and install it.
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js: Installed
node --version
echo.

:: Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [✓] npm: Installed
npm --version
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo [✓] Project Directory: %SCRIPT_DIR%
echo.

:: Check if server directory exists
if not exist "%SCRIPT_DIR%\server" (
    echo [ERROR] server directory not found!
    echo Expected: %SCRIPT_DIR%\server
    pause
    exit /b 1
)

:: Check if youtube directory exists
if not exist "%SCRIPT_DIR%\youtube" (
    echo [ERROR] youtube directory not found!
    echo Expected: %SCRIPT_DIR%\youtube
    pause
    exit /b 1
)

echo [✓] Directories: Found
echo.

:: Kill existing processes
echo ====================================================================
echo   STEP 1: CLEANING UP EXISTING PROCESSES
echo ====================================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo [!] Killing process on port 3000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    echo [!] Killing process on port 5000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

timeout /t 2 >nul
echo [✓] Ports cleared
echo.

:: Check for .env files
echo ====================================================================
echo   STEP 2: CHECKING CONFIGURATION FILES
echo ====================================================================
echo.

if exist "%SCRIPT_DIR%\server\.env" (
    echo [✓] Backend .env: Found
) else (
    echo [!] Backend .env: Not found (server will use defaults)
)

if exist "%SCRIPT_DIR%\youtube\.env.local" (
    echo [✓] Frontend .env.local: Found
) else (
    echo [!] Frontend .env.local: Not found
    echo [i] Creating .env.local...
    (
        echo NEXT_PUBLIC_BACKEND_URL=http://192.168.0.181:5000
        echo NEXT_PUBLIC_SOCKET_URL=http://192.168.0.181:5000
        echo HOSTNAME=0.0.0.0
        echo PORT=3000
    ) > "%SCRIPT_DIR%\youtube\.env.local"
    echo [✓] Created .env.local
)

echo.

:: Install dependencies if needed
if not exist "%SCRIPT_DIR%\server\node_modules" (
    echo [!] Backend dependencies not installed
    echo [i] Installing backend dependencies...
    cd /d "%SCRIPT_DIR%\server"
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)

if not exist "%SCRIPT_DIR%\youtube\node_modules" (
    echo [!] Frontend dependencies not installed
    echo [i] Installing frontend dependencies...
    cd /d "%SCRIPT_DIR%\youtube"
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo.
echo ====================================================================
echo   STEP 3: STARTING BACKEND SERVER (PORT 5000)
echo ====================================================================
echo.

start "YouTube Backend [PORT 5000]" cmd /k "cd /d "%SCRIPT_DIR%\server" && title YouTube Backend [PORT 5000] && color 0B && echo. && echo ============================================== && echo    YOUTUBE BACKEND SERVER && echo ============================================== && echo. && echo [i] Starting on http://192.168.0.181:5000 && echo [i] Press Ctrl+C to stop && echo. && npm start"

echo [i] Waiting for backend to start...
timeout /t 5 >nul

:: Test backend
echo [i] Testing backend connection...
curl -s http://192.168.0.181:5000/health >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] Backend: Running
) else (
    echo [!] Backend: Check the backend window for errors
)

echo.
echo ====================================================================
echo   STEP 4: STARTING FRONTEND SERVER (PORT 3000)
echo ====================================================================
echo.

start "YouTube Frontend [PORT 3000]" cmd /k "cd /d "%SCRIPT_DIR%\youtube" && title YouTube Frontend [PORT 3000] && color 0C && echo. && echo ============================================== && echo    YOUTUBE FRONTEND SERVER && echo ============================================== && echo. && echo [i] Starting on http://192.168.0.181:3000 && echo [i] Press Ctrl+C to stop && echo. && npm run dev"

echo [i] Waiting for frontend to start...
timeout /t 8 >nul

echo.
echo ====================================================================
echo   STARTUP COMPLETE!
echo ====================================================================
echo.
echo Frontend (Next.js):
echo   • Desktop Browser:  http://192.168.0.181:3000
echo   • Local:            http://localhost:3000
echo   • Mobile (WiFi):    http://192.168.0.181:3000
echo.
echo Backend (Express):
echo   • API Endpoint:     http://192.168.0.181:5000
echo   • Health Check:     http://192.168.0.181:5000/health
echo   • Local:            http://${process.env.NEXT_PUBLIC_BACKEND_URL||"https://youtube-clone-project-q3pd.onrender.com"}
echo.
echo Socket.IO:
echo   • WebSocket:        ws://192.168.0.181:5000
echo.
echo MongoDB:
echo   • Status:           Check backend window
echo.
echo ====================================================================
echo.
echo [!] IMPORTANT:
echo     - Keep BOTH command windows open
echo     - To stop: Close the command windows or press Ctrl+C
echo     - Check windows for any error messages
echo.
echo ====================================================================
echo.

:: Wait and test frontend
echo [i] Testing frontend connection...
timeout /t 5 >nul

curl -s http://192.168.0.181:3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [✓] Frontend: Running
    echo.
    echo [i] Opening browser in 3 seconds...
    timeout /t 3 >nul
    start http://192.168.0.181:3000
) else (
    echo [!] Frontend: Not responding yet
    echo [!] Check the frontend window for:
    echo     - "ready started server on 0.0.0.0:3000"
    echo     - "compiled successfully"
    echo.
    echo [i] If frontend doesn't start:
    echo     1. Check the "YouTube Frontend [PORT 3000]" window
    echo     2. Look for error messages
    echo     3. Run: cd youtube ^&^& npm install
    echo.
)

echo.
echo ====================================================================
echo   TROUBLESHOOTING TIPS
echo ====================================================================
echo.
echo If frontend doesn't work:
echo   1. Check package.json has: "dev": "next dev -H 0.0.0.0 -p 3000"
echo   2. Delete youtube/.next folder and restart
echo   3. Run: cd youtube ^&^& npm run dev manually
echo.
echo If backend doesn't work:
echo   1. Check .env file exists in server folder
echo   2. Verify MongoDB connection string
echo   3. Check server window for errors
echo.
echo If mobile can't connect:
echo   1. Ensure mobile is on SAME WiFi
echo   2. Check firewall allows ports 3000 and 5000
echo   3. Try: http://192.168.0.181:3000
echo.
echo ====================================================================
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul