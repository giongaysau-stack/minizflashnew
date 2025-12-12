@echo off
REM MiniZ Flash Pro - Security Setup Script for Windows
REM This script helps you configure environment variables securely

echo ================================
echo MiniZ Flash Pro - Security Setup
echo ================================
echo.

REM Check if wrangler is installed
where wrangler >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Wrangler CLI not found!
    echo Install: npm install -g wrangler
    pause
    exit /b 1
)

echo [OK] Wrangler CLI found
echo.

REM Check if logged in
wrangler whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Please login to Cloudflare first:
    wrangler login
)

echo.
echo Setting up secrets for your worker...
echo.

REM SECRET_KEY
echo 1. Setting SECRET_KEY
echo    (Use a random string, 32+ characters recommended)
echo.
wrangler secret put SECRET_KEY

echo.

REM GITHUB_TOKEN
echo 2. Setting GITHUB_TOKEN
echo    (GitHub Personal Access Token with 'repo' permission)
echo    Create at: https://github.com/settings/tokens
echo.
wrangler secret put GITHUB_TOKEN

echo.

REM Optional: TURNSTILE_SECRET
set /p TURNSTILE="Do you want to set TURNSTILE_SECRET? (y/n): "
if /i "%TURNSTILE%"=="y" (
    echo 3. Setting TURNSTILE_SECRET
    echo    (Get from Cloudflare Dashboard - Turnstile)
    echo.
    wrangler secret put TURNSTILE_SECRET
)

echo.
echo ================================
echo [OK] Secrets configured successfully!
echo ================================
echo.
echo Next steps:
echo   1. Update wrangler.toml with your KV namespace ID
echo   2. Deploy: wrangler deploy
echo   3. Test: wrangler tail
echo.
pause
