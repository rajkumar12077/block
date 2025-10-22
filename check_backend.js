// check_backend.js - Script to check if the backend server is running

const http = require('http');

// Define the options for the HTTP request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000, // 5-second timeout
};

console.log('Checking backend server at http://localhost:3000...');

// Create the request
const req = http.request(options, (res) => {
  console.log(`Backend server responded with status code: ${res.statusCode}`);
  
  let data = '';
  
  // Gather response data
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Output response data when complete
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Backend server response:', jsonData);
    } catch (e) {
      console.log('Backend server response (raw):', data);
    }
    console.log('Backend server is running ✅');
  });
});

// Handle errors
req.on('error', (error) => {
  console.error('Error connecting to backend server:', error.message);
  console.error('Backend server is not running ❌');
  console.log('');
  console.log('Possible solutions:');
  console.log('1. Start the backend server by running "npm start" in the backend directory');
  console.log('2. Check if there are any error messages in the backend terminal');
  console.log('3. Verify the backend server is configured to run on port 3000');
  console.log('4. Check if another process is using port 3000');
});

// Set request timeout handler
req.on('timeout', () => {
  console.error('Request timed out after 5 seconds');
  req.destroy();
});

// End the request
req.end();