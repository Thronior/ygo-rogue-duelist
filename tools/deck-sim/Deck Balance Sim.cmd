@echo off
title YGO Rogue Duelist - Deck Balance Sim
cd /d "%~dp0..\.."
rem Opens the simulator window. For the terminal menu instead: runtime\ai\node.exe tools\deck-sim\deck_sim.mjs
"runtime\ai\node.exe" "tools\deck-sim\deck_sim_ui.mjs" %*
if errorlevel 1 pause
