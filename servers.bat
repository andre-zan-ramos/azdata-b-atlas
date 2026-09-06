@echo off
setlocal

rem Resolve o projeto a partir deste arquivo, inclusive em caminhos com espacos.
pushd "%~dp0"
if errorlevel 1 (
  echo Nao foi possivel acessar o diretorio do B-Atlas.
  pause
  exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale Node 22.14 ou superior e reabra o terminal.
  goto :failure
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm nao encontrado. Verifique a instalacao do Node.js.
  goto :failure
)

if not exist "node_modules\.bin\vite.cmd" (
  echo Dependencias nao instaladas. Execute npm.cmd ci na pasta do B-Atlas.
  goto :failure
)

rem O Vite le os arquivos .env; nao e necessario importa-los pelo batch.
rem Host e porta permanecem centralizados em vite.config.ts.
echo Iniciando B-Atlas - Business Atlas...
echo A URL sera exibida pelo Vite. Use Ctrl+C para encerrar.
call npm.cmd run dev -- --open / %*
set "SERVERS_EXIT_CODE=%ERRORLEVEL%"
popd
if not "%SERVERS_EXIT_CODE%"=="0" pause
exit /b %SERVERS_EXIT_CODE%

:failure
popd
pause
exit /b 1
