/**
 * Debug script that checks all cold storage temperature readings
 * and adds an index on the coldStorageName field to improve query performance.
 * 
 * Run with: node add_coldStorage_index.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

// Connection URL and Database Name
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'agriblockdb';

async function addColdStorageIndex() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const tempCollection = db.collection('tempdata');
    
    // Create indexes on all possible cold storage field variants
    console.log('Creating indexes on cold storage fields...');
    await tempCollection.createIndex({ coldStorageName: 1 });
    await tempCollection.createIndex({ coldstoragename: 1 });
    await tempCollection.createIndex({ coldStorageId: 1 });
    await tempCollection.createIndex({ coldstorageid: 1 });
    
    console.log('Indexes created successfully!');
    
    // Check for documents with no cold storage information at all
    const missingColdStorage = await tempCollection.countDocuments({
      $and: [
        { coldStorageName: { $exists: false } },
        { coldstoragename: { $exists: false } },
        { coldStorageId: { $exists: false } },
        { coldstorageid: { $exists: false } }
      ]
    });
    
    console.log(`Documents with no cold storage information: ${missingColdStorage}`);
    
    if (missingColdStorage > 0) {
      // Get a sample of these documents
      console.log('Sample document with missing cold storage information:');
      const sampleMissing = await tempCollection.findOne({
        $and: [
          { coldStorageName: { $exists: false } },
          { coldstoragename: { $exists: false } },
          { coldStorageId: { $exists: false } },
          { coldstorageid: { $exists: false } }
        ]
      });
      
      console.log(JSON.stringify(sampleMissing, null, 2));
    }
    
    // Show document count by various fields
    const totalDocs = await tempCollection.countDocuments();
    console.log(`\nTotal documents in tempdata collection: ${totalDocs}`);
    
    const withColdStorageName = await tempCollection.countDocuments({
      coldStorageName: { $exists: true }
    });
    console.log(`Documents with coldStorageName field: ${withColdStorageName}`);
    
    const withColdStorageNameLower = await tempCollection.countDocuments({
      coldstoragename: { $exists: true }
    });
    console.log(`Documents with coldstoragename field: ${withColdStorageNameLower}`);
    
    const withColdStorageId = await tempCollection.countDocuments({
      coldStorageId: { $exists: true }
    });
    console.log(`Documents with coldStorageId field: ${withColdStorageId}`);
    
    const withColdStorageIdLower = await tempCollection.countDocuments({
      coldstorageid: { $exists: true }
    });
    console.log(`Documents with coldstorageid field: ${withColdStorageIdLower}`);
    
    // Get all unique cold storage names
    const uniqueNames = await tempCollection.distinct('coldStorageName');
    console.log(`\nUnique coldStorageName values (${uniqueNames.length}):`);
    uniqueNames.slice(0, 10).forEach((name, idx) => {
      console.log(`  ${idx + 1}. "${name}"`);
    });
    
    if (uniqueNames.length > 10) {
      console.log(`  ... and ${uniqueNames.length - 10} more`);
    }
    
    // Get all unique cold storage IDs
    const uniqueIds = await tempCollection.distinct('coldStorageId');
    console.log(`\nUnique coldStorageId values (${uniqueIds.length}):`);
    uniqueIds.slice(0, 10).forEach((id, idx) => {
      console.log(`  ${idx + 1}. "${id}"`);
    });
    
    if (uniqueIds.length > 10) {
      console.log(`  ... and ${uniqueIds.length - 10} more`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
addColdStorageIndex()
  .catch(console.error);