// Error Diagnostic Test - Find the exact application error
const http = require('http');

console.log('🔍 APPLICATION ERROR DIAGNOSTIC\n');
console.log('='.repeat(60));

// Get the actual HTML being served
function getHomePage() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    content: data
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Check app.js for runtime errors
function checkAppJs() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/app.js',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let jsContent = '';
            res.on('data', chunk => jsContent += chunk);
            res.on('end', () => {
                const errors = [];
                
                // Check for common issues
                const lines = jsContent.split('\n');
                
                lines.forEach((line, idx) => {
                    const lineNum = idx + 1;
                    
                    // Check for syntax issues
                    if (line.includes('return undefined') && !line.includes('//')) {
                        errors.push(`Line ${lineNum}: Returns undefined without fallback`);
                    }
                    
                    if (line.includes('throw new Error')) {
                        errors.push(`Line ${lineNum}: Throws error: ${line.trim()}`);
                    }
                    
                    // Check for missing semicolons that might cause issues
                    if (line.trim().match(/^[a-z]+\s*=/) && !line.trim().endsWith(';') && !line.trim().endsWith('{')) {
                        // This is fine in modern JS
                    }
                });
                
                // Check initialization
                if (!jsContent.includes('DOMContentLoaded')) {
                    errors.push('Missing DOMContentLoaded event listener');
                }
                
                if (!jsContent.includes('router.init()')) {
                    errors.push('Missing router.init() call');
                }
                
                // Check createElement function exists
                if (!jsContent.includes('function createElement(')) {
                    errors.push('createElement function not found');
                }
                
                resolve(errors);
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function diagnoseError() {
    console.log('\n📌 CHECK 1: Server Response');
    try {
        const homePage = await getHomePage();
        console.log(`✅ Server Status: ${homePage.status === 200 ? 'OK' : 'ERROR'}`);
        console.log(`   Content-Type: ${homePage.headers['content-type'] || 'Unknown'}`);
        console.log(`   Content Length: ${homePage.content.length} bytes`);
        
        // Check if HTML has root element
        if (homePage.content.includes('<div id="root">')) {
            console.log(`✅ Root Element: PRESENT`);
        } else {
            console.log(`❌ Root Element: MISSING`);
        }
        
        // Check if app.js is loaded
        if (homePage.content.includes('src="/app.js"')) {
            console.log(`✅ App.js Script: LOADED`);
        } else {
            console.log(`❌ App.js Script: NOT LOADED`);
        }
        
    } catch (error) {
        console.log(`❌ Server Check Failed: ${error.message}`);
    }

    console.log('\n📌 CHECK 2: JavaScript Validation');
    try {
        const jsErrors = await checkAppJs();
        
        if (jsErrors.length === 0) {
            console.log(`✅ No obvious JavaScript errors detected`);
        } else {
            console.log(`⚠️  POTENTIAL ISSUES FOUND:\n`);
            jsErrors.forEach((error, idx) => {
                console.log(`   ${idx + 1}. ${error}`);
            });
        }
    } catch (error) {
        console.log(`❌ JS Validation Failed: ${error.message}`);
    }

    console.log('\n📌 CHECK 3: Common Error Sources');
    
    // Check if files exist and are accessible
    const filesToCheck = [
        '/',
        '/login',
        '/app.js'
    ];
    
    for (const file of filesToCheck) {
        try {
            const res = await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:3000${file}`, resolve);
                req.on('error', reject);
            });
            console.log(`✅ ${file}: ${res.statusCode === 200 ? 'ACCESSIBLE' : 'ERROR ' + res.statusCode}`);
        } catch (error) {
            console.log(`❌ ${file}: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n💡 LIKELY CAUSES OF "APPLICATION ERROR":');
    console.log('1. Browser cache showing old code');
    console.log('2. JavaScript runtime error in component');
    console.log('3. API call failing during render');
    console.log('4. Missing dependency or import');
    console.log('5. TypeError accessing undefined property');
    
    console.log('\n🔧 IMMEDIATE FIXES TO TRY:');
    console.log('1. Hard refresh browser: Ctrl+F5');
    console.log('2. Clear browser cache completely');
    console.log('3. Open DevTools Console (F12) and read EXACT error');
    console.log('4. Copy the error message from console');
    
    console.log('\n📋 CRITICAL: WHAT IS THE EXACT ERROR MESSAGE?');
    console.log('Please check browser console (F12) and look for:');
    console.log('   - Red error messages');
    console.log('   - "Uncaught TypeError"');
    console.log('   - "Cannot read property"');
    console.log('   - "is not a function"');
    console.log('   - "ReferenceError"');
    console.log('   - Line number where error occurs');
    
    console.log('\n');
}

diagnoseError().catch(console.error);
