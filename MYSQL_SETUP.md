# MySQL Database Setup Guide

## Prerequisites
- MySQL Server installed on your system (version 5.7 or higher)
- MySQL root password or user credentials with database creation privileges

## Setup Steps

### Option 1: Using MySQL Command Line

1. **Open MySQL Command Line Client** or terminal
2. **Login to MySQL:**
   ```bash
   mysql -u root -p
   ```
   Enter your MySQL password when prompted

3. **Create the database:**
   ```sql
   CREATE DATABASE smart_classroom;
   ```

4. **Verify database creation:**
   ```sql
   SHOW DATABASES;
   ```

5. **Exit MySQL:**
   ```sql
   EXIT;
   ```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Click "Create a new schema" (database icon)
4. Enter schema name: `smart_classroom`
5. Click "Apply" then "Finish"

### Option 3: Using phpMyAdmin

1. Open phpMyAdmin in your browser (usually http://localhost/phpmyadmin)
2. Click "New" in the left sidebar
3. Enter database name: `smart_classroom`
4. Click "Create"

## Configure Application

1. **Update `.env` file** with your MySQL credentials:
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=smart_classroom
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. The application will automatically:
   - Connect to MySQL
   - Create all required tables
   - Seed initial data (users, teachers, courses, classrooms, timetable)

## Default Login Credentials

**Admin Account:**
- Email: admin@edusmart.edu
- Password: admin123

**Teacher Account:**
- Email: teacher@edusmart.edu
- Password: teacher123

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"
- Check your MySQL password in `.env` file
- Ensure MySQL service is running
- Try using a different MySQL user with proper privileges

### Error: "Unknown database 'smart_classroom'"
- Create the database manually using one of the methods above
- Check database name spelling in `.env` file

### Error: "Cannot connect to MySQL"
- Verify MySQL service is running:
  - Windows: `services.msc` → Look for "MySQL" service
  - Mac: `brew services list`
  - Linux: `sudo systemctl status mysql`

### Tables not created
- Check console logs for Sequelize errors
- Ensure database user has CREATE TABLE privileges
- Try deleting and recreating the database

## Database Tables Created

The application will automatically create these tables:
- `users` - User authentication and accounts
- `teachers` - Teacher/faculty information
- `courses` - Course catalog
- `classrooms` - Room/facility management
- `timetables` - Class schedules

## Backup & Restore

### Backup Database
```bash
mysqldump -u root -p smart_classroom > backup.sql
```

### Restore Database
```bash
mysql -u root -p smart_classroom < backup.sql
```

## Need Help?

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Verify MySQL is running and accessible
3. Ensure `.env` file has correct credentials
4. Try restarting the application
