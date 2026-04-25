const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'smart-classroom-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// SQLite Database Setup (No configuration needed!)
// ============================================
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

// ============================================
// Database Models
// ============================================
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'teacher'), defaultValue: 'teacher' },
    department: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'users', timestamps: true });

const Teacher = sequelize.define('Teacher', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    department: { type: DataTypes.STRING, allowNull: false },
    specialization: { type: DataTypes.STRING, defaultValue: '' }
}, { tableName: 'teachers', timestamps: true });

const Course = sequelize.define('Course', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    department: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    teacherIds: { type: DataTypes.JSON, defaultValue: [] }
}, { tableName: 'courses', timestamps: true });

const Classroom = sequelize.define('Classroom', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('lecture', 'lab', 'seminar'), allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    building: { type: DataTypes.STRING, allowNull: false },
    floor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.ENUM('available', 'occupied', 'maintenance'), defaultValue: 'available' }
}, { tableName: 'classrooms', timestamps: true });

const Timetable = sequelize.define('Timetable', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    classroomId: { type: DataTypes.INTEGER, allowNull: false },
    day: { type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), allowNull: false },
    startTime: { type: DataTypes.STRING, allowNull: false },
    endTime: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('lecture', 'lab', 'seminar'), defaultValue: 'lecture' },
    semester: { type: DataTypes.STRING, defaultValue: 'Fall 2024' }
}, { tableName: 'timetables', timestamps: true });

// Define relationships
Timetable.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Timetable.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Timetable.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

