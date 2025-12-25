@echo off
REM Script to check which license keys have been used

echo ================================
echo License Keys Usage Report
echo ================================
echo.

echo Fetching all used keys from KV namespace...
echo.

wrangler kv key list --namespace-id=b6a474cb11024056a1ced5c8a9380f39 > temp_keys.json

echo.
echo Keys found in database:
type temp_keys.json
echo.

REM Parse and show details for each key
echo ================================
echo Detailed Information:
echo ================================
echo.

REM This will be populated when keys are actually used
echo No keys activated yet.
echo.

del temp_keys.json 2>nul

echo.
echo To check a specific key:
echo   wrangler kv key get "MZNEW-XXXX-XXXX-XXXX" --namespace-id=b6a474cb11024056a1ced5c8a9380f39
echo.
pause
