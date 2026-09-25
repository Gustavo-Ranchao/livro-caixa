@echo off
setlocal
title Ranchao Bebidas - Gerar Instalador
cd /d "%~dp0"

echo.
echo ==========================================
echo   RANCHAO BEBIDAS - GERAR INSTALADOR
echo ==========================================
echo.

where node.exe >nul 2>nul
if errorlevel 1 goto sem_node

where npm.cmd >nul 2>nul
if errorlevel 1 goto sem_node

echo Node encontrado:
call node --version
echo.
echo Instalando os componentes necessarios...
call npm.cmd install
if errorlevel 1 goto erro

echo.
echo Gerando o instalador para Windows...
call npm.cmd run build:windows
if errorlevel 1 goto erro

echo.
echo Instalador criado com sucesso.
echo Abra a pasta dist e execute Ranchao-Bebidas-Setup-1.2.0.exe
start "" "%~dp0dist"
pause
exit /b 0

:sem_node
echo O Node.js nao foi encontrado.
echo Feche esta janela, reinicie o computador e tente novamente.
echo Se continuar, reinstale o Node.js LTS marcando a opcao de adicionar ao PATH.
pause
exit /b 1

:erro
echo.
echo Nao foi possivel gerar o instalador.
echo Verifique a conexao com a internet e tente novamente.
pause
exit /b 1