// Serve complete working app for all routes
app.get('/', (req, res) => {
    console.log('[Server] Serving complete Smart Classroom app');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => res.redirect('/'));
app.get('/login', (req, res) => res.redirect('/'));
app.get('/dashboard', (req, res) => res.redirect('/'));
app.get('/teachers', (req, res) => res.redirect('/'));
app.get('/courses', (req, res) => res.redirect('/'));
app.get('/classrooms', (req, res) => res.redirect('/'));
app.get('/timetable', (req, res) => res.redirect('/'));

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'Access denied' });
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const adminMiddleware = async (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin required' });
    next();
};

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ firstName, lastName, email, password: hashedPassword, role: role || 'teacher', department });
        
        if (role === 'teacher' || !role) {
            await Teacher.create({ firstName, lastName, email, department });
        }
        res.status(201).json({ success: true, message: 'User registered' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, department: user.department }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password'] } });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TEACHER ROUTES
// ============================================
app.get('/api/teachers', authMiddleware, async (req, res) => {
    try {
        const teachers = await Teacher.findAll({ order: [['firstName', 'ASC']] });
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/teachers', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.create(req.body);
        res.status(201).json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/teachers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        await teacher.update(req.body);
        res.json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/teachers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        await teacher.destroy();
        res.json({ success: true, message: 'Teacher deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// COURSE ROUTES
// ============================================
app.get('/api/courses', authMiddleware, async (req, res) => {
    try {
        const courses = await Course.findAll({ order: [['code', 'ASC']] });
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/courses', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.status(201).json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        await course.update(req.body);
        res.json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        await course.destroy();
        res.json({ success: true, message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// CLASSROOM ROUTES
// ============================================
app.get('/api/classrooms', authMiddleware, async (req, res) => {
    try {
        const classrooms = await Classroom.findAll({ order: [['name', 'ASC']] });
        res.json({ success: true, data: classrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/classrooms', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const classroom = await Classroom.create(req.body);
        res.status(201).json({ success: true, data: classroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/classrooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
        await classroom.update(req.body);
        res.json({ success: true, data: classroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/classrooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);
        if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
        await classroom.destroy();
        res.json({ success: true, message: 'Classroom deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TIMETABLE ROUTES
// ============================================
app.get('/api/timetable', authMiddleware, async (req, res) => {
    try {
        const entries = await Timetable.findAll({
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'firstName', 'lastName', 'email', 'department'] },
                { model: Course, as: 'course', attributes: ['id', 'code', 'name', 'credits', 'department'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'type', 'capacity', 'building'] }
            ],
            order: [['day', 'ASC'], ['startTime', 'ASC']]
        });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/timetable', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { teacherId, courseId, classroomId, day, startTime, endTime, type, semester } = req.body;
        if (!teacherId || !courseId || !classroomId || !day || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const normalizedDay = day.toLowerCase();
        
        const teacherConflict = await Timetable.findOne({
            where: { teacherId, day: normalizedDay, [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }] }
        });
        if (teacherConflict) return res.status(409).json({ success: false, message: 'Teacher already scheduled at this time', conflict: 'teacher' });
        
        const classroomConflict = await Timetable.findOne({
            where: { classroomId, day: normalizedDay, [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }] }
        });
        if (classroomConflict) return res.status(409).json({ success: false, message: 'Classroom already booked at this time', conflict: 'classroom' });
        
        const entry = await Timetable.create({ teacherId, courseId, classroomId, day: normalizedDay, startTime, endTime, type: type || 'lecture', semester: semester || 'Fall 2024' });
        
        const populatedEntry = await Timetable.findByPk(entry.id, {
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
                { model: Course, as: 'course', attributes: ['id', 'code', 'name'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'type'] }
            ]
        });
        
        res.status(201).json({ success: true, message: 'Timetable entry created', data: populatedEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/timetable/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { teacherId, courseId, classroomId, day, startTime, endTime, type, semester } = req.body;
        const entry = await Timetable.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
        
        if (teacherId && day && startTime && endTime) {
            const normalizedDay = day.toLowerCase();
            const teacherConflict = await Timetable.findOne({
                where: { teacherId, day: normalizedDay, id: { [Op.ne]: req.params.id }, [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }] }
            });
            if (teacherConflict) return res.status(409).json({ success: false, message: 'Teacher already scheduled at this time', conflict: 'teacher' });
            
            const classroomConflict = await Timetable.findOne({
                where: { classroomId, day: normalizedDay, id: { [Op.ne]: req.params.id }, [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }] }
            });
            if (classroomConflict) return res.status(409).json({ success: false, message: 'Classroom already booked at this time', conflict: 'classroom' });
        }
        
        await entry.update({ teacherId, courseId, classroomId, day: day?.toLowerCase(), startTime, endTime, type, semester });
        
        const updatedEntry = await Timetable.findByPk(entry.id, {
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
                { model: Course, as: 'course', attributes: ['id', 'code', 'name'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'type'] }
            ]
        });
        
        res.json({ success: true, data: updatedEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/timetable/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const entry = await Timetable.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
        await entry.destroy();
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// DASHBOARD ROUTES
// ============================================
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        
        const [totalTeachers, totalCourses, totalClassrooms, totalTimetable, todayEntries, availableRooms] = await Promise.all([
            Teacher.count(),
            Course.count(),
            Classroom.count(),
            Timetable.count(),
            Timetable.count({ where: { day: today } }),
            Classroom.count({ where: { status: 'available' } })
        ]);
        
        res.json({ success: true, data: { totalTeachers, totalCourses, totalClassrooms, totalTimetable, todayEntries, availableRooms } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/dashboard/today', authMiddleware, async (req, res) => {
    try {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        
        const entries = await Timetable.findAll({
            where: { day: today },
            include: [
                { model: Teacher, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] },
                { model: Course, as: 'course', attributes: ['id', 'code', 'name'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'type'] }
            ],
            order: [['startTime', 'ASC']]
        });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVE SPA
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        
        await sequelize.sync({ alter: true });
        console.log('✅ Database tables created');
        
        const userCount = await User.count();
        if (userCount === 0) {
            console.log('🌱 Seeding database...');
            
            const adminPassword = await bcrypt.hash('admin123', 10);
            await User.create({ firstName: 'Admin', lastName: 'User', email: 'admin@edusmart.edu', password: adminPassword, role: 'admin', department: 'Computer Science' });
            
            const teacherPassword = await bcrypt.hash('teacher123', 10);
            await User.create({ firstName: 'John', lastName: 'Smith', email: 'teacher@edusmart.edu', password: teacherPassword, role: 'teacher', department: 'Computer Science' });
            
            const teachers = await Teacher.bulkCreate([
                { firstName: 'John', lastName: 'Smith', email: 'john@edusmart.edu', department: 'Computer Science' },
                { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@edusmart.edu', department: 'Mathematics' },
                { firstName: 'Mike', lastName: 'Brown', email: 'mike@edusmart.edu', department: 'Physics' }
            ]);
            
            const classrooms = await Classroom.bulkCreate([
                { name: 'A-101', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
                { name: 'A-102', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
                { name: 'B-201', type: 'lab', capacity: 30, building: 'Science', floor: 2 }
            ]);
            
            const courses = await Course.bulkCreate([
                { code: 'CS101', name: 'Intro to Programming', credits: 3, department: 'Computer Science', teacherIds: [teachers[0].id] },
                { code: 'MATH101', name: 'Calculus I', credits: 3, department: 'Mathematics', teacherIds: [teachers[1].id] },
                { code: 'PHY101', name: 'Physics I', credits: 4, department: 'Physics', teacherIds: [teachers[2].id] }
            ]);
            
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const today = days[new Date().getDay()];
            await Timetable.create({ teacherId: teachers[0].id, courseId: courses[0].id, classroomId: classrooms[0].id, day: today, startTime: '09:00', endTime: '10:30', type: 'lecture' });
            
            console.log('✅ Seed data created');
        }
        
        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log('  Smart Classroom & Timetable Scheduler');
            console.log('  Server running on http://localhost:' + PORT);
            console.log('  Database: SQLite (No setup required!)');
            console.log('='.repeat(60));
            console.log('\n📧 Login Credentials:');
            console.log('   Admin: admin@edusmart.edu / admin123');
            console.log('   Teacher: teacher@edusmart.edu / teacher123');
            console.log('='.repeat(60));
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
