@echo off
REM Script to get detailed info about a specific license key

if "%1"=="" (
    echo Usage: get-key-info.bat MZNEW-XXXX-XXXX-XXXX
    echo.
    echo Example: get-key-info.bat MZNEW-68YY-7LAZ-MB9U
    pause
    exit /b 1
)

echo ================================
echo License Key Information
echo ================================
echo.
echo Key: %1
echo.

wrangler kv key get "%1" --namespace-id=b6a474cb11024056a1ced5c8a9380f39

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Key not found or not yet activated.
)

echo.
pause
