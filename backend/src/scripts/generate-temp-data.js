/**
 * This script generates sample temperature data for orders in cold storage
 * Run this script to populate the tempdata collection in MongoDB
 */

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb').ObjectId;

// MongoDB connection URI
const uri = process.env.MONGODB_URI || 'mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain?retryWrites=true&w=majority';

// Connect to MongoDB
async function generateTemperatureData() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!');
    
    const db = client.db('blockchain');
    const ordersCollection = db.collection('orders');
    const tempDataCollection = db.collection('tempdata');
    
    // Get all orders in cold storage
    const coldStorageOrders = await ordersCollection.find({
      status: { $in: ['dispatched_to_coldstorage', 'in_coldstorage'] }
    }).toArray();
    
    console.log(`Found ${coldStorageOrders.length} orders in cold storage`);
    
    if (coldStorageOrders.length === 0) {
      console.log('No orders in cold storage. Exiting...');
      return;
    }
    
    // Generate temperature data for each order
    for (const order of coldStorageOrders) {
      // Generate between 1 and 5 temperature entries for each order
      const numEntries = Math.floor(Math.random() * 5) + 1;
      
      console.log(`Generating ${numEntries} temperature entries for order ${order.orderId}`);
      
      for (let i = 0; i < numEntries; i++) {
        // Generate random temperature between 2 and 8 degrees Celsius
        const temperature = (Math.random() * 6 + 2).toFixed(1);
        
        // Generate random humidity between 65% and 95%
        const humidity = (Math.random() * 30 + 65).toFixed(1);
        
        // Generate timestamp within the last 24 hours
        const now = new Date();
        const hoursAgo = Math.floor(Math.random() * 24);
        const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        
        // Create temperature data record
        const tempData = {
          orderId: order.orderId,
          productId: order.productId || 'unknown',
          productName: order.productName || 'Unknown Product',
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity),
          timestamp: timestamp,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          coldStorageId: order.coldStorageId || null
        };
        
        // Insert temperature data into collection
        await tempDataCollection.insertOne(tempData);
      }
    }
    
    console.log('Temperature data generation completed successfully!');
    
  } catch (err) {
    console.error('Error generating temperature data:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
generateTemperatureData().catch(console.error);

console.log('Starting temperature data generation...');