/**
 * Smart Classroom & Timetable Scheduler - Backend API with MongoDB
 * Node.js + Express + MongoDB Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/database');
const { Classroom, Course, Teacher, Schedule } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============================================
// Database Connection
// ============================================
connectDB();

// ============================================
// API Routes - Dashboard
// ============================================
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = {
            totalClassrooms: await Classroom.countDocuments(),
            totalCourses: await Course.countDocuments(),
            totalTeachers: await Teacher.countDocuments(),
            totalStudents: 1256, // Simulated
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
        const overview = {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            lectures: [0, 0, 0, 0, 0],
            labs: [0, 0, 0, 0, 0],
            seminars: [0, 0, 0, 0, 0]
        };

        const dayMap = { 'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4 };

        const schedules = await Schedule.find();
        schedules.forEach(schedule => {
            const dayIndex = dayMap[schedule.day];
            if (dayIndex !== undefined && overview[schedule.type + 's']) {
                overview[schedule.type + 's'][dayIndex]++;
            }
        });

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
        if (req.query.status) query.status = req.query.status;
        if (req.query.search) {
            query.$or = [
                { number: { $regex: req.query.search, $options: 'i' } },
                { building: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const classrooms = await Classroom.find(query).sort({ number: 1 });
        res.json({ success: true, count: classrooms.length, data: classrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/classrooms/:id', async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found' });
        }
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
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Classroom number already exists' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
});

app.put('/api/classrooms/:id', async (req, res) => {
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
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/classrooms/:id', async (req, res) => {
    try {
        // Check for existing schedules
        const scheduleCount = await Schedule.countDocuments({ classroom: req.params.id });
        if (scheduleCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete classroom with existing schedules' 
            });
        }

        const classroom = await Classroom.findByIdAndDelete(req.params.id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found' });
        }
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
        if (req.query.department && req.query.department !== 'all') {
            query.department = req.query.department;
        }
        if (req.query.search) {
            query.$or = [
                { code: { $regex: req.query.search, $options: 'i' } },
                { name: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query).sort({ code: 1 });
        res.json({ success: true, count: courses.length, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        res.json({ success: true, data: course });
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
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Course code already exists' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
});

app.put('/api/courses/:id', async (req, res) => {
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
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        // Check for existing schedules
        const scheduleCount = await Schedule.countDocuments({ course: req.params.id });
        if (scheduleCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete course with existing schedules' 
            });
        }

        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
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
        if (req.query.department && req.query.department !== 'all') {
            query.department = req.query.department;
        }
        if (req.query.search) {
            query.$or = [
                { firstName: { $regex: req.query.search, $options: 'i' } },
                { lastName: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const teachers = await Teacher.find(query).sort({ lastName: 1, firstName: 1 });
        res.json({ success: true, count: teachers.length, data: teachers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/teachers/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ success: true, data: teacher });
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
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(400).json({ success: false, message: error.message });
    }
});

app.put('/api/teachers/:id', async (req, res) => {
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
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/teachers/:id', async (req, res) => {
    try {
        // Delete associated schedules first
        await Schedule.deleteMany({ teacher: req.params.id });

        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found' });
        }
        res.json({ 
            success: true, 
            message: 'Teacher and all associated schedules deleted successfully' 
        });
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
        if (req.query.teacher) query.teacher = req.query.teacher;
        if (req.query.classroom) query.classroom = req.query.classroom;

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

app.get('/api/schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('course', 'code name')
            .populate('teacher', 'firstName lastName')
            .populate('classroom', 'number type');

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found' });
        }
        res.json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/schedules', async (req, res) => {
    try {
        const schedule = new Schedule(req.body);
        await schedule.save();
        
        // Populate references for response
        await schedule.populate('course', 'code name');
        await schedule.populate('teacher', 'firstName lastName');
        await schedule.populate('classroom', 'number type');

        res.status(201).json({ success: true, data: schedule });
    } catch (error) {
        if (error.status === 409) {
            return res.status(409).json({ success: false, message: error.message });
        }
        res.status(400).json({ success: false, message: error.message });
    }
});

app.put('/api/schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
        .populate('course', 'code name')
        .populate('teacher', 'firstName lastName')
        .populate('classroom', 'number type');

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found' });
        }
        res.json({ success: true, data: schedule });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/schedules/:id', async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'Schedule not found' });
        }
        res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// API Routes - Reports
// ============================================
app.get('/api/reports/classroom-utilization', async (req, res) => {
    try {
        const classrooms = await Classroom.find();
        const utilization = await Promise.all(classrooms.map(async (room) => {
            const schedules = await Schedule.find({ classroom: room._id });
            const totalHours = schedules.reduce((acc, s) => {
                const start = parseInt(s.startTime.split(':')[0]);
                const end = parseInt(s.endTime.split(':')[0]);
                return acc + (end - start);
            }, 0);

            return {
                room: room.number,
                type: room.type,
                totalClasses: schedules.length,
                totalHours,
                utilizationRate: Math.round((totalHours / 40) * 100)
            };
        }));

        res.json({ success: true, data: utilization });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/reports/teacher-workload', async (req, res) => {
    try {
        const teachers = await Teacher.find({ isActive: true });
        const workload = await Promise.all(teachers.map(async (teacher) => {
            const schedules = await Schedule.find({ teacher: teacher._id });
            const totalHours = schedules.reduce((acc, s) => {
                const start = parseInt(s.startTime.split(':')[0]);
                const end = parseInt(s.endTime.split(':')[0]);
                return acc + (end - start);
            }, 0);

            return {
                teacher: `${teacher.firstName} ${teacher.lastName}`,
                department: teacher.department,
                totalClasses: schedules.length,
                totalHours,
                maxHours: teacher.maxHoursPerWeek
            };
        }));

        res.json({ success: true, data: workload });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// Serve Frontend
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ============================================
// Error Handling
// ============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('  Smart Classroom & Timetable Scheduler');
    console.log('  With MongoDB Database');
    console.log('  Server running on http://localhost:' + PORT);
    console.log('='.repeat(60));
    console.log('\nAvailable API Endpoints:');
    console.log('  GET  /api/dashboard/stats');
    console.log('  GET  /api/dashboard/weekly-overview');
    console.log('  GET  /api/classrooms');
    console.log('  GET  /api/courses');
    console.log('  GET  /api/teachers');
    console.log('  GET  /api/schedules');
    console.log('  GET  /api/reports/classroom-utilization');
    console.log('  GET  /api/reports/teacher-workload');
    console.log('='.repeat(60));
});

module.exports = app;
