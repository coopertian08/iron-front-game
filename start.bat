@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   ================================
echo        钢铁前线 - 本地服务器
echo   ================================
echo.
echo   游戏地址: http://127.0.0.1:4173
echo   关闭此窗口即可停止服务器。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 4173 -OpenBrowser
pause
