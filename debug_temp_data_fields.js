/**
 * Debug script to list all cold storage names in temperature data collection
 * Run with: node debug_temp_data_fields.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

// Connection URL and Database Name
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'agriblockdb';

async function listColdStorageNames() {
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get database and collection
    const db = client.db(dbName);
    const tempCollection = db.collection('tempdata');
    
    // Count total documents
    const totalDocs = await tempCollection.countDocuments();
    console.log(`Total documents in tempdata collection: ${totalDocs}`);
    
    // Find all unique cold storage name field variants
    const fieldVariants = [
      'coldStorageName',
      'coldstoragename',
      'coldStorageId',
      'coldStorageID',
      'coldstorageid'
    ];
    
    // Check each field variant
    for (const field of fieldVariants) {
      // Count documents with this field
      const query = { [field]: { $exists: true } };
      const count = await tempCollection.countDocuments(query);
      
      console.log(`\nField "${field}" exists in ${count} documents`);
      
      if (count > 0) {
        // Get unique values for this field
        const uniqueValues = await tempCollection.distinct(field);
        console.log(`Unique values for "${field}" (${uniqueValues.length}):`);
        
        // Display the first 20 values
        const displayValues = uniqueValues.slice(0, 20);
        displayValues.forEach((value, index) => {
          console.log(`  ${index + 1}. "${value}"`);
        });
        
        if (uniqueValues.length > 20) {
          console.log(`  ... and ${uniqueValues.length - 20} more`);
        }
        
        // Show a sample document with this field
        const sampleDoc = await tempCollection.findOne(query);
        console.log('\nSample document:');
        console.log(JSON.stringify(sampleDoc, null, 2));
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
listColdStorageNames()
  .catch(console.error);