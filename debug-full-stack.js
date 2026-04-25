// COMPREHENSIVE FULL-STACK DEBUG TEST
const http = require('http');

console.log('🔍 STARTING COMPREHENSIVE DEBUG TEST\n');
console.log('='.repeat(70));

let token = null;
let testResults = { passed: 0, failed: 0, warnings: 0 };

// Helper function to make HTTP requests
function request(method, path, body = null, useToken = false) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (useToken && token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testBackend() {
    console.log('\n📌 BACKEND API TESTS\n');
    
    // Test 1: Server Health
    try {
        const res = await request('GET', '/api/health');
        if (res.status === 200) {
            console.log('✅ Backend Server: RUNNING');
            testResults.passed++;
        } else {
            console.log('❌ Backend Server: ERROR - Status', res.status);
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ Backend Server: NOT RESPONDING -', error.message);
        testResults.failed++;
        return; // Stop if backend is down
    }

    // Test 2: Authentication - Login
    console.log('\n--- Authentication Tests ---');
    try {
        const loginRes = await request('POST', '/api/auth/login', {
            email: 'admin@edusmart.edu',
            password: 'admin123'
        });
        
        if (loginRes.status === 200 && loginRes.data.success) {
            console.log('✅ POST /api/auth/login: WORKING');
            token = loginRes.data.token;
            testResults.passed++;
            
            // Verify token format
            if (!token || token.split('.').length !== 3) {
                console.log('⚠️  WARNING: Invalid JWT token format');
                testResults.warnings++;
            }
        } else {
            console.log('❌ POST /api/auth/login: FAILED -', loginRes.data.message);
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ POST /api/auth/login: ERROR -', error.message);
        testResults.failed++;
    }

    // Test 3: Teachers CRUD
    console.log('\n--- Teachers Module Tests ---');
    
    // GET Teachers
    try {
        const res = await request('GET', '/api/teachers', null, true);
        if (res.status === 200 && res.data.success) {
            console.log(`✅ GET /api/teachers: SUCCESS (${res.data.data.length} teachers)`);
            testResults.passed++;
        } else {
            console.log('❌ GET /api/teachers: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ GET /api/teachers: ERROR -', error.message);
        testResults.failed++;
    }

    // CREATE Teacher
    try {
        const res = await request('POST', '/api/teachers', {
            firstName: 'Debug',
            lastName: 'Test',
            email: 'debug@test.com',
            department: 'Computer Science'
        }, true);
        
        if (res.status === 201 && res.data.success) {
            console.log('✅ POST /api/teachers: SUCCESS');
            testResults.passed++;
            
            // Store ID for update/delete tests
            const teacherId = res.data.data._id || res.data.data.id;
            
            // UPDATE Teacher
            try {
                const updateRes = await request('PUT', `/api/teachers/${teacherId}`, {
                    firstName: 'Updated',
                    department: 'IT'
                }, true);
                
                if (updateRes.status === 200 && updateRes.data.success) {
                    console.log('✅ PUT /api/teachers/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ PUT /api/teachers/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ PUT /api/teachers/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
            // DELETE Teacher
            try {
                const deleteRes = await request('DELETE', `/api/teachers/${teacherId}`, null, true);
                if (deleteRes.status === 200 && deleteRes.data.success) {
                    console.log('✅ DELETE /api/teachers/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ DELETE /api/teachers/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ DELETE /api/teachers/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
        } else {
            console.log('❌ POST /api/teachers: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ POST /api/teachers: ERROR -', error.message);
        testResults.failed++;
    }

    // Test 4: Courses CRUD
    console.log('\n--- Courses Module Tests ---');
    
    // GET Courses
    try {
        const res = await request('GET', '/api/courses', null, true);
        if (res.status === 200 && res.data.success) {
            console.log(`✅ GET /api/courses: SUCCESS (${res.data.data.length} courses)`);
            testResults.passed++;
        } else {
            console.log('❌ GET /api/courses: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ GET /api/courses: ERROR -', error.message);
        testResults.failed++;
    }

    // CREATE Course
    try {
        const res = await request('POST', '/api/courses', {
            code: 'DEBUG101',
            name: 'Debug Test Course',
            credits: 3,
            department: 'Computer Science'
        }, true);
        
        if (res.status === 201 && res.data.success) {
            console.log('✅ POST /api/courses: SUCCESS');
            testResults.passed++;
            
            const courseId = res.data.data._id || res.data.data.id;
            
            // UPDATE Course
            try {
                const updateRes = await request('PUT', `/api/courses/${courseId}`, {
                    name: 'Updated Course'
                }, true);
                
                if (updateRes.status === 200 && updateRes.data.success) {
                    console.log('✅ PUT /api/courses/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ PUT /api/courses/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ PUT /api/courses/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
            // DELETE Course
            try {
                const deleteRes = await request('DELETE', `/api/courses/${courseId}`, null, true);
                if (deleteRes.status === 200 && deleteRes.data.success) {
                    console.log('✅ DELETE /api/courses/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ DELETE /api/courses/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ DELETE /api/courses/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
        } else {
            console.log('❌ POST /api/courses: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ POST /api/courses: ERROR -', error.message);
        testResults.failed++;
    }

    // Test 5: Classrooms CRUD
    console.log('\n--- Classrooms Module Tests ---');
    
    // GET Classrooms
    try {
        const res = await request('GET', '/api/classrooms', null, true);
        if (res.status === 200 && res.data.success) {
            console.log(`✅ GET /api/classrooms: SUCCESS (${res.data.data.length} classrooms)`);
            testResults.passed++;
        } else {
            console.log('❌ GET /api/classrooms: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ GET /api/classrooms: ERROR -', error.message);
        testResults.failed++;
    }

    // CREATE Classroom
    try {
        const res = await request('POST', '/api/classrooms', {
            name: 'Debug Hall',
            capacity: 50,
            type: 'lecture',  // Fixed: lowercase to match enum
            building: 'Main Building',
            floor: 1
        }, true);
        
        if (res.status === 201 && res.data.success) {
            console.log('✅ POST /api/classrooms: SUCCESS');
            testResults.passed++;
            
            const classroomId = res.data.data._id || res.data.data.id;
            
            // UPDATE Classroom
            try {
                const updateRes = await request('PUT', `/api/classrooms/${classroomId}`, {
                    capacity: 60
                }, true);
                
                if (updateRes.status === 200 && updateRes.data.success) {
                    console.log('✅ PUT /api/classrooms/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ PUT /api/classrooms/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ PUT /api/classrooms/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
            // DELETE Classroom
            try {
                const deleteRes = await request('DELETE', `/api/classrooms/${classroomId}`, null, true);
                if (deleteRes.status === 200 && deleteRes.data.success) {
                    console.log('✅ DELETE /api/classrooms/:id: SUCCESS');
                    testResults.passed++;
                } else {
                    console.log('❌ DELETE /api/classrooms/:id: FAILED');
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ DELETE /api/classrooms/:id: ERROR -', error.message);
                testResults.failed++;
            }
            
        } else {
            console.log('❌ POST /api/classrooms: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ POST /api/classrooms: ERROR -', error.message);
        testResults.failed++;
    }

    // Test 6: Timetable CRUD
    console.log('\n--- Timetable Module Tests ---');
    
    // GET Timetable
    try {
        const res = await request('GET', '/api/timetable', null, true);
        if (res.status === 200 && res.data.success) {
            console.log(`✅ GET /api/timetable: SUCCESS (${res.data.data.length} entries)`);
            testResults.passed++;
        } else {
            console.log('❌ GET /api/timetable: FAILED');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ GET /api/timetable: ERROR -', error.message);
        testResults.failed++;
    }

    // Need teacher and course IDs for timetable creation
    let teacherId, courseId, classroomId;
    
    try {
        const teachers = await request('GET', '/api/teachers', null, true);
        if (teachers.data.success && teachers.data.data.length > 0) {
            teacherId = teachers.data.data[0]._id || teachers.data.data[0].id;
        }
        
        const courses = await request('GET', '/api/courses', null, true);
        if (courses.data.success && courses.data.data.length > 0) {
            courseId = courses.data.data[0]._id || courses.data.data[0].id;
        }
        
        const classrooms = await request('GET', '/api/classrooms', null, true);
        if (classrooms.data.success && classrooms.data.data.length > 0) {
            classroomId = classrooms.data.data[0]._id || classrooms.data.data[0].id;
        }
        
        if (teacherId && courseId && classroomId) {
            // CREATE Timetable Entry
            try {
                const res = await request('POST', '/api/timetable', {
                    teacherId,
                    courseId,
                    classroomId,
                    day: 'monday',  // Fixed: lowercase
                    startTime: '09:00',
                    endTime: '10:00',
                    type: 'lecture',  // Fixed: lowercase
                    semester: 'Fall 2024'
                }, true);
                
                if (res.status === 201 && res.data.success) {
                    console.log('✅ POST /api/timetable: SUCCESS');
                    testResults.passed++;
                    
                    const timetableId = res.data.data._id || res.data.data.id;
                    
                    // UPDATE Timetable
                    try {
                        const updateRes = await request('PUT', `/api/timetable/${timetableId}`, {
                            startTime: '10:00',
                            endTime: '11:00'
                        }, true);
                        
                        if (updateRes.status === 200 && updateRes.data.success) {
                            console.log('✅ PUT /api/timetable/:id: SUCCESS');
                            testResults.passed++;
                        } else {
                            console.log('❌ PUT /api/timetable/:id: FAILED');
                            testResults.failed++;
                        }
                    } catch (error) {
                        console.log('❌ PUT /api/timetable/:id: ERROR -', error.message);
                        testResults.failed++;
                    }
                    
                    // DELETE Timetable
                    try {
                        const deleteRes = await request('DELETE', `/api/timetable/${timetableId}`, null, true);
                        if (deleteRes.status === 200 && deleteRes.data.success) {
                            console.log('✅ DELETE /api/timetable/:id: SUCCESS');
                            testResults.passed++;
                        } else {
                            console.log('❌ DELETE /api/timetable/:id: FAILED');
                            testResults.failed++;
                        }
                    } catch (error) {
                        console.log('❌ DELETE /api/timetable/:id: ERROR -', error.message);
                        testResults.failed++;
                    }
                    
                } else {
                    console.log('❌ POST /api/timetable: FAILED -', res.data.message);
                    testResults.failed++;
                }
            } catch (error) {
                console.log('❌ POST /api/timetable: ERROR -', error.message);
                testResults.failed++;
            }
        } else {
            console.log('⚠️  SKIP /api/timetable: Missing required data (teacher/course/classroom)');
            testResults.warnings++;
        }
    } catch (error) {
        console.log('❌ Timetable setup ERROR -', error.message);
        testResults.failed++;
    }
}

async function testFrontend() {
    console.log('\n\n📌 FRONTEND TESTS\n');
    
    const pages = [
        { name: 'Login Page', path: '/login' },
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Teachers', path: '/teachers' },
        { name: 'Courses', path: '/courses' },
        { name: 'Classrooms', path: '/classrooms' },
        { name: 'Timetable', path: '/timetable' }
    ];
    
    for (const page of pages) {
        try {
            const res = await request('GET', page.path);
            if (res.status === 200) {
                // Check if HTML contains root element
                if (res.data.includes('<div id="root">') || res.data.includes('login-fixed.html')) {
                    console.log(`✅ ${page.name} (${page.path}): ACCESSIBLE`);
                    testResults.passed++;
                } else {
                    console.log(`⚠️  ${page.name} (${page.path}): LOADED but missing root element`);
                    testResults.warnings++;
                }
            } else {
                console.log(`❌ ${page.name} (${page.path}): ERROR ${res.status}`);
                testResults.failed++;
            }
        } catch (error) {
            console.log(`❌ ${page.name} (${page.path}): NOT ACCESSIBLE - ${error.message}`);
            testResults.failed++;
        }
    }
    
    // Check JavaScript file
    try {
        const res = await request('GET', '/app.js');
        if (res.status === 200) {
            console.log('✅ app.js: LOADED');
            testResults.passed++;
            
            // Check for syntax errors
            const jsContent = typeof res.data === 'string' ? res.data : '';
            if (jsContent.includes('function createElement(') && 
                jsContent.includes('router.init()')) {
                console.log('✅ app.js: VALID STRUCTURE');
                testResults.passed++;
            } else {
                console.log('⚠️  app.js: MISSING CORE FUNCTIONS');
                testResults.warnings++;
            }
        } else {
            console.log('❌ app.js: FAILED TO LOAD');
            testResults.failed++;
        }
    } catch (error) {
        console.log('❌ app.js: ERROR -', error.message);
        testResults.failed++;
    }
    
    // Check CSS file
    try {
        const res = await request('GET', '/styles.css');
        if (res.status === 200) {
            console.log('✅ styles.css: LOADED');
            testResults.passed++;
        } else {
            console.log('⚠️  styles.css: NOT FOUND');
            testResults.warnings++;
        }
    } catch (error) {
        console.log('⚠️  styles.css: ERROR -', error.message);
        testResults.warnings++;
    }
}

async function runFullDebug() {
    await testBackend();
    await testFrontend();
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL DEBUG RESULTS');
    console.log('='.repeat(70));
    
    const total = testResults.passed + testResults.failed + testResults.warnings;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);
    
    console.log(`\n✅ PASSED: ${testResults.passed}`);
    console.log(`❌ FAILED: ${testResults.failed}`);
    console.log(`⚠️  WARNINGS: ${testResults.warnings}`);
    console.log(`📈 PASS RATE: ${passRate}%`);
    
    if (testResults.failed === 0 && testResults.warnings === 0) {
        console.log('\n🎉 PERFECT! NO ERRORS FOUND!\n');
    } else if (testResults.failed === 0) {
        console.log('\n✅ ALL CRITICAL TESTS PASSED! (Minor warnings only)\n');
    } else {
        console.log('\n❌ ERRORS DETECTED - SEE ABOVE FOR DETAILS\n');
    }
    
    console.log('='.repeat(70));
}

runFullDebug().catch(console.error);
