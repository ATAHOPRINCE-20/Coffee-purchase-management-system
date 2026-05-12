@echo off
:: Navigate to the project directory
cd /d "f:\JANUARY 2026\Coffee Management System"

:: SUPABASE_SERVICE_ROLE_KEY must be set as a Windows Environment Variable.
:: Do NOT hardcode secrets here. Set it via:
::   System Properties > Environment Variables > System/User Variables
:: OR temporarily in the same terminal session before running this script:
::   set SUPABASE_SERVICE_ROLE_KEY=your_key_here
if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  echo ERROR: SUPABASE_SERVICE_ROLE_KEY is not set. Please set it as a system environment variable.
  exit /b 1
)

:: Run the backup script and append output to a log file
echo [%date% %time%] Starting automated backup... >> backups\backup_log.txt
node scripts\backup-db.js >> backups\backup_log.txt 2>&1
echo [%date% %time%] Backup finished. >> backups\backup_log.txt
echo ------------------------------------------ >> backups\backup_log.txt
