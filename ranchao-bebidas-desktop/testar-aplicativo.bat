@echo off
setlocal
title Testar Ranchao Bebidas
cd /d "%~dp0"
call npm.cmd install
if errorlevel 1 goto erro
call npm.cmd start
exit /b 0

:erro
echo Nao foi possivel iniciar o aplicativo.
pause
exit /b 1
