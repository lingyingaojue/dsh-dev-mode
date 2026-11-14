@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.10+ is required to run this program from source.
  echo Install it from https://www.python.org/downloads/ or use the packaged EXE.
  pause
  exit /b 1
)

where pythonw >nul 2>nul
if errorlevel 1 (
  python app.py
) else (
  start "" pythonw app.py
)
