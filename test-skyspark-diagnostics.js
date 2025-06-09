#!/usr/bin/env node

/**
 * SkySpark Connection Diagnostics & Setup Helper
 */

console.log('🔍 SkySpark Connection Diagnostics\n');

async function runDiagnostics() {
  console.log('📋 Configuration Check:');
  console.log('━'.repeat(50));
  
  // Check environment variables
  const skysparkUrl = 'http://localhost:8081/api';
  const skysparkToken = 'web-WSOaLAC5GNIX7BxMAbRr1NemKBU-GztkxkZFpBNd3hw-1';
  
  console.log('✓ URL:', skysparkUrl);
  console.log('✓ Token:', skysparkToken.substring(0, 20) + '...');
  console.log('✓ Full endpoint:', `${skysparkUrl}/read?filter=point`);
  console.log('');

  console.log('🌐 Network Connectivity Tests:');
  console.log('━'.repeat(50));

  // Test 1: Basic server connectivity
  console.log('Test 1: Testing basic server connectivity...');
  try {
    const basicResponse = await fetch('http://localhost:8081', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('✅ Basic server is reachable');
    console.log('   Status:', basicResponse.status);
    console.log('   Headers:', Object.fromEntries(basicResponse.headers.entries()));
    
    const responseText = await basicResponse.text();
    console.log('   Response preview:', responseText.substring(0, 200) + '...');
    
  } catch (error) {
    console.log('❌ Basic server connectivity failed');
    console.log('   Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   📌 This usually means SkySpark server is not running');
    } else if (error.message.includes('timeout')) {
      console.log('   📌 Server may be running but not responding');
    }
  }
  console.log('');

  // Test 2: API endpoint
  console.log('Test 2: Testing API endpoint structure...');
  try {
    const apiResponse = await fetch('http://localhost:8081/api', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('✅ API endpoint is reachable');
    console.log('   Status:', apiResponse.status);
    
  } catch (error) {
    console.log('❌ API endpoint connectivity failed');
    console.log('   Error:', error.message);
  }
  console.log('');

  // Test 3: Authenticated request
  console.log('Test 3: Testing authenticated API request...');
  try {
    const authResponse = await fetch(`${skysparkUrl}/read?filter=point`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${skysparkToken}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    console.log('✅ Authenticated request completed');
    console.log('   Status:', authResponse.status, authResponse.statusText);
    
    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log('   Data received:', {
        type: typeof data,
        hasRows: 'rows' in data,
        rowCount: data.rows?.length || 0
      });
    } else {
      const errorText = await authResponse.text();
      console.log('   Error response:', errorText.substring(0, 300));
    }
    
  } catch (error) {
    console.log('❌ Authenticated request failed');
    console.log('   Error:', error.message);
  }
  console.log('');

  // Print troubleshooting guide
  console.log('🛠️  Troubleshooting Guide:');
  console.log('━'.repeat(50));
  console.log('');
  
  console.log('1. 🚀 Starting SkySpark Server:');
  console.log('   If you have SkySpark installed locally:');
  console.log('   • Navigate to your SkySpark installation directory');
  console.log('   • Run: ./bin/fan skyspark');
  console.log('   • Or on Windows: bin\\fan.exe skyspark');
  console.log('   • Server should start on http://localhost:8080 by default');
  console.log('');
  
  console.log('2. 📊 Port Configuration:');
  console.log('   • Default SkySpark port is usually 8080, not 8081');
  console.log('   • Check if your server is running on port 8080:');
  console.log('     http://localhost:8080');
  console.log('   • Update .env.local if needed:');
  console.log('     SKYSPARK_API_URL=http://localhost:8080/api');
  console.log('');
  
  console.log('3. 🔐 Authentication Setup:');
  console.log('   • Create a user account in SkySpark web interface');
  console.log('   • Generate an API token in user settings');
  console.log('   • Update .env.local with the new token');
  console.log('');
  
  console.log('4. 🏗️  Alternative: Docker SkySpark:');
  console.log('   If you need a quick SkySpark instance:');
  console.log('   • docker pull skyspark/skyspark:latest');
  console.log('   • docker run -p 8080:8080 skyspark/skyspark:latest');
  console.log('');
  
  console.log('5. 🧪 Testing Without SkySpark:');
  console.log('   The application will automatically use mock data if SkySpark is unavailable.');
  console.log('   You can develop and test the UI features without a running SkySpark server.');
  console.log('');
  
  console.log('6. 📝 Next Steps:');
  console.log('   • Start your SkySpark server');
  console.log('   • Re-run this test: pnpm test:skyspark');
  console.log('   • Start the dev server: pnpm dev');
  console.log('   • Visit http://localhost:3000 to test the connection');
}

// Run diagnostics
await runDiagnostics();
