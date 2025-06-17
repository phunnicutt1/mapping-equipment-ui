#!/usr/bin/env node

/**
 * SkySpark SCRAM Authentication Token Generator
 * Based on the CxAlloy PHP implementation
 * Generates bearer tokens for API access
 */

import crypto from 'crypto';

const SKYSPARK_CONFIG = {
  serverUrl: 'http://localhost:8080', // Try 8080 first (default)
  username: 'patrick',
  password: 'obvious'
};

console.log('🔐 SkySpark SCRAM Authentication Token Generator\n');

/**
 * Generate a SkySpark auth token using SCRAM authentication
 */
async function generateSkySpark() {
  const { serverUrl, username, password } = SKYSPARK_CONFIG;
  
  console.log('🌐 Configuration:');
  console.log(`   Server: ${serverUrl}`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${'*'.repeat(password.length)}`);
  console.log('');

  try {
    // Step 1: Initial handshake (Message 1)
    console.log('📡 Step 1: Initial handshake...');
    const handshakeToken = await sendMessage1(serverUrl, username);
    console.log(`   Handshake token: ${handshakeToken.substring(0, 20)}...`);

    // Step 2: Client first message (Message 2)
    console.log('🔄 Step 2: Client authentication...');
    const clientNonce = crypto.randomBytes(16).toString('hex');
    const clientFirstMsg = `n=${username},r=${clientNonce}`;
    
    const serverFirstMsg = await sendMessage2(serverUrl, clientFirstMsg, handshakeToken);
    console.log(`   Server response received`);

    // Parse server response
    const serverNonce = getStringBetween(serverFirstMsg, 'r=', ',');
    const serverSalt = getStringBetween(serverFirstMsg, 's=', ',');
    const serverIterations = parseInt(serverFirstMsg.substring(serverFirstMsg.indexOf('i=') + 2));

    console.log(`   Server nonce: ${serverNonce.substring(0, 20)}...`);
    console.log(`   Iterations: ${serverIterations}`);

    // Step 3: Generate client proof (Message 3)
    console.log('🔒 Step 3: Generating client proof...');
    
    // PBKDF2 for salted password
    const saltedPassword = crypto.pbkdf2Sync(
      password,
      Buffer.from(serverSalt, 'base64'),
      serverIterations,
      32, // SHA-256 digest length
      'sha256'
    );

    const gs2Header = Buffer.from('n,,').toString('base64');
    const clientFinalNoPf = `c=${gs2Header},r=${serverNonce}`;
    const authMessage = `${clientFirstMsg},${serverFirstMsg},${clientFinalNoPf}`;

    // Generate client key and proof
    const clientKey = crypto.createHmac('sha256', saltedPassword).update('Client Key').digest();
    const storedKey = crypto.createHash('sha256').update(clientKey).digest();
    const clientSignature = crypto.createHmac('sha256', storedKey).update(authMessage).digest();
    
    // XOR client key with client signature
    const clientProof = Buffer.alloc(clientKey.length);
    for (let i = 0; i < clientKey.length; i++) {
      clientProof[i] = clientKey[i] ^ clientSignature[i];
    }

    const clientFinalMsg = `${clientFinalNoPf},p=${clientProof.toString('base64')}`;

    // Step 4: Get auth token (Message 3)
    console.log('🎯 Step 4: Requesting auth token...');
    const authToken = await sendMessage3(serverUrl, clientFinalMsg, handshakeToken);
    
    if (authToken) {
      console.log('✅ Authentication successful!');
      console.log('');
      console.log('🔑 Generated Auth Token:');
      console.log(`   ${authToken}`);
      console.log('');
      console.log('📝 Update your .env.local file:');
      console.log(`   SKYSPARK_API_URL=${serverUrl}/api`);
      console.log(`   SKYSPARK_API_TOKEN=${authToken}`);
      console.log('');

      // Test the token
      await testAuthToken(serverUrl, authToken);
      
      return authToken;
    } else {
      throw new Error('Failed to get auth token from server response');
    }

  } catch (error) {
    console.error('❌ Authentication failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Make sure SkySpark server is running');
      console.log('   2. Try port 8080 instead of 8081');
      console.log('   3. Check username and password');
    }
    
    return null;
  }
}

/**
 * Send SCRAM Message 1 - Initial handshake
 */
async function sendMessage1(serverUrl, username) {
  const authMsg = `HELLO username=${Buffer.from(username).toString('base64url')}`;
  
  const response = await fetch(serverUrl, {
    method: 'GET',
    headers: {
      'Authorization': authMsg,
      'WWW-Authenticate': 'SCRAM'
    },
    signal: AbortSignal.timeout(10000)
  });

  const responseText = await response.text();
  return getStringBetween(responseText, '=', ',');
}

/**
 * Send SCRAM Message 2 - Client first message
 */
async function sendMessage2(serverUrl, clientFirstMsg, handshakeToken) {
  const authMsg = `SCRAM handshakeToken=${handshakeToken}, data=${Buffer.from(clientFirstMsg).toString('base64url')}`;
  
  const response = await fetch(serverUrl, {
    method: 'GET',
    headers: {
      'Authorization': authMsg,
      'WWW-Authenticate': 'SCRAM'
    },
    signal: AbortSignal.timeout(10000)
  });

  const responseText = await response.text();
  const data = getStringBetween(responseText, 'data=', ',');
  return Buffer.from(data, 'base64').toString();
}

/**
 * Send SCRAM Message 3 - Client final message  
 */
async function sendMessage3(serverUrl, clientFinalMsg, handshakeToken) {
  const authMsg = `SCRAM handshakeToken=${handshakeToken}, data=${Buffer.from(clientFinalMsg).toString('base64url')}`;
  
  const response = await fetch(serverUrl, {
    method: 'GET',
    headers: {
      'Authorization': authMsg
    },
    signal: AbortSignal.timeout(10000)
  });

  const responseText = await response.text();
  return getStringBetween(responseText, 'authToken=', ',');
}

/**
 * Test the generated auth token
 */
async function testAuthToken(serverUrl, authToken) {
  console.log('🧪 Testing generated token...');
  
  try {
    // Try to get project list or basic info
    const response = await fetch(`${serverUrl}/api/about`, {
      method: 'GET',
      headers: {
        'Authorization': `BEARER authToken=${authToken}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      console.log('✅ Token test successful!');
      const data = await response.json();
      console.log(`   Server response: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      console.log(`⚠️  Token test returned: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`⚠️  Token test failed: ${error.message}`);
  }
}

