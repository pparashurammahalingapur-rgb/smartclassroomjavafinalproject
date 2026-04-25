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
app.use(express.static(path.join(__dirname, 'public')));

// Serve complete working app for all routes
app.get('/', (req, res) => {
    console.log('[Server] Serving complete Smart Classroom app');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/login', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/dashboard', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/teachers', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/courses', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/classrooms', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

app.get('/timetable', (req, res) => {
    console.log('[Server] Redirecting to main app');
    res.redirect('/');
});

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
    specialization: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true, default: 3 },
    department: { type: String, required: true },
    description: { type: String, default: '' },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
    createdAt: { type: Date, default: Date.now }
});

const classroomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], required: true },
    capacity: { type: Number, required: true, default: 30 },
    building: { type: String, required: true },
    floor: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    createdAt: { type: Date, default: Date.now }
});

const timetableSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], default: 'lecture' },
    semester: { type: String, default: 'Fall 2024' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Course = mongoose.model('Course', courseSchema);
const Classroom = mongoose.model('Classroom', classroomSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);

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
            const teacher = new Teacher({ firstName, lastName, email, department });
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

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
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
        const teachers = await Teacher.find().sort({ firstName: 1 });
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

// UPDATE Teacher - ADD MISSING PUT ENDPOINT
app.put('/api/teachers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// COURSE ROUTES
// ============================================

app.get('/api/courses', authMiddleware, async (req, res) => {
    try {
        const courses = await Course.find().populate('teacherIds', 'firstName lastName').sort({ code: 1 });
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

// UPDATE Course - ADD MISSING PUT ENDPOINT
app.put('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        res.json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// CLASSROOM ROUTES
// ============================================

app.get('/api/classrooms', authMiddleware, async (req, res) => {
    try {
        const classrooms = await Classroom.find().sort({ name: 1 });
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

app.delete('/api/classrooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Classroom.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Classroom deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE Classroom - ADD MISSING PUT ENDPOINT
app.put('/api/classrooms/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const classroom = await Classroom.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found' });
        }
        res.json({ success: true, data: classroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TIMETABLE ROUTES
// ============================================

app.get('/api/timetable', authMiddleware, async (req, res) => {
    try {
        const entries = await Timetable.find()
            .populate('teacherId', 'firstName lastName email department')
            .populate('courseId', 'code name credits department')
            .populate('classroomId', 'name type capacity building')
            .sort({ day: 1, startTime: 1 });
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
        
        // Check teacher conflict
        const teacherConflict = await Timetable.findOne({
            teacherId, day: normalizedDay,
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
        });
        if (teacherConflict) return res.status(409).json({ success: false, message: 'Teacher already scheduled at this time', conflict: 'teacher' });
        
        // Check classroom conflict
        const classroomConflict = await Timetable.findOne({
            classroomId, day: normalizedDay,
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
        });
        if (classroomConflict) return res.status(409).json({ success: false, message: 'Classroom already booked at this time', conflict: 'classroom' });
        
        const entry = new Timetable({ teacherId, courseId, classroomId, day: normalizedDay, startTime, endTime, type: type || 'lecture', semester: semester || 'Fall 2024' });
        await entry.save();
        
        const populatedEntry = await Timetable.findById(entry._id)
            .populate('teacherId', 'firstName lastName')
            .populate('courseId', 'code name')
            .populate('classroomId', 'name type');
        
        res.status(201).json({ success: true, message: 'Timetable entry created', data: populatedEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/timetable/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Timetable.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Timetable entry deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE Timetable - ADD MISSING PUT ENDPOINT
app.put('/api/timetable/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { teacherId, courseId, classroomId, day, startTime, endTime, type, semester } = req.body;
        
        // Check for conflicts if changing schedule
        if (teacherId && day && startTime && endTime) {
            const normalizedDay = day.toLowerCase();
            
            // Check teacher conflict (excluding current entry)
            const teacherConflict = await Timetable.findOne({
                teacherId,
                day: normalizedDay,
                _id: { $ne: req.params.id },
                $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
            });
            if (teacherConflict) {
                return res.status(409).json({ success: false, message: 'Teacher already scheduled at this time', conflict: 'teacher' });
            }
            
            // Check classroom conflict (excluding current entry)
            const classroomConflict = await Timetable.findOne({
                classroomId,
                day: normalizedDay,
                _id: { $ne: req.params.id },
                $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
            });
            if (classroomConflict) {
                return res.status(409).json({ success: false, message: 'Classroom already booked at this time', conflict: 'classroom' });
            }
        }
        
        const entry = await Timetable.findByIdAndUpdate(
            req.params.id,
            { teacherId, courseId, classroomId, day: day?.toLowerCase(), startTime, endTime, type, semester },
            { new: true, runValidators: true }
        )
        .populate('teacherId', 'firstName lastName')
        .populate('courseId', 'code name')
        .populate('classroomId', 'name type');
        
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Timetable entry not found' });
        }
        res.json({ success: true, data: entry });
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
            totalTimetable: await Timetable.countDocuments(),
            todayEntries: await Timetable.countDocuments({ day: today }),
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
        const entries = await Timetable.find({ day: today })
            .populate('teacherId', 'firstName lastName')
            .populate('courseId', 'code name')
            .populate('classroomId', 'name type')
            .sort({ startTime: 1 });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVE REACT APP (SPA)
// ============================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Seed data
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({ firstName: 'Admin', lastName: 'User', email: 'admin@edusmart.edu', password: adminPassword, role: 'admin', department: 'Computer Science' });
    
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    await User.create({ firstName: 'John', lastName: 'Smith', email: 'teacher@edusmart.edu', password: teacherPassword, role: 'teacher', department: 'Computer Science' });
    
    const teachers = await Teacher.insertMany([
        { firstName: 'John', lastName: 'Smith', email: 'john@edusmart.edu', department: 'Computer Science' },
        { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@edusmart.edu', department: 'Mathematics' },
        { firstName: 'Mike', lastName: 'Brown', email: 'mike@edusmart.edu', department: 'Physics' }
    ]);
    
    const classrooms = await Classroom.insertMany([
        { name: 'A-101', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
        { name: 'A-102', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
        { name: 'B-201', type: 'lab', capacity: 30, building: 'Science', floor: 2 }
    ]);
    
    const courses = await Course.insertMany([
        { code: 'CS101', name: 'Intro to Programming', credits: 3, department: 'Computer Science', teacherIds: [teachers[0]._id] },
        { code: 'MATH101', name: 'Calculus I', credits: 3, department: 'Mathematics', teacherIds: [teachers[1]._id] },
        { code: 'PHY101', name: 'Physics I', credits: 4, department: 'Physics', teacherIds: [teachers[2]._id] }
    ]);
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    await Timetable.create({ teacherId: teachers[0]._id, courseId: courses[0]._id, classroomId: classrooms[0]._id, day: today, startTime: '09:00', endTime: '10:30', type: 'lecture' });
    
    console.log('Seed data created');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer().catch(console.error);
