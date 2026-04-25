const express = require('express');
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

// User Schema (for authentication)
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
    department: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Teacher Schema
const teacherSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    specialization: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Course Schema
const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    credits: { type: Number, required: true },
    department: { type: String, required: true },
    description: { type: String },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }], // Multiple teachers can teach
    createdAt: { type: Date, default: Date.now }
});

// Classroom Schema
const classroomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['lecture', 'lab', 'seminar'], required: true },
    capacity: { type: Number, required: true },
    building: { type: String, required: true },
    floor: { type: Number, required: true },
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    createdAt: { type: Date, default: Date.now }
});

// Timetable/Schedule Schema
const scheduleSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    day: { 
        type: String, 
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true 
    },
    startTime: { type: String, required: true }, // Format: "09:00"
    endTime: { type: String, required: true },   // Format: "10:30"
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
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const adminMiddleware = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role || 'teacher',
            department
        });
        await user.save();
        
        // If teacher role, also create teacher record
        if (role === 'teacher' || !role) {
            const teacher = new Teacher({
                firstName,
                lastName,
                email,
                department,
                userId: user._id
            });
            await teacher.save();
        }
        
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get current user
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

// Get all teachers
app.get('/api/teachers', authMiddleware, async (req, res) => {
    try {
        const teachers = await Teacher.find().populate('userId', 'email role');
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get teachers by department
app.get('/api/teachers/department/:dept', authMiddleware, async (req, res) => {
    try {
        const teachers = await Teacher.find({ department: req.params.dept });
        res.json({ success: true, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add teacher (admin only)
app.post('/api/teachers', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const teacher = new Teacher(req.body);
        await teacher.save();
        res.status(201).json({ success: true, data: teacher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete teacher
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

// Get all courses with teacher details
app.get('/api/courses', authMiddleware, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('teacherIds', 'firstName lastName email department');
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get courses by teacher
app.get('/api/courses/teacher/:teacherId', authMiddleware, async (req, res) => {
    try {
        const courses = await Course.find({ teacherIds: req.params.teacherId });
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add course
app.post('/api/courses', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update course
app.put('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete course
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

// Get all classrooms
app.get('/api/classrooms', authMiddleware, async (req, res) => {
    try {
        const classrooms = await Classroom.find();
        res.json({ success: true, data: classrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add classroom
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
// TIMETABLE/SCHEDULE ROUTES
// ============================================

// Helper function to check time conflicts
function timeOverlaps(start1, end1, start2, end2) {
    const toMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
    
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    
    return s1 < e2 && s2 < e1;
}

// Get all schedules with populated data
app.get('/api/schedules', authMiddleware, async (req, res) => {
    try {
        const schedules = await Schedule.find()
            .populate('courseId', 'code name credits')
            .populate('teacherId', 'firstName lastName email department')
            .populate('classroomId', 'name type building capacity');
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get schedules by day
app.get('/api/schedules/day/:day', authMiddleware, async (req, res) => {
    try {
        const schedules = await Schedule.find({ day: req.params.day.toLowerCase() })
            .populate('courseId', 'code name')
            .populate('teacherId', 'firstName lastName')
            .populate('classroomId', 'name type');
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add schedule with conflict detection
app.post('/api/schedules', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { courseId, teacherId, classroomId, day, startTime, endTime, type, semester, academicYear } = req.body;
        
        // Check teacher conflict
        const teacherConflict = await Schedule.findOne({
            teacherId,
            day: day.toLowerCase(),
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });
        
        if (teacherConflict) {
            return res.status(409).json({
                success: false,
                message: 'Teacher is already scheduled for another class at this time',
                conflict: 'teacher'
            });
        }
        
        // Check classroom conflict
        const classroomConflict = await Schedule.findOne({
            classroomId,
            day: day.toLowerCase(),
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
        });
        
        if (classroomConflict) {
            return res.status(409).json({
                success: false,
                message: 'Classroom is already booked at this time',
                conflict: 'classroom'
            });
        }
        
        // Create schedule
        const schedule = new Schedule({
            courseId,
            teacherId,
            classroomId,
            day: day.toLowerCase(),
            startTime,
            endTime,
            type,
            semester,
            academicYear
        });
        
        await schedule.save();
        
        // Return populated schedule
        const populatedSchedule = await Schedule.findById(schedule._id)
            .populate('courseId', 'code name')
            .populate('teacherId', 'firstName lastName')
            .populate('classroomId', 'name type');
        
        res.status(201).json({ success: true, data: populatedSchedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete schedule
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
        const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
        
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

// Get today's timetable
app.get('/api/dashboard/today', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
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
// DATABASE CONNECTION & START
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_classroom';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });