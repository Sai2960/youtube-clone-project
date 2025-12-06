@echo off
setlocal enabledelayedexpansion

:: Colors
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set NC=[0m

echo %GREEN%========================================%NC%
echo %GREEN%  YourTube Mobile Setup Script%NC%
echo %GREEN%========================================%NC%
echo.

:: Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :found_ip
)
:found_ip

echo %YELLOW%📍 Detected IP Address: %IP%%NC%
echo.

:: Create .env file
if not exist ".env" (
    echo %YELLOW%⚠️  Creating .env file...%NC%
    (
        echo # Backend Configuration
        echo NEXT_PUBLIC_BACKEND_URL=http://%IP%:5000
        echo NEXT_PUBLIC_SOCKET_URL=http://%IP%:5000
        echo NEXT_PUBLIC_FRONTEND_URL=http://%IP%:3000
        echo.
        echo # Firebase Config
        echo NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDTSeUl7yX_oYuMkTLQx8gaM2yeftJMDTU
        echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourtube-2dbfb.firebaseapp.com
        echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourtube-2dbfb
        echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourtube-2dbfb.firebasestorage.app
        echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=544512454124
        echo NEXT_PUBLIC_FIREBASE_APP_ID=1:544512454124:web:a79bf26e771039d2a2a4c9
        echo NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-7J7222ZSC7
    ) > .env
    echo %GREEN%✅ Created .env file%NC%
    echo.
) else (
    echo %GREEN%✅ .env file already exists%NC%
    echo.
)

echo.
echo %GREEN%========================================%NC%
echo %GREEN%  Setup Complete!%NC%
echo %GREEN%========================================%NC%
echo.

echo %YELLOW%🔥 Next Steps:%NC%
echo.
echo 1. %GREEN%Add %IP% to Firebase Authorized Domains:%NC%
echo    → https://console.firebase.google.com/project/yourtube-2dbfb/authentication/settings
echo    → Add domain: %IP%
echo.

echo 2. %GREEN%Allow firewall access (Run as Administrator):%NC%
echo    %YELLOW%netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000%NC%
echo    %YELLOW%netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000%NC%
echo.

echo 3. %GREEN%Start backend server:%NC%
echo    cd ..\server
echo    npm start
echo.

echo 4. %GREEN%Start frontend (in new terminal):%NC%
echo    npm run dev
echo.

echo 5. %GREEN%Access on your phone:%NC%
echo    %YELLOW%http://%IP%:3000%NC%
echo.

echo %GREEN%========================================%NC%
echo.

pause