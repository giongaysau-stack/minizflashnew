@echo off
echo ========================================
echo   MiniZ Flash Pro - Upload to GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo Initializing git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Creating commit...
git commit -m "Initial commit - MiniZ Flash Pro with Cloudflare Security"

echo.
echo Setting up remote...
git remote remove origin 2>nul
git remote add origin https://github.com/giongaysau-stack/minizflashnew.git

echo.
echo Setting branch to main...
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main --force

echo.
echo ========================================
echo   Done! Check your repository:
echo   https://github.com/giongaysau-stack/minizflashnew
echo ========================================
pause
