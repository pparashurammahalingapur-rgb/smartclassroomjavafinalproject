/**
 * Smart Classroom & Timetable Scheduler
 * Quick Start Server with In-Memory MongoDB
 * No installation required - runs immediately!
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database-memory');
const { Classroom, Course, Teacher, Schedule } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============================================
// Database Connection & Seeding
// ============================================
let dbConnected = false;

const seedData = async () => {
    try {
        console.log('\nSeeding database...');

        // Sample Classrooms
        const classrooms = await Classroom.insertMany([
            { number: 'A-101', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'available' },
            { number: 'A-102', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'occupied' },
            { number: 'B-201', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'available' },
            { number: 'B-202', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'occupied' },
            { number: 'C-301', type: 'seminar', capacity: 30, building: 'Arts Block', facilities: ['projector', 'whiteboard', 'wifi'], status: 'available' },
            { number: 'C-302', type: 'seminar', capacity: 25, building: 'Arts Block', facilities: ['projector', 'whiteboard'], status: 'maintenance' },
        ]);
        console.log(`  Created ${classrooms.length} classrooms`);

        // Sample Courses
        const courses = await Course.insertMany([
            { code: 'CS101', name: 'Introduction to Programming', department: 'cs', credits: 3, semester: 1, duration: 3, description: 'Basic programming concepts using Python' },
            { code: 'CS201', name: 'Data Structures', department: 'cs', credits: 4, semester: 2, duration: 4, description: 'Advanced data structures and algorithms' },
            { code: 'CS301', name: 'Database Systems', department: 'cs', credits: 3, semester: 3, duration: 3, description: 'Relational database design and SQL' },
            { code: 'MATH101', name: 'Calculus I', department: 'math', credits: 4, semester: 1, duration: 4, description: 'Differential and integral calculus' },
            { code: 'MATH201', name: 'Linear Algebra', department: 'math', credits: 3, semester: 2, duration: 3, description: 'Vector spaces and linear transformations' },
            { code: 'PHY101', name: 'Physics I', department: 'physics', credits: 4, semester: 1, duration: 4, description: 'Mechanics and thermodynamics' },
        ]);
        console.log(`  Created ${courses.length} courses`);

        // Sample Teachers
        const teachers = await Teacher.insertMany([
            { firstName: 'John', lastName: 'Smith', email: 'john.smith@university.edu', phone: '+1 (555) 123-4567', department: 'cs', designation: 'professor', specializations: ['AI', 'Machine Learning'] },
            { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@university.edu', phone: '+1 (555) 234-5678', department: 'cs', designation: 'associate', specializations: ['Software Engineering'] },
            { firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@university.edu', phone: '+1 (555) 345-6789', department: 'math', designation: 'professor', specializations: ['Pure Mathematics'] },
            { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@university.edu', phone: '+1 (555) 456-7890', department: 'physics', designation: 'assistant', specializations: ['Quantum Physics'] },
        ]);
        console.log(`  Created ${teachers.length} teachers`);

        // Sample Schedules
        const schedules = await Schedule.insertMany([
            { course: courses[0]._id, teacher: teachers[0]._id, classroom: classrooms[0]._id, day: 'monday', startTime: '09:00', endTime: '12:00', type: 'lecture', semester: 1 },
            { course: courses[1]._id, teacher: teachers[1]._id, classroom: classrooms[1]._id, day: 'monday', startTime: '14:00', endTime: '16:00', type: 'lecture', semester: 2 },
            { course: courses[2]._id, teacher: teachers[0]._id, classroom: classrooms[2]._id, day: 'tuesday', startTime: '10:00', endTime: '13:00', type: 'lab', semester: 3 },
            { course: courses[3]._id, teacher: teachers[2]._id, classroom: classrooms[0]._id, day: 'wednesday', startTime: '09:00', endTime: '13:00', type: 'lecture', semester: 1 },
            { course: courses[4]._id, teacher: teachers[2]._id, classroom: classrooms[3]._id, day: 'thursday', startTime: '11:00', endTime: '14:00', type: 'seminar', semester: 2 },
            { course: courses[5]._id, teacher: teachers[3]._id, classroom: classrooms[4]._id, day: 'friday', startTime: '09:00', endTime: '13:00', type: 'lecture', semester: 1 },
        ]);
        console.log(`  Created ${schedules.length} schedules`);

        console.log('\nDatabase seeded successfully!');
        dbConnected = true;
    } catch (error) {
        console.error('Seeding error:', error.message);
    }
};

// Initialize database
const initDB = async () => {
    await connectDB();
    await seedData();
};

initDB();

// ============================================
// API Routes - Dashboard
// ============================================
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = {
            totalClassrooms: await Classroom.countDocuments(),
            totalCourses: await Course.countDocuments(),
            totalTeachers: await Teacher.countDocuments(),
            totalStudents: 1256,
            availableRooms: await Classroom.countDocuments({ status: 'available' }),
            occupiedRooms: await Classroom.countDocuments({ status: 'occupied' }),
            maintenanceRooms: await Classroom.countDocuments({ status: 'maintenance' }),
            todayClasses: await Schedule.countDocuments()
        };
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/dashboard/weekly-overview', async (req, res) => {
    try {
        const overview = { labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], lectures: [0, 0, 0, 0, 0], labs: [0, 0, 0, 0, 0], seminars: [0, 0, 0, 0, 0] };
        const dayMap = { 'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4 };
        const schedules = await Schedule.find();
        schedules.forEach(s => { const idx = dayMap[s.day]; if (idx !== undefined) overview[s.type + 's'][idx]++; });
        res.json({ success: true, data: overview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// API Routes - Classrooms
// ============================================
app.get('/api/classrooms', async (req, res) => {
    try {
        const query = {};
        if (req.query.type && req.query.type !== 'all') query.type = req.query.type;
        if (req.query.search) query.$or = [{ number: { $regex: req.query.search, $options: 'i' } }, { building: { $regex: req.query.search, $options: 'i' } }];
        const classrooms = await Classroom.find(query).sort({ number: 1 });
        res.json({ success: true, count: classrooms.length, data: classrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/classrooms/:id', async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
        res.json({ success: true, data: classroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/classrooms', async (req, res) => {
    try {
        const classroom = new Classroom(req.body);
        await classroom.save();
        res.status(201).json({ success: true, data: classroom });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Classroom number already exists' });
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/classrooms/:id', async (req, res) => {
    try {
        await Schedule.deleteMany({ classroom: req.params.id });
        const classroom = await Classroom.findByIdAndDelete(req.params.id);
        if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
        res.json({ success: true, message: 'Classroom deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// API Routes - Courses
// ============================================
app.get('/api/courses', async (req, res) => {
    try {
        const query = {};
        if (req.query.department && req.query.department !== 'all') query.department = req.query.department;
        if (req.query.search) query.$or = [{ code: { $regex: req.query.search, $options: 'i' } }, { name: { $regex: req.query.search, $options: 'i' } }];
        const courses = await Course.find(query).sort({ code: 1 });
        res.json({ success: true, count: courses.length, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/courses', async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json({ success: true, data: course });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Course code already exists' });
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Schedule.deleteMany({ course: req.params.id });
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// API Routes - Teachers
// ============================================
app.get('/api/teachers', async (req, res) => {
    try {
        const query = {};
        if (req.query.department && req.query.department !== 'all') query.department = req.query.department;
        if (req.query.search) query.$or = [{ firstName: { $regex: req.query.search, $options: 'i' } }, { lastName: { $regex: req.query.search, $options: 'i' } }, { email: { $regex: req.query.search, $options: 'i' } }];
        const teachers = await Teacher.find(query).sort({ lastName: 1, firstName: 1 });
        res.json({ success: true, count: teachers.length, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/teachers', async (req, res) => {
    try {
        const teacher = new Teacher(req.body);
        await teacher.save();
        res.status(201).json({ success: true, data: teacher });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email already exists' });
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/teachers/:id', async (req, res) => {
    try {
        await Schedule.deleteMany({ teacher: req.params.id });
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        res.json({ success: true, message: 'Teacher and all associated schedules deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// API Routes - Schedules
// ============================================
app.get('/api/schedules', async (req, res) => {
    try {
        const query = {};
        if (req.query.day) query.day = req.query.day.toLowerCase();
        const schedules = await Schedule.find(query)
            .populate('course', 'code name credits')
            .populate('teacher', 'firstName lastName avatar')
            .populate('classroom', 'number type building')
            .sort({ day: 1, startTime: 1 });
        res.json({ success: true, count: schedules.length, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/schedules', async (req, res) => {
    try {
        const schedule = new Schedule(req.body);
        await schedule.save();
        await schedule.populate('course', 'code name');
        await schedule.populate('teacher', 'firstName lastName');
        await schedule.populate('classroom', 'number type');
        res.status(201).json({ success: true, data: schedule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
        res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// Serve Frontend
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'auth-dashboard.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'auth-dashboard.html')));
app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'auth-dashboard.html')));

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Start Server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('  Smart Classroom & Timetable Scheduler');
    console.log('  With In-Memory MongoDB (No Installation!)');
    console.log('  Server running on http://localhost:' + PORT);
    console.log('='.repeat(60));
});

module.exports = app;
