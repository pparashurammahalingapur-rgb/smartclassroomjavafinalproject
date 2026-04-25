/**
 * Database Seeder
 * Populate MongoDB with sample data
 * 
 * Usage: node seed.js
 *        node seed.js --delete (to clear database first)
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('./config/database');
const { Classroom, Course, Teacher, Schedule } = require('./models');

// Sample Data
const classrooms = [
    { number: 'A-101', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'available' },
    { number: 'A-102', type: 'lecture', capacity: 120, building: 'Main Building', facilities: ['projector', 'ac', 'whiteboard', 'wifi'], status: 'occupied' },
    { number: 'B-201', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'available' },
    { number: 'B-202', type: 'lab', capacity: 40, building: 'Science Block', facilities: ['computers', 'ac', 'whiteboard', 'wifi'], status: 'occupied' },
    { number: 'C-301', type: 'seminar', capacity: 30, building: 'Arts Block', facilities: ['projector', 'whiteboard', 'wifi'], status: 'available' },
    { number: 'C-302', type: 'seminar', capacity: 25, building: 'Arts Block', facilities: ['projector', 'whiteboard'], status: 'maintenance' },
];

const courses = [
    { code: 'CS101', name: 'Introduction to Programming', department: 'cs', credits: 3, semester: 1, duration: 3, description: 'Basic programming concepts using Python' },
    { code: 'CS201', name: 'Data Structures', department: 'cs', credits: 4, semester: 2, duration: 4, description: 'Advanced data structures and algorithms' },
    { code: 'CS301', name: 'Database Systems', department: 'cs', credits: 3, semester: 3, duration: 3, description: 'Relational database design and SQL' },
    { code: 'MATH101', name: 'Calculus I', department: 'math', credits: 4, semester: 1, duration: 4, description: 'Differential and integral calculus' },
    { code: 'MATH201', name: 'Linear Algebra', department: 'math', credits: 3, semester: 2, duration: 3, description: 'Vector spaces and linear transformations' },
    { code: 'PHY101', name: 'Physics I', department: 'physics', credits: 4, semester: 1, duration: 4, description: 'Mechanics and thermodynamics' },
];

const teachers = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@university.edu', phone: '+1 (555) 123-4567', department: 'cs', designation: 'professor', specializations: ['AI', 'Machine Learning'] },
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@university.edu', phone: '+1 (555) 234-5678', department: 'cs', designation: 'associate', specializations: ['Software Engineering'] },
    { firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@university.edu', phone: '+1 (555) 345-6789', department: 'math', designation: 'professor', specializations: ['Pure Mathematics'] },
    { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@university.edu', phone: '+1 (555) 456-7890', department: 'physics', designation: 'assistant', specializations: ['Quantum Physics'] },
];

// Seed function
const seedDatabase = async () => {
    try {
        console.log('='.repeat(60));
        console.log('  Smart Classroom Database Seeder');
        console.log('='.repeat(60));

        // Connect to database
        await connectDB();

        // Check for --delete flag
        const shouldDelete = process.argv.includes('--delete');

        if (shouldDelete) {
            console.log('\nClearing existing data...');
            await Classroom.deleteMany({});
            await Course.deleteMany({});
            await Teacher.deleteMany({});
            await Schedule.deleteMany({});
            console.log('All existing data cleared.\n');
        }

        // Seed Classrooms
        console.log('Seeding Classrooms...');
        const createdClassrooms = await Classroom.insertMany(classrooms);
        console.log(`  Created ${createdClassrooms.length} classrooms`);

        // Seed Courses
        console.log('Seeding Courses...');
        const createdCourses = await Course.insertMany(courses);
        console.log(`  Created ${createdCourses.length} courses`);

        // Seed Teachers
        console.log('Seeding Teachers...');
        const createdTeachers = await Teacher.insertMany(teachers);
        console.log(`  Created ${createdTeachers.length} teachers`);

        // Create Schedules (using the created IDs)
        console.log('Seeding Schedules...');
        const schedules = [
            {
                course: createdCourses[0]._id,
                teacher: createdTeachers[0]._id,
                classroom: createdClassrooms[0]._id,
                day: 'monday',
                startTime: '09:00',
                endTime: '12:00',
                type: 'lecture',
                semester: 1
            },
            {
                course: createdCourses[1]._id,
                teacher: createdTeachers[1]._id,
                classroom: createdClassrooms[1]._id,
                day: 'monday',
                startTime: '14:00',
                endTime: '16:00',
                type: 'lecture',
                semester: 2
            },
            {
                course: createdCourses[2]._id,
                teacher: createdTeachers[0]._id,
                classroom: createdClassrooms[2]._id,
                day: 'tuesday',
                startTime: '10:00',
                endTime: '13:00',
                type: 'lab',
                semester: 3
            },
            {
                course: createdCourses[3]._id,
                teacher: createdTeachers[2]._id,
                classroom: createdClassrooms[0]._id,
                day: 'wednesday',
                startTime: '09:00',
                endTime: '13:00',
                type: 'lecture',
                semester: 1
            },
            {
                course: createdCourses[4]._id,
                teacher: createdTeachers[2]._id,
                classroom: createdClassrooms[3]._id,
                day: 'thursday',
                startTime: '11:00',
                endTime: '14:00',
                type: 'seminar',
                semester: 2
            },
            {
                course: createdCourses[5]._id,
                teacher: createdTeachers[3]._id,
                classroom: createdClassrooms[4]._id,
                day: 'friday',
                startTime: '09:00',
                endTime: '13:00',
                type: 'lecture',
                semester: 1
            },
        ];

        const createdSchedules = await Schedule.insertMany(schedules);
        console.log(`  Created ${createdSchedules.length} schedules`);

        console.log('\n' + '='.repeat(60));
        console.log('  Database seeded successfully!');
        console.log('='.repeat(60));
        console.log('\nSummary:');
        console.log(`  Classrooms: ${createdClassrooms.length}`);
        console.log(`  Courses: ${createdCourses.length}`);
        console.log(`  Teachers: ${createdTeachers.length}`);
        console.log(`  Schedules: ${createdSchedules.length}`);
        console.log('\nYou can now start the server with:');
        console.log('  npm start');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\nError seeding database:', error.message);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
};

// Run seeder
seedDatabase();
