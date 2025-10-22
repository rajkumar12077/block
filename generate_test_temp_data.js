/**
 * This script generates test temperature data for the cold storage dashboard.
 * It creates temperature readings with both coldStorageName and coldStorageId fields.
 * 
 * Run with: node generate_test_temp_data.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

// MongoDB connection details
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'agriblockdb';

// Configuration
const COLD_STORAGE_NAMES = [
  "Alpine Cold Storage", 
  "Polar Freeze Facility",
  "Arctic Preservation",
  "FrostBite Storage",
  "TestColdStorage"
];

const COLD_STORAGE_IDS = [
  "65a8c90de24a3863f84ff107",  // Example MongoDB ObjectId
  "65a8c91de24a3863f84ff108",
  "65a8c92de24a3863f84ff109",
  "65a8c93de24a3863f84ff10a",
  "65a8c94de24a3863f84ff10b"
];

const DEVICES = [
  "TEMP-SENSOR-001",
  "HUMID-CONTROL-A",
  "MONITOR-STATION-1",
  "CLIMATE-CHECK-42"
];

const PRODUCTS = [
  { id: "prod001", name: "Organic Apples" },
  { id: "prod002", name: "Fresh Tomatoes" },
  { id: "prod003", name: "Premium Mangoes" },
  { id: "prod004", name: "Grade A Potatoes" }
];

const ORDER_IDS = [
  "ORD-2023-001",
  "ORD-2023-002",
  "ORD-2023-003",
  "ORD-2023-004"
];

// Function to generate random temperature between 0 and 10°C
function getRandomTemperature() {
  return parseFloat((Math.random() * 10).toFixed(1));
}

// Function to generate random humidity between 40 and 95%
function getRandomHumidity() {
  return parseFloat((40 + Math.random() * 55).toFixed(1));
}

// Function to generate a timestamp within the past 24 hours
function getRandomTimestamp() {
  const now = new Date();
  const pastHours = Math.random() * 24; // Up to 24 hours in the past
  return new Date(now.getTime() - (pastHours * 60 * 60 * 1000));
}

// Function to generate random temperature data
async function generateTemperatureData() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const tempCollection = db.collection('tempdata');
    
    // Clear existing test data if requested
    if (process.argv.includes('--clear')) {
      console.log('Clearing existing test temperature data...');
      await tempCollection.deleteMany({
        isTestData: true
      });
      console.log('Test data cleared.');
    }
    
    // Generate test data
    const numReadings = process.argv.includes('--count') ? 
      parseInt(process.argv[process.argv.indexOf('--count') + 1]) : 50;
      
    console.log(`Generating ${numReadings} temperature readings...`);
    
    const tempData = [];
    
    for (let i = 0; i < numReadings; i++) {
      const coldStorageIdx = i % COLD_STORAGE_NAMES.length;
      const deviceIdx = i % DEVICES.length;
      const productIdx = i % PRODUCTS.length;
      const orderIdx = i % ORDER_IDS.length;
      
      // Generate a reading with both name and ID for maximum compatibility
      const reading = {
        orderId: ORDER_IDS[orderIdx],
        productId: PRODUCTS[productIdx].id,
        productName: PRODUCTS[productIdx].name,
        temperature: getRandomTemperature(),
        humidity: getRandomHumidity(),
        timestamp: getRandomTimestamp(),
        device: DEVICES[deviceIdx],
        
        // Add both variations of field names for testing
        coldStorageName: COLD_STORAGE_NAMES[coldStorageIdx],
        coldStorageId: COLD_STORAGE_IDS[coldStorageIdx],
        
        // Mark as test data so we can clear it later
        isTestData: true,
        
        // Additional fields that might be needed
        sellerId: `seller-${i % 3}`,
        buyerId: `buyer-${i % 3}`
      };
      
      tempData.push(reading);
    }
    
    // Insert the test data
    const result = await tempCollection.insertMany(tempData);
    console.log(`${result.insertedCount} temperature readings inserted successfully!`);
    
    // Confirm insertion
    const totalCount = await tempCollection.countDocuments({ isTestData: true });
    console.log(`Total test temperature readings in database: ${totalCount}`);
    
    // Print out a summary of the data we inserted
    console.log('\nSummary of inserted data:');
    
    for (const name of COLD_STORAGE_NAMES) {
      const count = await tempCollection.countDocuments({ 
        coldStorageName: name,
        isTestData: true 
      });
      console.log(`- ${name}: ${count} readings`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
generateTemperatureData().catch(console.error);