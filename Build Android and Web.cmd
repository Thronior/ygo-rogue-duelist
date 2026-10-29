@echo off
setlocal
cd /d "%~dp0"

rem Use the project's own Python in python\ when it is there, otherwise one installed on this PC.
set "PYTHON="
if exist "%~dp0python\python.exe" set PYTHON="%~dp0python\python.exe"
if not defined PYTHON (where py >nul 2>nul && set "PYTHON=py -3")
if not defined PYTHON (where python >nul 2>nul && set "PYTHON=python")
if not defined PYTHON (
  echo Python 3 was not found. Install it from https://www.python.org/downloads/ and run this again.
  pause
  exit /b 1
)

call %PYTHON% -c "import PIL" >nul 2>nul
if errorlevel 1 (
  echo The build needs Python 3 with Pillow. Install Pillow with:
  echo     %PYTHON% -m pip install pillow
  pause
  exit /b 1
)

call %PYTHON% -B "%~dp0tools\build_release.py"
if errorlevel 1 pause
