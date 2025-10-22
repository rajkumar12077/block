// Migration script to add agent information to existing insurance records
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/agrisupplychain';

async function migrateInsuranceAgentInfo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define schemas
    const InsuranceSchema = new mongoose.Schema({
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
      agentEmail: String,
      claimsCount: { type: Number, default: 0 },
      totalClaimsAmount: { type: Number, default: 0 },
      lastClaimDate: String
    }, { timestamps: true, strict: false });

    const UserSchema = new mongoose.Schema({
      email: String,
      name: String,
      role: String
    });

    const PolicySchema = new mongoose.Schema({
      policyId: String,
      createdBy: String
    });

    const Insurance = mongoose.model('Insurance', InsuranceSchema);
    const User = mongoose.model('User', UserSchema);
    const Policy = mongoose.model('Policy', PolicySchema);

    // Find all insurance records without agent information
    const insurancesWithoutAgent = await Insurance.find({
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });

    console.log(`\n📋 Found ${insurancesWithoutAgent.length} insurance records without agent info`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const insurance of insurancesWithoutAgent) {
      console.log(`\n--- Processing insurance ${insurance.policyId} for user ${insurance.userEmail} ---`);

      let agent = null;

      // Strategy 1: Try to find the policy template and get the creator
      if (insurance.policyId) {
        const policy = await Policy.findOne({ policyId: insurance.policyId });
        if (policy && policy.createdBy) {
          agent = await User.findOne({ 
            _id: policy.createdBy, 
            role: 'insurance' 
          });
          if (agent) {
            console.log(`✅ Found agent from policy template: ${agent.name} (${agent.email})`);
          }
        }
      }

      // Strategy 2: If no agent found, assign to any available insurance agent
      if (!agent) {
        agent = await User.findOne({ role: 'insurance' });
        if (agent) {
          console.log(`✅ Using fallback agent: ${agent.name} (${agent.email})`);
        }
      }

      if (agent) {
        // Update the insurance record
        insurance.agentId = agent._id.toString();
        insurance.agentName = agent.name;
        insurance.agentEmail = agent.email;
        await insurance.save();

        console.log(`✅ Updated insurance ${insurance.policyId} with agent ${agent.name}`);
        updatedCount++;
      } else {
        console.log(`⚠️ No insurance agent found in system - skipping`);
        skippedCount++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    
    console.log('\n📊 Summary of all insurances:');
    const allInsurances = await Insurance.find();
    for (const ins of allInsurances) {
      console.log(`  - ${ins.policyId} (${ins.userEmail}): Agent = ${ins.agentName || 'NONE'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateInsuranceAgentInfo();
