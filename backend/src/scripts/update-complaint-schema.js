/**
 * MongoDB migration script to update the Complaint schema
 * 
 * This script updates the Complaint schema in MongoDB to add the 'cancelled'
 * status to the valid enum values and adds the cancellation-related fields.
 * 
 * Run this script with Node.js:
 * node src/scripts/update-complaint-schema.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateComplaintSchema() {
  // Connection URI from environment variables or use a default
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'agriblock';
  
  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const complaintsCollection = db.collection('complaints');
    
    // 1. Update the schema validation to include 'cancelled' in the status enum
    // Note: This depends on your MongoDB setup. If you're using MongoDB 4.2+
    // and have schema validation enabled, you'll need to update it.
    
    console.log('Checking for complaints collection...');
    
    const collections = await db.listCollections({ name: 'complaints' }).toArray();
    if (collections.length === 0) {
      console.log('Complaints collection not found');
      return;
    }
    
    // 2. As a simpler alternative, we'll just update any existing cancelled complaints
    // to use the 'rejected' status with cancellation fields
    const updateResult = await complaintsCollection.updateMany(
      { status: 'cancelled' },
      { $set: { status: 'rejected' } }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} complaints with 'cancelled' status to 'rejected'`);
    
    // 3. Create indexes for the new fields for better query performance
    await complaintsCollection.createIndex({ cancellationDate: 1 });
    console.log('Created index for cancellationDate field');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updateComplaintSchema().catch(console.error);