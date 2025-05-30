@echo off
:: Display the current file location
echo Current file location: %~dp0

:: Change to the directory where the batch file is located
cd /d %~dp0

:: Display the current directory to confirm location
echo Current directory after cd /d %~dp0: %cd%

:: Move one directory up
cd ..

:: Display the current directory to confirm navigation
echo Current directory after moving up: %cd%

:: stop the `whatsapp-api.js` script using PM2
pm2 stop whatsapp-api.js

:: Pause the script to keep the window open
pause
