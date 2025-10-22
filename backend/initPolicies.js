const { MongoClient } = require('mongodb');

// MongoDB connection
const uri = 'mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain?retryWrites=true&w=majority';

async function initializePolicies() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('blockchain');
    const policiesCollection = db.collection('policies');

    // Clear existing policies
    await policiesCollection.deleteMany({});
    console.log('Cleared existing policies');

    // Sample policies with daily rates and flexible duration
    const samplePolicies = [
      {
        policyId: 'POL001',
        name: 'Basic Agricultural Coverage',
        description: 'Basic insurance coverage for agricultural products, crops, and equipment',
        dailyRate: 5, // $5 per day
        coverage: 1000, // $1000 maximum coverage
        maxDurationMonths: 12, // Maximum 12 months
        minDurationDays: 7, // Minimum 1 week
        type: 'crop',
        status: 'active',
        coverageItems: [
          'Crop damage due to weather',
          'Pest damage',
          'Basic equipment coverage'
        ],
        terms: 'Basic coverage terms with standard deductible and exclusions',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        policyId: 'POL002',
        name: 'Premium Agricultural Insurance',
        description: 'Comprehensive insurance for agricultural operations with extended coverage',
        dailyRate: 12, // $12 per day
        coverage: 5000, // $5000 maximum coverage
        maxDurationMonths: 18, // Maximum 18 months
        minDurationDays: 14, // Minimum 2 weeks
        type: 'general',
        status: 'active',
        coverageItems: [
          'Crop damage (all causes)',
          'Livestock protection',
          'Equipment and machinery',
          'Storage facility coverage',
          'Transport insurance'
        ],
        terms: 'Premium coverage with reduced deductible and comprehensive protection',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        policyId: 'POL003',
        name: 'Livestock Protection Plan',
        description: 'Specialized insurance for livestock and animal husbandry operations',
        dailyRate: 8, // $8 per day
        coverage: 3000, // $3000 maximum coverage
        maxDurationMonths: 24, // Maximum 24 months
        minDurationDays: 30, // Minimum 1 month
        type: 'livestock',
        status: 'active',
        coverageItems: [
          'Livestock mortality coverage',
          'Disease outbreak protection',
          'Feed and fodder insurance',
          'Veterinary care coverage'
        ],
        terms: 'Livestock-specific terms with specialized veterinary requirements',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        policyId: 'POL004',
        name: 'Equipment Protection Insurance',
        description: 'Dedicated coverage for agricultural equipment and machinery',
        dailyRate: 3, // $3 per day
        coverage: 2000, // $2000 maximum coverage
        maxDurationMonths: 6, // Maximum 6 months
        minDurationDays: 1, // Minimum 1 day (for short-term equipment rental)
        type: 'equipment',
        status: 'active',
        coverageItems: [
          'Machinery breakdown coverage',
          'Theft protection',
          'Accidental damage',
          'Replacement cost coverage'
        ],
        terms: 'Equipment-specific coverage with immediate replacement benefits',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        policyId: 'POL005',
        name: 'Seasonal Crop Protection',
        description: 'Short-term coverage for seasonal crops and harvesting periods',
        dailyRate: 15, // $15 per day (higher rate for short-term high-risk coverage)
        coverage: 7500, // $7500 maximum coverage
        maxDurationMonths: 3, // Maximum 3 months (seasonal)
        minDurationDays: 3, // Minimum 3 days
        type: 'crop',
        status: 'active',
        coverageItems: [
          'Weather-related crop damage',
          'Harvest loss protection',
          'Market price fluctuation coverage',
          'Emergency replanting costs'
        ],
        terms: 'Seasonal coverage with immediate payout for harvest-related losses',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert policies
    const result = await policiesCollection.insertMany(samplePolicies);
    console.log(`Created ${result.insertedCount} policies`);

    // Display created policies
    console.log('\n=== CREATED POLICIES ===');
    for (const policy of samplePolicies) {
      console.log(`${policy.policyId}: ${policy.name}`);
      console.log(`  Daily Rate: $${policy.dailyRate}`);
      console.log(`  Coverage: $${policy.coverage}`);
      console.log(`  Duration: ${policy.minDurationDays} days to ${policy.maxDurationMonths} months`);
      console.log(`  Type: ${policy.type}`);
      console.log('');
    }

    console.log('✅ Policy initialization complete!');
    
  } catch (error) {
    console.error('Error initializing policies:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run the initialization
initializePolicies().catch(console.error);