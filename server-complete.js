const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'smart-classroom-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ============================================
// DATABASE MODELS
// ============================================

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const teacherSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    specialization: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    department: { type: String, required: true },
    description: { type: String },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
    createdAt: { type: Date, default: Date.now }
});

const classroomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], required: true },
    capacity: { type: Number, required: true },
    building: { type: String, required: true },
    floor: { type: Number, required: true },
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    createdAt: { type: Date, default: Date.now }
});

const scheduleSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], required: true },
    semester: { type: String, required: true },
    academicYear: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Course = mongoose.model('Course', courseSchema);
const Classroom = mongoose.model('Classroom', classroomSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);

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
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ firstName, lastName, email, password: hashedPassword, role: role || 'teacher', department });
        await user.save();
        
        if (role === 'teacher' || !role) {
            const teacher = new Teacher({ firstName, lastName, email, department, userId: user._id });
            await teacher.save();
        }
        res.status(201).json({ success: true, message: 'User registered' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, department: user.department }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TEACHER ROUTES
// ============================================

app.get('/api/teachers', authMiddleware, async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/teachers', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = new Teacher(req.body);
        await teacher.save();
        res.status(201).json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/teachers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
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
        const courses = await Course.find().populate('teacherIds', 'firstName lastName');
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/courses', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
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
        const classrooms = await Classroom.find();
        res.json({ success: true, data: classrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/classrooms', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const classroom = new Classroom(req.body);
        await classroom.save();
        res.status(201).json({ success: true, data: classroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SCHEDULE ROUTES WITH CONFLICT DETECTION
// ============================================

app.get('/api/schedules', authMiddleware, async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate('courseId', 'code name')
            .populate('teacherId', 'firstName lastName')
            .populate('classroomId', 'name type');
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/schedules', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { courseId, teacherId, classroomId, day, startTime, endTime, type, semester, academicYear } = req.body;
        
        // Check teacher conflict
        const teacherConflict = await Schedule.findOne({
            teacherId, day: day.toLowerCase(),
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
        });
        if (teacherConflict) return res.status(409).json({ success: false, message: 'Teacher already scheduled at this time', conflict: 'teacher' });
        
        // Check classroom conflict
        const classroomConflict = await Schedule.findOne({
            classroomId, day: day.toLowerCase(),
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
        });
        if (classroomConflict) return res.status(409).json({ success: false, message: 'Classroom already booked at this time', conflict: 'classroom' });
        
        const schedule = new Schedule({ courseId, teacherId, classroomId, day: day.toLowerCase(), startTime, endTime, type, semester, academicYear });
        await schedule.save();
        
        const populatedSchedule = await Schedule.findById(schedule._id)
            .populate('courseId', 'code name')
            .populate('teacherId', 'firstName lastName')
            .populate('classroomId', 'name type');
        
        res.status(201).json({ success: true, data: populatedSchedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/schedules/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Schedule.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Schedule deleted' });
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
        const stats = {
            totalTeachers: await Teacher.countDocuments(),
            totalCourses: await Course.countDocuments(),
            totalClassrooms: await Classroom.countDocuments(),
            totalSchedules: await Schedule.countDocuments(),
            todaySchedules: await Schedule.countDocuments({ day: today }),
            availableRooms: await Classroom.countDocuments({ status: 'available' })
        };
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/dashboard/today', authMiddleware, async (req, res) => {
    try {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        const schedules = await Schedule.find({ day: today })
            .populate('courseId', 'code name')
            .populate('teacherId', 'firstName lastName')
            .populate('classroomId', 'name type')
            .sort({ startTime: 1 });
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVE FRONTEND
// ============================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login-fixed.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login-fixed.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register-fixed.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-fixed.html')));

// ============================================
// START SERVER WITH IN-MEMORY DB
// ============================================

async function startServer() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB');
    
    // Seed initial data
    await seedData();
    
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

async function seedData() {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@edusmart.edu',
        password: adminPassword,
        role: 'admin',
        department: 'Computer Science'
    });
    await admin.save();
    
    // Create demo teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacherUser = new User({
        firstName: 'John',
        lastName: 'Smith',
        email: 'teacher@edusmart.edu',
        password: teacherPassword,
        role: 'teacher',
        department: 'Computer Science'
    });
    await teacherUser.save();
    
    const teacher = new Teacher({
        firstName: 'John',
        lastName: 'Smith',
        email: 'teacher@edusmart.edu',
        department: 'Computer Science',
        specialization: 'AI & Machine Learning',
        userId: teacherUser._id
    });
    await teacher.save();
    
    // Create classrooms
    const classrooms = await Classroom.insertMany([
        { name: 'A-101', type: 'lecture', capacity: 60, building: 'Main', floor: 1, status: 'available' },
        { name: 'A-102', type: 'lecture', capacity: 60, building: 'Main', floor: 1, status: 'available' },
        { name: 'B-201', type: 'lab', capacity: 30, building: 'Science', floor: 2, status: 'available' },
        { name: 'B-202', type: 'lab', capacity: 30, building: 'Science', floor: 2, status: 'available' },
        { name: 'C-301', type: 'seminar', capacity: 20, building: 'Arts', floor: 3, status: 'available' }
    ]);
    
    // Create courses
    const courses = await Course.insertMany([
        { code: 'CS101', name: 'Introduction to Programming', credits: 3, department: 'Computer Science', teacherIds: [teacher._id] },
        { code: 'CS201', name: 'Data Structures', credits: 4, department: 'Computer Science', teacherIds: [teacher._id] },
        { code: 'MATH101', name: 'Calculus I', credits: 3, department: 'Mathematics', teacherIds: [] },
        { code: 'PHY101', name: 'Physics I', credits: 4, department: 'Physics', teacherIds: [] }
    ]);
    
    // Create sample schedule
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    await Schedule.create({
        courseId: courses[0]._id,
        teacherId: teacher._id,
        classroomId: classrooms[0]._id,
        day: today,
        startTime: '09:00',
        endTime: '10:30',
        type: 'lecture',
        semester: 'Fall 2024',
        academicYear: '2024-2025'
    });
    
    console.log('Seed data created');
}

startServer().catch(console.error);
