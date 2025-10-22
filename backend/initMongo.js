// This script initializes MongoDB collections for the agri supply chain app.
// Run with: node initMongo.js

const { MongoClient } = require('mongodb');

// Updated MongoDB URI with correct credentials
// Replace 'yourUsername' and 'yourPassword' with your actual MongoDB Atlas credentials
const uri = process.env.MONGODB_URI || 'mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain?retryWrites=true&w=majority';
const dbName = 'blockchain';
const collections = ['complaints','insurance_claims','insurances','orders', 'orderhistory','policies','products','transactions', 'userbalances','users','vehicles'];


async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    for (const name of collections) {
      const exists = await db.listCollections({ name }).hasNext();
      if (!exists) {
        await db.createCollection(name);
        console.log(`Created collection: ${name}`);
      } else {
        console.log(`Collection already exists: ${name}`);
      }
    }
    // Add sellerEmail to all products if missing
    const products = db.collection('products');
    const result = await products.updateMany(
      { sellerEmail: { $exists: false } },
      { $set: { sellerEmail: '' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} products to add sellerEmail field.`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
