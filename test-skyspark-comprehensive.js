#!/usr/bin/env node

/**
 * Comprehensive SkySpark Connection Helper
 * Tests existing token, tries different ports, and generates new tokens if needed
 */

console.log('🚀 SkySpark Connection Assistant\n');

// Configuration from your .env files
const CONFIG = {
  existingToken: 'web-WSOaLAC5GNIX7BxMAbRr1NemKBU-GztkxkZFpBNd3hw-1',
  username: 'patrick',
  password: 'obvious',
  ports: [8080, 8081, 8082, 8083]
};

/**
 * Test existing token on different ports
 */
async function testExistingToken() {
  console.log('🔍 Testing your existing token on different ports...\n');
  
  for (const port of CONFIG.ports) {
    const serverUrl = `http://localhost:${port}`;
    console.log(`📡 Testing ${serverUrl}...`);
    
    try {
      // Test basic server connectivity first
      const basicResponse = await fetch(serverUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      console.log(`   ✅ Server accessible (${basicResponse.status})`);
      
      // Test API endpoint with your token
      const apiTests = [
        '/api/about',
        '/api/demo/read?filter=point',
        '/api/read?filter=point'
      ];
      
      for (const endpoint of apiTests) {
        try {
          const apiResponse = await fetch(`${serverUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${CONFIG.existingToken}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (apiResponse.ok) {
            const data = await apiResponse.json();
            console.log(`   🎯 SUCCESS with ${endpoint}!`);
            console.log(`   📊 Data: ${JSON.stringify(data).substring(0, 100)}...`);
            console.log('');
            console.log('✨ WORKING CONFIGURATION FOUND:');
            console.log(`   SKYSPARK_API_URL=${serverUrl}/api`);
            console.log(`   SKYSPARK_API_TOKEN=${CONFIG.existingToken}`);
            return { serverUrl, endpoint, token: CONFIG.existingToken };
          } else {
            console.log(`   ⚠️  ${endpoint}: ${apiResponse.status} ${apiResponse.statusText}`);
          }
        } catch (e) {
          console.log(`   ❌ ${endpoint}: ${e.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Server not accessible: ${error.message}`);
    }
    console.log('');
  }
  
  return null;
}

/**
 * Alternative authentication test using basic auth
 */
async function testBasicAuth() {
  console.log('🔐 Testing with username/password authentication...\n');
  
  for (const port of CONFIG.ports) {
    const serverUrl = `http://localhost:${port}`;
    console.log(`📡 Testing basic auth on ${serverUrl}...`);
    
    try {
      const auth = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64');
      
      const response = await fetch(`${serverUrl}/api/about`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        console.log(`   ✅ Basic auth successful on port ${port}!`);
        const data = await response.json();
        console.log(`   📊 Data: ${JSON.stringify(data).substring(0, 100)}...`);
        return { serverUrl, auth: 'basic' };
      } else {
        console.log(`   ⚠️  Basic auth failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Basic auth test failed: ${error.message}`);
    }
  }
  
  return null;
}

/**
 * Test different API patterns
 */
async function testAPIPatterns(serverUrl, token) {
  console.log('🧪 Testing different API patterns...\n');
  
  const patterns = [
    // Standard patterns
    { path: '/api/about', description: 'Server info' },
    { path: '/api/demo/read?filter=point', description: 'Demo project points' },
    { path: '/api/read?filter=point', description: 'Default project points' },
    
    // Project-specific patterns  
    { path: '/api/sys/about', description: 'System project info' },
    { path: '/api/demo/eval', method: 'POST', body: 'ver:"3.0"\nexpr\n"about()"\n', description: 'Demo project eval' },
    
    // Alternative formats
    { path: '/api/demo/read', method: 'POST', body: 'ver:"3.0"\nfilter\n"point"\n', description: 'Demo points (POST)' }
  ];
  
  for (const pattern of patterns) {
    console.log(`📍 Testing: ${pattern.description} (${pattern.path})`);
    
    try {
      const options = {
        method: pattern.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      };
      
      if (pattern.body) {
        options.headers['Content-Type'] = 'text/zinc; charset=utf-8';
        options.body = pattern.body;
      }
      
      const response = await fetch(`${serverUrl}${pattern.path}`, options);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let data = '';
        
        if (contentType?.includes('application/json')) {
          data = JSON.stringify(await response.json()).substring(0, 150);
        } else {
          data = (await response.text()).substring(0, 150);
        }
        
        console.log(`   ✅ SUCCESS: ${data}...`);
        console.log(`   🎯 Working endpoint: ${serverUrl}${pattern.path}`);
        
        return { serverUrl, path: pattern.path, token };
      } else {
        console.log(`   ❌ ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
    }
  }
  
  return null;
}

/**
 * Generate setup instructions
 */
function generateSetupInstructions(workingConfig) {
  console.log('\n📋 SETUP INSTRUCTIONS:');
  console.log('━'.repeat(50));
  
  if (workingConfig) {
    console.log('✅ Working configuration found!');
    console.log('');
    console.log('1. Update your .env.local file:');
    console.log(`   SKYSPARK_API_URL=${workingConfig.serverUrl}/api`);
    console.log(`   SKYSPARK_API_TOKEN=${workingConfig.token}`);
    console.log('');
    console.log('2. Restart your Next.js dev server:');
    console.log('   pnpm dev');
    console.log('');
    console.log('3. Test the connection:');
    console.log('   Visit http://localhost:3000');
    console.log('   Check console for "Connected to SkySpark API" message');
  } else {
    console.log('❌ No working configuration found.');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Start your SkySpark server:');
    console.log('   • Navigate to SkySpark installation directory');
    console.log('   • Run: ./bin/fan skyspark (or bin\\fan.exe skyspark on Windows)');
    console.log('   • Server typically starts on http://localhost:8080');
    console.log('');
    console.log('2. Try generating a new token:');
    console.log('   pnpm generate:token');
    console.log('');
    console.log('3. For now, use mock data:');
    console.log('   The application works perfectly with mock data');
    console.log('   Start with: pnpm dev');
  }
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🎯 Starting comprehensive SkySpark connection test...\n');
  
  // Step 1: Test existing token
  let workingConfig = await testExistingToken();
  
  if (workingConfig) {
    // If basic connection works, test different API patterns
    const apiResult = await testAPIPatterns(workingConfig.serverUrl, workingConfig.token);
    if (apiResult) {
      workingConfig = apiResult;
    }
  } else {
    // Step 2: Try basic authentication
    console.log('🔄 Existing token failed, trying basic authentication...\n');
    const basicAuthResult = await testBasicAuth();
    
    if (basicAuthResult) {
      console.log('✅ Basic authentication worked!');
      console.log('💡 You might need to generate a new Bearer token');
    }
  }
  
  // Generate setup instructions
  generateSetupInstructions(workingConfig);
  
  console.log('\n✨ Connection test completed!');
  console.log('');
  console.log('📚 Available commands:');
  console.log('   pnpm test:skyspark      - Quick connection test');
  console.log('   pnpm diagnose:skyspark  - Detailed diagnostics');
  console.log('   pnpm generate:token     - Generate new auth token');
  console.log('   pnpm dev                - Start the application (works with mock data)');
}

// Run the comprehensive test
await main();
