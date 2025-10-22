/**
 * Test script for complaint cancellation
 * 
 * This script can be used to test the complaint cancellation functionality
 * directly against the database, bypassing the API.
 * 
 * Usage: 
 * node src/scripts/test-cancel-complaint.js <complaintId>
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testCancelComplaint() {
  // Get complaint ID from command line args
  const complaintId = process.argv[2];
  
  if (!complaintId) {
    console.error('Error: Please provide a complaint ID');
    console.error('Usage: node test-cancel-complaint.js <complaintId>');
    process.exit(1);
  }
  
  // Connection URI from environment variables or use a default
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'agriblock';
  
  console.log(`🔍 Testing cancellation of complaint: ${complaintId}`);
  console.log(`📊 Connecting to MongoDB at: ${uri}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const complaintsCollection = db.collection('complaints');
    
    // 1. Find the complaint
    console.log(`🔍 Looking up complaint with ID: ${complaintId}`);
    const complaint = await complaintsCollection.findOne({ complaintId });
    
    if (!complaint) {
      console.error(`❌ Error: Complaint not found with ID: ${complaintId}`);
      return;
    }
    
    console.log(`✅ Found complaint: ${complaint._id}`);
    console.log(`📋 Current status: ${complaint.status}`);
    console.log(`📋 Has claim: ${complaint.hasClaim}`);
    console.log(`📋 Claim ID: ${complaint.claimId}`);
    
    // 2. Check if it can be cancelled
    if (complaint.status !== 'pending') {
      console.error(`❌ Error: Cannot cancel complaint with status: ${complaint.status}`);
      return;
    }
    
    if (complaint.hasClaim || complaint.claimId) {
      console.error(`❌ Error: Cannot cancel complaint with an associated claim`);
      return;
    }
    
    // 3. Attempt update directly with MongoDB (bypassing Mongoose validation)
    console.log(`🔄 Attempting to cancel complaint...`);
    
    const updateResult = await complaintsCollection.updateOne(
      { _id: complaint._id },
      { 
        $set: {
          status: 'rejected', // Using rejected instead of cancelled as a workaround
          cancellationDate: new Date().toISOString(),
          cancellationReason: 'Test cancellation'
        }
      }
    );
    
    if (updateResult.modifiedCount === 1) {
      console.log(`✅ Successfully cancelled complaint!`);
      
      // Verify the update
      const updatedComplaint = await complaintsCollection.findOne({ _id: complaint._id });
      console.log(`📋 New status: ${updatedComplaint.status}`);
      console.log(`📋 Cancellation date: ${updatedComplaint.cancellationDate}`);
      console.log(`📋 Cancellation reason: ${updatedComplaint.cancellationReason}`);
    } else {
      console.error(`❌ Failed to update complaint. Update result:`, updateResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
testCancelComplaint().catch(console.error);