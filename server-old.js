/**
 * Smart Classroom & Timetable Scheduler - Backend API
 * Node.js + Express Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============================================
// In-Memory Data Store
// ============================================
let dataStore = {
    classrooms: [
        { id: 1, number: 'A-101', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'available', createdAt: new Date().toISOString() },
        { id: 2, number: 'A-102', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'occupied', createdAt: new Date().toISOString() },
        { id: 3, number: 'B-201', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'available', createdAt: new Date().toISOString() },
        { id: 4, number: 'B-202', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'occupied', createdAt: new Date().toISOString() },
        { id: 5, number: 'C-301', type: 'seminar', capacity: 30, building: 'Arts Block', facilities: ['projector', 'whiteboard', 'wifi'], status: 'available', createdAt: new Date().toISOString() },
        { id: 6, number: 'C-302', type: 'seminar', capacity: 25, building: 'Arts Block', facilities: ['projector', 'whiteboard'], status: 'maintenance', createdAt: new Date().toISOString() },
    ],
    courses: [
        { id: 1, code: 'CS101', name: 'Introduction to Programming', department: 'cs', credits: 3, semester: 1, duration: 3, description: 'Basic programming concepts using Python', createdAt: new Date().toISOString() },
        { id: 2, code: 'CS201', name: 'Data Structures', department: 'cs', credits: 4, semester: 2, duration: 4, description: 'Advanced data structures and algorithms', createdAt: new Date().toISOString() },
        { id: 3, code: 'CS301', name: 'Database Systems', department: 'cs', credits: 3, semester: 3, duration: 3, description: 'Relational database design and SQL', createdAt: new Date().toISOString() },
        { id: 4, code: 'MATH101', name: 'Calculus I', department: 'math', credits: 4, semester: 1, duration: 4, description: 'Differential and integral calculus', createdAt: new Date().toISOString() },
        { id: 5, code: 'MATH201', name: 'Linear Algebra', department: 'math', credits: 3, semester: 2, duration: 3, description: 'Vector spaces and linear transformations', createdAt: new Date().toISOString() },
        { id: 6, code: 'PHY101', name: 'Physics I', department: 'physics', credits: 4, semester: 1, duration: 4, description: 'Mechanics and thermodynamics', createdAt: new Date().toISOString() },
    ],
    teachers: [
        { id: 1, firstName: 'John', lastName: 'Smith', email: 'john.smith@university.edu', phone: '+1 (555) 123-4567', department: 'cs', designation: 'professor', specializations: 'AI, Machine Learning', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', createdAt: new Date().toISOString() },
        { id: 2, firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@university.edu', phone: '+1 (555) 234-5678', department: 'cs', designation: 'associate', specializations: 'Software Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', createdAt: new Date().toISOString() },
        { id: 3, firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@university.edu', phone: '+1 (555) 345-6789', department: 'math', designation: 'professor', specializations: 'Pure Mathematics', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', createdAt: new Date().toISOString() },
        { id: 4, firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@university.edu', phone: '+1 (555) 456-7890', department: 'physics', designation: 'assistant', specializations: 'Quantum Physics', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily', createdAt: new Date().toISOString() },
    ],
    schedules: [
        { id: 1, courseId: 1, teacherId: 1, classroomId: 1, day: 'monday', startTime: '09:00', endTime: '12:00', type: 'lecture', createdAt: new Date().toISOString() },
        { id: 2, courseId: 2, teacherId: 2, classroomId: 2, day: 'monday', startTime: '14:00', endTime: '16:00', type: 'lecture', createdAt: new Date().toISOString() },
        { id: 3, courseId: 3, teacherId: 1, classroomId: 3, day: 'tuesday', startTime: '10:00', endTime: '13:00', type: 'lab', createdAt: new Date().toISOString() },
        { id: 4, courseId: 4, teacherId: 3, classroomId: 1, day: 'wednesday', startTime: '09:00', endTime: '13:00', type: 'lecture', createdAt: new Date().toISOString() },
        { id: 5, courseId: 5, teacherId: 3, classroomId: 4, day: 'thursday', startTime: '11:00', endTime: '14:00', type: 'seminar', createdAt: new Date().toISOString() },
        { id: 6, courseId: 6, teacherId: 4, classroomId: 5, day: 'friday', startTime: '09:00', endTime: '13:00', type: 'lecture', createdAt: new Date().toISOString() },
    ]
};

// ID counter for new records
let nextId = 100;

// ============================================
// Helper Functions
// ============================================
const generateId = () => nextId++;

const findById = (collection, id) => dataStore[collection].find(item => item.id === parseInt(id));

const filterByQuery = (collection, query) => {
    let results = [...dataStore[collection]];
    
    Object.keys(query).forEach(key => {
        if (key !== 'page' && key !== 'limit' && key !== 'sort') {
            results = results.filter(item => {
                const itemValue = String(item[key]).toLowerCase();
                const queryValue = String(query[key]).toLowerCase();
                return itemValue.includes(queryValue);
            });
        }
    });
    
    return results;
};

// ============================================
// API Routes - Dashboard
// ============================================
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {
        totalClassrooms: dataStore.classrooms.length,
        totalCourses: dataStore.courses.length,
        totalTeachers: dataStore.teachers.length,
        totalStudents: 1256, // Simulated
        availableRooms: dataStore.classrooms.filter(r => r.status === 'available').length,
        occupiedRooms: dataStore.classrooms.filter(r => r.status === 'occupied').length,
        maintenanceRooms: dataStore.classrooms.filter(r => r.status === 'maintenance').length,
        todayClasses: dataStore.schedules.length
    };
    res.json({ success: true, data: stats });
});

app.get('/api/dashboard/weekly-overview', (req, res) => {
    const overview = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        lectures: [0, 0, 0, 0, 0],
        labs: [0, 0, 0, 0, 0],
        seminars: [0, 0, 0, 0, 0]
    };

    const dayMap = { 'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4 };

    dataStore.schedules.forEach(schedule => {
        const dayIndex = dayMap[schedule.day];
        if (dayIndex !== undefined) {
            overview[schedule.type + 's'][dayIndex]++;
        }
    });

    res.json({ success: true, data: overview });
});

// ============================================
// API Routes - Classrooms
// ============================================
app.get('/api/classrooms', (req, res) => {
    const classrooms = filterByQuery('classrooms', req.query);
    res.json({ success: true, count: classrooms.length, data: classrooms });
});

app.get('/api/classrooms/:id', (req, res) => {
    const classroom = findById('classrooms', req.params.id);
    if (!classroom) {
        return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    res.json({ success: true, data: classroom });
});

app.post('/api/classrooms', (req, res) => {
    const { number, type, capacity, building, facilities, status } = req.body;
    
    if (!number || !type || !capacity || !building) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newClassroom = {
        id: generateId(),
        number,
        type,
        capacity: parseInt(capacity),
        building,
        facilities: facilities || [],
        status: status || 'available',
        createdAt: new Date().toISOString()
    };

    dataStore.classrooms.push(newClassroom);
    res.status(201).json({ success: true, data: newClassroom });
});

app.put('/api/classrooms/:id', (req, res) => {
    const index = dataStore.classrooms.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    dataStore.classrooms[index] = { ...dataStore.classrooms[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, data: dataStore.classrooms[index] });
});

app.delete('/api/classrooms/:id', (req, res) => {
    const index = dataStore.classrooms.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    dataStore.classrooms.splice(index, 1);
    res.json({ success: true, message: 'Classroom deleted successfully' });
});

// ============================================
// API Routes - Courses
// ============================================
app.get('/api/courses', (req, res) => {
    const courses = filterByQuery('courses', req.query);
    res.json({ success: true, count: courses.length, data: courses });
});

app.get('/api/courses/:id', (req, res) => {
    const course = findById('courses', req.params.id);
    if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
});

app.post('/api/courses', (req, res) => {
    const { code, name, department, credits, semester, duration, description } = req.body;
    
    if (!code || !name || !department || !credits) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newCourse = {
        id: generateId(),
        code,
        name,
        department,
        credits: parseInt(credits),
        semester: parseInt(semester) || 1,
        duration: parseInt(duration) || 3,
        description: description || '',
        createdAt: new Date().toISOString()
    };

    dataStore.courses.push(newCourse);
    res.status(201).json({ success: true, data: newCourse });
});

app.put('/api/courses/:id', (req, res) => {
    const index = dataStore.courses.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Course not found' });
    }

    dataStore.courses[index] = { ...dataStore.courses[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, data: dataStore.courses[index] });
});

app.delete('/api/courses/:id', (req, res) => {
    const index = dataStore.courses.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Course not found' });
    }

    dataStore.courses.splice(index, 1);
    res.json({ success: true, message: 'Course deleted successfully' });
});

// ============================================
// API Routes - Teachers
// ============================================
app.get('/api/teachers', (req, res) => {
    const teachers = filterByQuery('teachers', req.query);
    res.json({ success: true, count: teachers.length, data: teachers });
});

app.get('/api/teachers/:id', (req, res) => {
    const teacher = findById('teachers', req.params.id);
    if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, data: teacher });
});

app.post('/api/teachers', (req, res) => {
    const { firstName, lastName, email, phone, department, designation, specializations } = req.body;
    
    if (!firstName || !lastName || !email || !department) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newTeacher = {
        id: generateId(),
        firstName,
        lastName,
        email,
        phone: phone || '',
        department,
        designation: designation || 'lecturer',
        specializations: specializations || '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName.toLowerCase()}`,
        createdAt: new Date().toISOString()
    };

    dataStore.teachers.push(newTeacher);
    res.status(201).json({ success: true, data: newTeacher });
});

app.put('/api/teachers/:id', (req, res) => {
    const index = dataStore.teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    dataStore.teachers[index] = { ...dataStore.teachers[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, data: dataStore.teachers[index] });
});

app.delete('/api/teachers/:id', (req, res) => {
    const index = dataStore.teachers.findIndex(t => t.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    dataStore.teachers.splice(index, 1);
    res.json({ success: true, message: 'Teacher deleted successfully' });
});

// ============================================
// API Routes - Schedules
// ============================================
app.get('/api/schedules', (req, res) => {
    let schedules = filterByQuery('schedules', req.query);
    
    // Populate related data
    schedules = schedules.map(schedule => ({
        ...schedule,
        course: dataStore.courses.find(c => c.id === schedule.courseId),
        teacher: dataStore.teachers.find(t => t.id === schedule.teacherId),
        classroom: dataStore.classrooms.find(r => r.id === schedule.classroomId)
    }));

    res.json({ success: true, count: schedules.length, data: schedules });
});

app.get('/api/schedules/:id', (req, res) => {
    const schedule = findById('schedules', req.params.id);
    if (!schedule) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const populatedSchedule = {
        ...schedule,
        course: dataStore.courses.find(c => c.id === schedule.courseId),
        teacher: dataStore.teachers.find(t => t.id === schedule.teacherId),
        classroom: dataStore.classrooms.find(r => r.id === schedule.classroomId)
    };

    res.json({ success: true, data: populatedSchedule });
});

app.post('/api/schedules', (req, res) => {
    const { courseId, teacherId, classroomId, day, startTime, endTime, type } = req.body;
    
    if (!courseId || !teacherId || !classroomId || !day || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check for conflicts
    const conflicts = dataStore.schedules.filter(s => 
        s.day === day && 
        s.classroomId === parseInt(classroomId) &&
        ((startTime >= s.startTime && startTime < s.endTime) ||
         (endTime > s.startTime && endTime <= s.endTime))
    );

    if (conflicts.length > 0) {
        return res.status(409).json({ success: false, message: 'Schedule conflict detected' });
    }

    const newSchedule = {
        id: generateId(),
        courseId: parseInt(courseId),
        teacherId: parseInt(teacherId),
        classroomId: parseInt(classroomId),
        day,
        startTime,
        endTime,
        type: type || 'lecture',
        createdAt: new Date().toISOString()
    };

    dataStore.schedules.push(newSchedule);
    
    // Update classroom status
    const classroom = dataStore.classrooms.find(r => r.id === parseInt(classroomId));
    if (classroom) {
        classroom.status = 'occupied';
    }

    res.status(201).json({ success: true, data: newSchedule });
});

app.put('/api/schedules/:id', (req, res) => {
    const index = dataStore.schedules.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    dataStore.schedules[index] = { ...dataStore.schedules[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json({ success: true, data: dataStore.schedules[index] });
});

app.delete('/api/schedules/:id', (req, res) => {
    const index = dataStore.schedules.findIndex(s => s.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    dataStore.schedules.splice(index, 1);
    res.json({ success: true, message: 'Schedule deleted successfully' });
});

// ============================================
// API Routes - Reports
// ============================================
app.get('/api/reports/classroom-utilization', (req, res) => {
    const utilization = dataStore.classrooms.map(room => {
        const roomSchedules = dataStore.schedules.filter(s => s.classroomId === room.id);
        const totalHours = roomSchedules.reduce((acc, s) => {
            const start = parseInt(s.startTime.split(':')[0]);
            const end = parseInt(s.endTime.split(':')[0]);
            return acc + (end - start);
        }, 0);

        return {
            room: room.number,
            type: room.type,
            totalClasses: roomSchedules.length,
            totalHours,
            utilizationRate: Math.round((totalHours / 40) * 100) // Assuming 40 hours/week max
        };
    });

    res.json({ success: true, data: utilization });
});

app.get('/api/reports/teacher-workload', (req, res) => {
    const workload = dataStore.teachers.map(teacher => {
        const teacherSchedules = dataStore.schedules.filter(s => s.teacherId === teacher.id);
        const totalHours = teacherSchedules.reduce((acc, s) => {
            const start = parseInt(s.startTime.split(':')[0]);
            const end = parseInt(s.endTime.split(':')[0]);
            return acc + (end - start);
        }, 0);

        return {
            teacher: `${teacher.firstName} ${teacher.lastName}`,
            department: teacher.department,
            totalClasses: teacherSchedules.length,
            totalHours
        };
    });

    res.json({ success: true, data: workload });
});

// ============================================
// Serve Frontend
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
