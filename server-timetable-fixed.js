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
// DATABASE MODELS - USING SNAKE_CASE FOR CONSISTENCY
// ============================================

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
    teacher_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
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

// TIMETABLE SCHEMA - EXACT FIELD NAMES AS REQUESTED
const timetableSchema = new mongoose.Schema({
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], default: 'lecture' },
    semester: { type: String, default: 'Fall 2024' },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
const Course = mongoose.model('Course', courseSchema);
const Classroom = mongoose.model('Classroom', classroomSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const User = mongoose.model('User', userSchema);

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

// ============================================
// COURSE ROUTES
// ============================================

app.get('/api/courses', authMiddleware, async (req, res) => {
    try {
        const courses = await Course.find().populate('teacher_ids', 'firstName lastName email').sort({ code: 1 });
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/courses/:id', authMiddleware, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('teacher_ids', 'firstName lastName');
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, data: course });
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

// ============================================
// TIMETABLE ROUTES - FULLY FIXED
// ============================================

// Get all timetable entries with full joins
app.get('/api/timetable', authMiddleware, async (req, res) => {
    try {
        const entries = await Timetable.find()
            .populate('teacher_id', 'firstName lastName email department')
            .populate('course_id', 'code name credits department')
            .populate('class_id', 'name type capacity building')
            .sort({ day: 1, start_time: 1 });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get timetable by day
app.get('/api/timetable/day/:day', authMiddleware, async (req, res) => {
    try {
        const entries = await Timetable.find({ day: req.params.day.toLowerCase() })
            .populate('teacher_id', 'firstName lastName')
            .populate('course_id', 'code name')
            .populate('class_id', 'name type')
            .sort({ start_time: 1 });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get timetable for specific teacher
app.get('/api/timetable/teacher/:teacherId', authMiddleware, async (req, res) => {
    try {
        const entries = await Timetable.find({ teacher_id: req.params.teacherId })
            .populate('course_id', 'code name')
            .populate('class_id', 'name type')
            .sort({ day: 1, start_time: 1 });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ADD TIMETABLE ENTRY WITH CONFLICT DETECTION
app.post('/api/timetable', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { teacher_id, course_id, class_id, day, start_time, end_time, type, semester } = req.body;
        
        // Validate required fields
        if (!teacher_id || !course_id || !class_id || !day || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: teacher_id, course_id, class_id, day, start_time, end_time' 
            });
        }
        
        // Normalize day to lowercase
        const normalizedDay = day.toLowerCase();
        
        // Check TEACHER CONFLICT - same teacher at same time
        const teacherConflict = await Timetable.findOne({
            teacher_id: teacher_id,
            day: normalizedDay,
            $or: [
                { start_time: { $lt: end_time }, end_time: { $gt: start_time } }
            ]
        });
        
        if (teacherConflict) {
            return res.status(409).json({
                success: false,
                message: 'CONFLICT: This teacher is already assigned to another class at this time',
                conflict_type: 'teacher',
                conflict_details: {
                    existing_course: teacherConflict.course_id,
                    time: `${teacherConflict.start_time} - ${teacherConflict.end_time}`
                }
            });
        }
        
        // Check CLASSROOM CONFLICT - same classroom at same time
        const classroomConflict = await Timetable.findOne({
            class_id: class_id,
            day: normalizedDay,
            $or: [
                { start_time: { $lt: end_time }, end_time: { $gt: start_time } }
            ]
        });
        
        if (classroomConflict) {
            return res.status(409).json({
                success: false,
                message: 'CONFLICT: This classroom is already booked at this time',
                conflict_type: 'classroom',
                conflict_details: {
                    existing_course: classroomConflict.course_id,
                    time: `${classroomConflict.start_time} - ${classroomConflict.end_time}`
                }
            });
        }
        
        // Create timetable entry
        const entry = new Timetable({
            teacher_id: teacher_id,
            course_id: course_id,
            class_id: class_id,
            day: normalizedDay,
            start_time: start_time,
            end_time: end_time,
            type: type || 'lecture',
            semester: semester || 'Fall 2024'
        });
        
        await entry.save();
        
        // Return populated entry
        const populatedEntry = await Timetable.findById(entry._id)
            .populate('teacher_id', 'firstName lastName email department')
            .populate('course_id', 'code name credits department')
            .populate('class_id', 'name type capacity building');
        
        res.status(201).json({ 
            success: true, 
            message: 'Timetable entry created successfully',
            data: populatedEntry 
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete timetable entry
app.delete('/api/timetable/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Timetable.findByIdAndDelete(req.params.id);
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
        
        const stats = {
            total_teachers: await Teacher.countDocuments(),
            total_courses: await Course.countDocuments(),
            total_classrooms: await Classroom.countDocuments(),
            total_timetable_entries: await Timetable.countDocuments(),
            today_entries: await Timetable.countDocuments({ day: today }),
            available_rooms: await Classroom.countDocuments({ status: 'available' })
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
            .populate('teacher_id', 'firstName lastName')
            .populate('course_id', 'code name')
            .populate('class_id', 'name type')
            .sort({ start_time: 1 });
        res.json({ success: true, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// SERVE FRONTEND
// ============================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'timetable-dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login-fixed.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register-fixed.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'timetable-dashboard.html')));

// ============================================
// START SERVER
// ============================================

async function startServer() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB');
    
    await seedData();
    
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

async function seedData() {
    // Create admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
        firstName: 'Admin', lastName: 'User', email: 'admin@edusmart.edu',
        password: adminPassword, role: 'admin', department: 'Computer Science'
    });
    
    // Create teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    await User.create({
        firstName: 'John', lastName: 'Smith', email: 'teacher@edusmart.edu',
        password: teacherPassword, role: 'teacher', department: 'Computer Science'
    });
    
    // Create teachers
    const teachers = await Teacher.insertMany([
        { firstName: 'John', lastName: 'Smith', email: 'john.smith@edusmart.edu', department: 'Computer Science', specialization: 'AI' },
        { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@edusmart.edu', department: 'Mathematics', specialization: 'Calculus' },
        { firstName: 'Mike', lastName: 'Brown', email: 'mike.brown@edusmart.edu', department: 'Physics', specialization: 'Quantum' }
    ]);
    
    // Create classrooms
    const classrooms = await Classroom.insertMany([
        { name: 'A-101', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
        { name: 'A-102', type: 'lecture', capacity: 60, building: 'Main', floor: 1 },
        { name: 'B-201', type: 'lab', capacity: 30, building: 'Science', floor: 2 },
        { name: 'B-202', type: 'lab', capacity: 30, building: 'Science', floor: 2 },
        { name: 'C-301', type: 'seminar', capacity: 20, building: 'Arts', floor: 3 }
    ]);
    
    // Create courses with teacher assignments
    const courses = await Course.insertMany([
        { code: 'CS101', name: 'Intro to Programming', credits: 3, department: 'Computer Science', teacher_ids: [teachers[0]._id] },
        { code: 'CS201', name: 'Data Structures', credits: 4, department: 'Computer Science', teacher_ids: [teachers[0]._id] },
        { code: 'MATH101', name: 'Calculus I', credits: 3, department: 'Mathematics', teacher_ids: [teachers[1]._id] },
        { code: 'PHY101', name: 'Physics I', credits: 4, department: 'Physics', teacher_ids: [teachers[2]._id] },
        { code: 'CS301', name: 'Database Systems', credits: 3, department: 'Computer Science', teacher_ids: [teachers[0]._id] }
    ]);
    
    // Create sample timetable entries
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    
    await Timetable.create({
        teacher_id: teachers[0]._id,
        course_id: courses[0]._id,
        class_id: classrooms[0]._id,
        day: today,
        start_time: '09:00',
        end_time: '10:30',
        type: 'lecture',
        semester: 'Fall 2024'
    });
    
    await Timetable.create({
        teacher_id: teachers[1]._id,
        course_id: courses[2]._id,
        class_id: classrooms[1]._id,
        day: today,
        start_time: '11:00',
        end_time: '12:30',
        type: 'lecture',
        semester: 'Fall 2024'
    });
    
    console.log('Seed data created successfully');
}

startServer().catch(console.error);
