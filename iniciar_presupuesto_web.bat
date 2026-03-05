@echo off
cd /d "F:\Banco_Geometria\Proyectos\Presupuesto_Fintech_Web"
set "PATH=C:\Program Files\nodejs;%PATH%"
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process http://localhost:5173"
"C:\Program Files\nodejs\npm.cmd" run dev
