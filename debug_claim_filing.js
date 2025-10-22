// Debug script to check claim filing process
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/agrisupplychain';

async function debugClaimFiling() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the models
    const Insurance = mongoose.model('Insurance', new mongoose.Schema({
      userId: String,
      userEmail: String,
      policyId: String,
      premium: Number,
      insuranceType: String,
      coverage: Number,
      duration: Number,
      startDate: Date,
      endDate: Date,
      status: String,
      agentId: String,
      agentName: String,
      agentEmail: String
    }, { timestamps: true }));

    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String,
      role: String
    }));

    const Complaint = mongoose.model('Complaint', new mongoose.Schema({
      complaintId: String,
      sellerId: String,
      sellerEmail: String,
      status: String,
      hasClaim: Boolean
    }));

    // Find all sellers
    console.log('\n📋 Checking sellers with complaints...');
    const complaints = await Complaint.find({ status: 'pending', hasClaim: false }).limit(5);
    
    for (const complaint of complaints) {
      console.log(`\n--- Complaint: ${complaint.complaintId} ---`);
      console.log(`Seller ID: ${complaint.sellerId}`);
      console.log(`Seller Email: ${complaint.sellerEmail}`);
      
      // Find the seller
      const seller = await User.findById(complaint.sellerId);
      if (seller) {
        console.log(`✅ Seller found: ${seller.name} (${seller.email})`);
        
        // Check for active insurance by email
        const currentDate = new Date();
        const insurances = await Insurance.find({
          userEmail: seller.email,
          status: 'active',
          startDate: { $lte: currentDate },
          endDate: { $gte: currentDate }
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${insurances.length} active insurance(s) for ${seller.email}`);
        
        if (insurances.length > 0) {
          const insurance = insurances[0];
          console.log('Insurance details:');
          console.log(`  - Policy ID: ${insurance.policyId}`);
          console.log(`  - Coverage: $${insurance.coverage}`);
          console.log(`  - Type: ${insurance.insuranceType}`);
          console.log(`  - Start: ${insurance.startDate}`);
          console.log(`  - End: ${insurance.endDate}`);
          console.log(`  - Agent ID: ${insurance.agentId || 'NOT SET'}`);
          console.log(`  - Agent Name: ${insurance.agentName || 'NOT SET'}`);
          console.log(`  - Agent Email: ${insurance.agentEmail || 'NOT SET'}`);
          
          if (insurance.agentId) {
            const agent = await User.findOne({ _id: insurance.agentId, role: 'insurance' });
            if (agent) {
              console.log(`  ✅ Agent verified: ${agent.name} (${agent.email})`);
            } else {
              console.log(`  ⚠️ Agent ID exists but agent not found or not insurance role`);
            }
          } else {
            console.log(`  ⚠️ No agent ID in insurance record`);
            
            // Try to find any insurance agent
            const anyAgent = await User.findOne({ role: 'insurance' });
            if (anyAgent) {
              console.log(`  💡 Fallback agent available: ${anyAgent.name} (${anyAgent.email})`);
            } else {
              console.log(`  ❌ No insurance agents found in system!`);
            }
          }
        } else {
          console.log('❌ No active insurance found');
        }
      } else {
        console.log('❌ Seller not found in database');
      }
    }

    console.log('\n✅ Debug complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugClaimFiling();
