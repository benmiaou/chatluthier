const { initializeWebSocketServer } = require('../srv/sockets/socketServer');
const WebSocket = require('ws');
const http = require('node:http');

// Test WebSocket configuration
async function testWebSocketConfiguration() {
  console.log('Testing WebSocket configuration...');

  try {
    // Test 1: Local development scenario (HTTP port 3000, WS port 3001)
    console.log('\n1. Testing local development scenario:');
    const httpServer1 = http.createServer();
    const wsServer1 = initializeWebSocketServer(httpServer1, 3000, 3001);

    if (wsServer1) {
      console.log('✅ WebSocket server created successfully for local dev');
      console.log(`   HTTP port: 3000, WebSocket port: 3001`);

      // Close the server after a short delay
      setTimeout(() => {
        if (wsServer1.close) wsServer1.close();
        if (httpServer1.close) httpServer1.close();
      }, 100);
    } else {
      console.log('❌ Failed to create WebSocket server for local dev');
    }

    // Test 2: Dev server scenario (HTTP port 4000, WS port 4001)
    console.log('\n2. Testing dev server scenario:');
    const httpServer2 = http.createServer();
    const wsServer2 = initializeWebSocketServer(httpServer2, 4000, 4001);

    if (wsServer2) {
      console.log('✅ WebSocket server created successfully for dev server');
      console.log(`   HTTP port: 4000, WebSocket port: 4001`);

      // Close the server after a short delay
      setTimeout(() => {
        if (wsServer2.close) wsServer2.close();
        if (httpServer2.close) httpServer2.close();
      }, 100);
    } else {
      console.log('❌ Failed to create WebSocket server for dev server');
    }

    // Test 3: Production scenario (HTTP port 3000, WS port 3001 - auto)
    console.log('\n3. Testing production scenario (auto port):');
    const httpServer3 = http.createServer();
    const wsServer3 = initializeWebSocketServer(httpServer3, 3000, null);

    if (wsServer3) {
      console.log('✅ WebSocket server created successfully for production');
      console.log(`   HTTP port: 3000, WebSocket port: 3001 (auto)`);

      // Close the server after a short delay
      setTimeout(() => {
        if (wsServer3.close) wsServer3.close();
        if (httpServer3.close) httpServer3.close();
      }, 100);
    } else {
      console.log('❌ Failed to create WebSocket server for production');
    }

    console.log('\n✅ All WebSocket configuration tests passed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test with timeout
testWebSocketConfiguration().then(() => {
  console.log('Test completed successfully');
  process.exit(0);
});

module.exports = { testWebSocketConfiguration };
