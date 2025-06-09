#!/usr/bin/env node

/**
 * Quick SkySpark Port Configuration Helper
 */

console.log('🔧 SkySpark Port Configuration Helper\n');

const configs = [
  { port: 8080, name: 'Default SkySpark Port' },
  { port: 8081, name: 'Your Current Config' },
  { port: 8082, name: 'Alternative Port' }
];

async function testPortConfigs() {
  console.log('Testing SkySpark configurations...\n');
  
  for (const config of configs) {
    console.log(`📍 Testing ${config.name} (Port ${config.port}):`);
    
    try {
      const response = await fetch(`http://localhost:${config.port}`, {
        signal: AbortSignal.timeout(3000)
      });
      
      console.log(`   ✅ Server accessible on port ${config.port}`);
      console.log(`   Status: ${response.status}`);
      
      // Test API endpoint
      try {
        const apiResponse = await fetch(`http://localhost:${config.port}/api/about`, {
          signal: AbortSignal.timeout(3000)
        });
        console.log(`   API endpoint: ${apiResponse.status}`);
      } catch (e) {
        console.log(`   API endpoint: Not accessible`);
      }
      
      console.log(`   🎯 Update .env.local with:`);
      console.log(`   SKYSPARK_API_URL=http://localhost:${config.port}/api`);
      
    } catch (error) {
      console.log(`   ❌ Port ${config.port} not accessible`);
    }
    console.log('');
  }
  
  console.log('💡 Instructions:');
  console.log('1. Start SkySpark server first');
  console.log('2. Note which port it starts on');
  console.log('3. Update .env.local with correct port');
  console.log('4. Restart Next.js dev server: pnpm dev');
}

await testPortConfigs();
