import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Insurance } from '../insurance/insurance.schema';
import { User } from '../user/user.schema';
import { Policy } from '../insurance/policy.schema';

async function migrateInsuranceAgentInfo() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('🚀 Starting insurance agent info migration...');
    
    // Get the models
    const insuranceModel = app.get('InsuranceModel') as Model<Insurance>;
    const userModel = app.get('UserModel') as Model<User>;
    const policyModel = app.get('PolicyModel') as Model<Policy>;
    
    // Find all insurance records without agent information
    const insurancesWithoutAgent = await insuranceModel.find({
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`📋 Found ${insurancesWithoutAgent.length} insurance records without agent info`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const insurance of insurancesWithoutAgent) {
      console.log(`\n--- Processing insurance ${insurance.policyId} for user ${insurance.userEmail} ---`);
      
      let agent: any = null;
      
      // Strategy 1: Try to find the policy template and get the creator
      if (insurance.policyId) {
        const policy = await policyModel.findOne({ policyId: insurance.policyId });
        if (policy && policy.createdBy) {
          agent = await userModel.findOne({ 
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
        agent = await userModel.findOne({ role: 'insurance' });
        if (agent) {
          console.log(`✅ Using fallback agent: ${agent.name} (${agent.email})`);
        }
      }
      
      if (agent) {
        // Update the insurance record
        (insurance as any).agentId = agent._id.toString();
        (insurance as any).agentName = agent.name;
        (insurance as any).agentEmail = agent.email;
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
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await app.close();
  }
}

migrateInsuranceAgentInfo();
