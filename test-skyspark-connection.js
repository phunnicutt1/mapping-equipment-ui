#!/usr/bin/env node

/**
 * SkySpark Connection Test Script
 * Tests the SkySpark API connection independently
 */

const url = 'http://localhost:8081/api/read?filter=point';
const token = 'web-WSOaLAC5GNIX7BxMAbRr1NemKBU-GztkxkZFpBNd3hw-1';

console.log('🔌 Testing SkySpark Connection...');
console.log('URL:', url);
console.log('Token:', token.substring(0, 20) + '...');
console.log('');

async function testConnection() {
  try {
    console.log('📡 Making request to SkySpark API...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SkySpark API Error:');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ SkySpark Connection Successful!');
    console.log('📦 Data Structure:', {
      type: typeof data,
      hasRows: 'rows' in data,
      hasCols: 'cols' in data,
      rowCount: data.rows?.length || 0,
      colCount: data.cols?.length || 0
    });

    if (data.rows && data.rows.length > 0) {
      console.log('🔍 Sample Point Data:');
      console.log('First Point:', JSON.stringify(data.rows[0], null, 2));
      
      if (data.rows.length > 1) {
        console.log('Second Point:', JSON.stringify(data.rows[1], null, 2));
      }
    }

    console.log('');
    console.log('🎉 Connection test completed successfully!');
    return data;

  } catch (error) {
    console.error('❌ Connection Test Failed:');
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🌐 Network Error: Cannot reach SkySpark server');
      console.error('💡 Make sure SkySpark is running at http://localhost:8081');
    } else if (error.name === 'TimeoutError') {
      console.error('⏰ Timeout Error: SkySpark server not responding');
      console.error('💡 Check if SkySpark server is running and responsive');
    } else {
      console.error('Error Details:', error.message);
    }
    
    console.log('');
    console.log('🔧 Troubleshooting Steps:');
    console.log('1. Verify SkySpark server is running: http://localhost:8081');
    console.log('2. Check if authentication token is correct');
    console.log('3. Ensure API endpoint path is correct: /api/read?filter=point');
    console.log('4. Check firewall/network settings');
  }
}

// Run the test
testConnection();
