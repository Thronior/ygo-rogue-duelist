@echo off
cd /d "%~dp0"
"%~dp0python\python.exe" -B "%~dp0tools\build_release.py"
if errorlevel 1 pause
