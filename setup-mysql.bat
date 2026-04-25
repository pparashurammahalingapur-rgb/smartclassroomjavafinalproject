@echo off
echo ========================================
echo MySQL Database Setup
echo ========================================
echo.
echo This script will create the smart_classroom database in MySQL.
echo.

:prompt
set /p MYSQL_PASSWORD="Enter your MySQL root password: "

echo.
echo Creating database...
mysql -u root -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS smart_classroom;"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS: Database created successfully!
    echo ========================================
    echo.
    echo Now update your .env file with your MySQL password:
    echo MYSQL_PASSWORD=%MYSQL_PASSWORD%
    echo.
    echo Then run: npm start
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to create database
    echo ========================================
    echo.
    echo Please check:
    echo 1. MySQL is running
    echo 2. Your password is correct
    echo 3. You have admin privileges
    echo.
    choice /C:YN /M "Try again?"
    if errorlevel 2 goto end
    goto prompt
)

:end
pause
