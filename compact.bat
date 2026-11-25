
@echo off
setlocal
title Compactador Backend + Frontend

set "ROOT=%~dp0"
set "TEMP_DIR=%TEMP%\ProjetoZIP_%RANDOM%"
set "DATA=%DATE%"

echo.
echo ========================================
echo      COMPACTAR BACKEND + FRONTEND
echo ========================================
echo.

if not exist "%ROOT%backend" (
    echo ERRO: Pasta backend nao encontrada!
    pause
    exit /b 1
)

if not exist "%ROOT%frontend" (
    echo ERRO: Pasta frontend nao encontrada!
    pause
    exit /b 1
)

mkdir "%TEMP_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$root = '%ROOT%'; $temp = '%TEMP_DIR%'; " ^
 "$excludeDirs = @('storage','vendor','node_modules'); " ^
 "foreach ($folder in @('backend','frontend')) { " ^
 " $source = Join-Path $root $folder; " ^
 " $target = Join-Path $temp $folder; " ^
 " New-Item -ItemType Directory -Path $target -Force | Out-Null; " ^
 " Get-ChildItem -LiteralPath $source -Recurse -File | " ^
 " Where-Object { " ^
 "  $relative = $_.FullName.Substring($source.Length).TrimStart('\'); " ^
 "  $parts = $relative -split '\\'; " ^
 "  ($parts | Where-Object { $excludeDirs -contains $_ }).Count -eq 0 -and " ^
 "  $_.Name -notlike '.env*' " ^
 " } | ForEach-Object { " ^
 "  $relative = $_.FullName.Substring($source.Length).TrimStart('\'); " ^
 "  $destination = Join-Path $target $relative; " ^
 "  New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null; " ^
 "  Copy-Item -LiteralPath $_.FullName -Destination $destination; " ^
 " } " ^
 "}; "

if errorlevel 1 (
    echo.
    echo ERRO ao preparar os arquivos!
    rd /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

set "ZIP_NAME=Projeto_%RANDOM%.zip"

powershell -NoProfile -Command ^
 "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ROOT%%ZIP_NAME%' -Force"

rd /s /q "%TEMP_DIR%"

echo.
echo ========================================
echo ZIP CRIADO COM SUCESSO!
echo ========================================
echo.
echo Arquivo: %ROOT%%ZIP_NAME%
echo.
pause
