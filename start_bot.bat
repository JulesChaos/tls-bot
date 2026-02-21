@echo off
title TLS Roleplay - Discord Bot (24/7)
color 0A
echo ==========================================
echo    TLS Roleplay - Discord Bot (24/7)
echo ==========================================
echo.
echo Bot laeuft im Auto-Restart Modus.
echo Druecke CTRL+C zum Beenden.
echo.

:loop
echo [%date% %time%] Bot wird gestartet...
cd /d "C:\Users\julia\.gemini\antigravity\scratch\discord-bot-setup"
node index.js
echo.
echo [%date% %time%] Bot wurde beendet. Neustart in 5 Sekunden...
timeout /t 5 /nobreak >nul
goto loop