/**
 * Extract substring between delimiters
 */
function getStringBetween(str, start, end) {
  const startIndex = str.indexOf(start);
  if (startIndex === -1) return '';
  
  const startPos = startIndex + start.length;
  const endIndex = str.indexOf(end, startPos);
  if (endIndex === -1) return str.substring(startPos);
  
  return str.substring(startPos, endIndex);
}

/**
 * Try multiple server configurations
 */
async function tryMultipleConfigs() {
  const configs = [
    { ...SKYSPARK_CONFIG, serverUrl: 'http://localhost:8080' },
    { ...SKYSPARK_CONFIG, serverUrl: 'http://localhost:8081' },
    { ...SKYSPARK_CONFIG, serverUrl: 'http://localhost:8082' }
  ];

  console.log('🔍 Trying multiple server configurations...\n');

  for (const config of configs) {
    console.log(`📍 Trying ${config.serverUrl}...`);
    
    // Update global config
    Object.assign(SKYSPARK_CONFIG, config);
    
    try {
      const token = await generateSkySpark();
      if (token) {
        console.log(`🎉 Success with ${config.serverUrl}!`);
        return token;
      }
    } catch (error) {
      console.log(`❌ Failed with ${config.serverUrl}`);
    }
    console.log('');
  }

  console.log('❌ All configurations failed');
  return null;
}

// Main execution
console.log('🚀 Starting SkySpark authentication process...\n');

// First try the primary config, then fallback to trying multiple
const token = await generateSkySpark();

if (!token) {
  console.log('\n🔄 Primary config failed, trying alternatives...\n');
  await tryMultipleConfigs();
}

console.log('\n✨ Authentication process completed!');
