@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Smart Classroom Database Commands
echo ============================================
echo.

if "%~1"=="" goto :menu
if /i "%~1"=="seed" goto :seed
if /i "%~1"=="seed:reset" goto :seedreset
if /i "%~1"=="start" goto :startdb
if /i "%~1"=="reset" goto :reset
if /i "%~1"=="help" goto :help
goto :help

:menu
echo Available Commands:
echo.
echo   db-commands.bat seed       - Seed database with sample data
echo   db-commands.bat seed:reset - Clear and re-seed database
echo   db-commands.bat start      - Start server with MongoDB
echo   db-commands.bat reset      - Reset database and start server
echo   db-commands.bat help       - Show this help message
echo.
pause
goto :eof

:seed
echo Seeding database...
npm run seed
goto :done

:seedreset
echo Clearing and re-seeding database...
npm run seed:reset
goto :done

:startdb
echo Starting server with MongoDB...
npm start
goto :eof

:reset
echo Resetting database and starting server...
npm run db:reset
goto :eof

:help
echo Smart Classroom Database Management
echo.
echo USAGE: db-commands.bat [command]
echo.
echo Commands:
echo   seed       Populate database with sample data
echo   seed:reset Clear database and populate with fresh data
echo   start      Start the server (requires MongoDB running)
echo   reset      Full reset: clear, seed, and start server
echo   help       Show this help message
echo.
echo Examples:
echo   db-commands.bat seed
echo   db-commands.bat reset
echo.
echo Make sure MongoDB is running before using these commands!
echo   - Local: mongod --dbpath C:\data\db
echo   - Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest
goto :eof

:done
echo.
echo Command completed!
pause
