@echo off
setlocal
cd /d "%~dp0"
title Ranchao Bebidas - Gerar instalador
echo Verificando Node.js...
where node >nul 2>nul || (
  echo Node.js nao foi encontrado. Instale a versao LTS e tente novamente.
  pause
  exit /b 1
)
echo Instalando dependencias do projeto...
call npm install || goto :erro
echo Gerando o instalador da versao 1.2.59...
call npm run build:windows || goto :erro
echo.
echo Concluido. O instalador esta dentro da pasta dist.
pause
exit /b 0
:erro
echo.
echo Nao foi possivel gerar o instalador. Confira a mensagem acima.
pause
exit /b 1
