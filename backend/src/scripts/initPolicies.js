const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain?retryWrites=true&w=majority';

const defaultPolicies = [
  {
    policyId: 'POL001',
    name: 'Basic Coverage',
    premium: 100,
    coverage: 1000,
    duration: 12,
    type: 'general',
    status: 'active',
    description: 'Basic insurance coverage for agricultural products',
    coverageItems: ['Crop damage', 'Weather protection'],
    terms: 'Standard terms and conditions apply',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    policyId: 'POL002',
    name: 'Premium Coverage',
    premium: 200,
    coverage: 2500,
    duration: 12,
    type: 'crop',
    status: 'active',
    description: 'Premium insurance coverage with extended benefits',
    coverageItems: ['Crop damage', 'Weather protection', 'Pest damage', 'Equipment coverage'],
    terms: 'Premium terms with extended coverage',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    policyId: 'POL003',
    name: 'Comprehensive Coverage',
    premium: 300,
    coverage: 5000,
    duration: 12,
    type: 'general',
    status: 'active',
    description: 'Comprehensive insurance coverage for all risks',
    coverageItems: ['Crop damage', 'Weather protection', 'Pest damage', 'Equipment coverage', 'Livestock protection', 'Storage coverage'],
    terms: 'Comprehensive coverage with maximum benefits',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    policyId: 'POL004',
    name: 'Livestock Protection',
    premium: 150,
    coverage: 3000,
    duration: 24,
    type: 'livestock',
    status: 'active',
    description: 'Specialized insurance for livestock and animal health',
    coverageItems: ['Disease protection', 'Accident coverage', 'Veterinary costs', 'Feed loss coverage'],
    terms: 'Livestock specific terms and conditions',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    policyId: 'POL005',
    name: 'Equipment Insurance',
    premium: 250,
    coverage: 4000,
    duration: 18,
    type: 'equipment',
    status: 'active',
    description: 'Insurance coverage for agricultural equipment and machinery',
    coverageItems: ['Machinery breakdown', 'Theft protection', 'Accidental damage', 'Repair costs'],
    terms: 'Equipment insurance terms and conditions',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializePolicies() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('blockchain');
    const collection = db.collection('policies');
    
    // Check if policies already exist
    const existingCount = await collection.countDocuments();
    console.log(`Found ${existingCount} existing policies`);
    
    if (existingCount === 0) {
      console.log('Inserting default policies...');
      const result = await collection.insertMany(defaultPolicies);
      console.log(`Successfully inserted ${result.insertedCount} policies`);
    } else {
      console.log('Policies already exist, skipping initialization');
    }
    
  } catch (error) {
    console.error('Error initializing policies:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

initializePolicies();