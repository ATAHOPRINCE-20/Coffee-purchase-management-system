@echo off
:: Navigate to the project directory
cd /d "f:\JANUARY 2026\Coffee Management System"

:: Set the service role key (Replace with your actual key if different)
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcWloY25ranFna3JqcnN6dHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgxNDQyNiwiZXhwIjoyMDg3MzkwNDI2fQ.2ESMddTt0PSZbhn4iYeBkffhcY19oiWDZ2_eFb3MPHY

:: Run the backup script and append output to a log file
echo [%date% %time%] Starting automated backup... >> backups\backup_log.txt
node scripts\backup-db.js >> backups\backup_log.txt 2>&1
echo [%date% %time%] Backup finished. >> backups\backup_log.txt
echo ------------------------------------------ >> backups\backup_log.txt
