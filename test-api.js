// Test API Endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpointAuth(method, path, body = null, token = null) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`\n${method} ${path}`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 200));
                } catch (e) {
                    console.log('Response:', data.substring(0, 200));
                }
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            console.error(`Error ${method} ${path}:`, e.message);
            resolve({ error: e.message });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testEndpoint(method, path, body = null) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`\n${method} ${path}`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 200));
                } catch (e) {
                    console.log('Response:', data.substring(0, 200));
                }
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            console.error(`Error ${method} ${path}:`, e.message);
            resolve({ error: e.message });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('=== Testing Smart Classroom API ===\n');

    // Test 1: Login
    console.log('1. Testing Login...');
    const loginRes = await testEndpoint('POST', '/api/auth/login', {
        email: 'admin@edusmart.edu',
        password: 'admin123'
    });

    if (loginRes.data && JSON.parse(loginRes.data).success) {
        const token = JSON.parse(loginRes.data).token;
        
        // Test 2: Dashboard Stats
        console.log('\n2. Testing Dashboard Stats...');
        await testEndpointAuth('GET', '/api/dashboard/stats', null, token);
        
        // Test 3: Get Teachers
        console.log('\n3. Testing Get Teachers...');
        await testEndpointAuth('GET', '/api/teachers', null, token);
        
        // Test 4: Get Courses
        console.log('\n4. Testing Get Courses...');
        await testEndpointAuth('GET', '/api/courses', null, token);
        
        // Test 5: Get Classrooms
        console.log('\n5. Testing Get Classrooms...');
        await testEndpointAuth('GET', '/api/classrooms', null, token);
        
        // Test 6: Get Timetable
        console.log('\n6. Testing Get Timetable...');
        await testEndpointAuth('GET', '/api/timetable', null, token);
        
        // Test 7: Dashboard Today
        console.log('\n7. Testing Dashboard Today...');
        await testEndpointAuth('GET', '/api/dashboard/today', null, token);
    } else {
        console.error('Login failed, skipping authenticated tests');
    }

    console.log('\n=== Tests Complete ===');
}

runTests().catch(console.error);
