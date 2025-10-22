import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Insurance } from './insurance.schema';
import { Policy } from './policy.schema';
import { InsuranceClaim } from './insurance-claim.schema';
import { TransactionService } from './transaction.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.schema';
import { Product } from '../product/product.schema';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    @InjectModel('Insurance') private insuranceModel: Model<Insurance>,
    @InjectModel('Policy') private policyModel: Model<Policy>,
    @InjectModel('InsuranceClaim') private insuranceClaimModel: Model<InsuranceClaim>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Product') private productModel: Model<Product>,
    private userService: UserService,
    private transactionService: TransactionService,
  ) {}

  async subscribeToPolicy(
    userId: string, 
    policyId: string, 
    startDate: Date = new Date(), 
    endDate: Date,
    agentId?: string,
    insuranceType: 'normal' | 'premium' = 'normal'
  ) {
    try {
      this.logger.log(`Starting policy subscription for user ${userId}, policy ${policyId}`);
      this.logger.log(`Subscription period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Check if user already has an active insurance policy
      const existingInsurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      if (existingInsurance) {
        throw new BadRequestException('User already has an active insurance policy');
      }

      // Get the policy details from database
      const selectedPolicy = await this.policyModel.findOne({
        $or: [
          { _id: policyId },
          { policyId: policyId }
        ],
        status: 'active'
      });
      
      if (!selectedPolicy) {
        throw new BadRequestException(`Invalid or inactive policy ID: ${policyId}`);
      }

      // Validate subscription duration
      if (!this.validateDuration(selectedPolicy, startDate, endDate)) {
        throw new BadRequestException(
          `Invalid duration. Policy allows ${selectedPolicy.minDurationDays} to ${selectedPolicy.maxDurationMonths * 30} days`
        );
      }

      // Calculate premium based on daily rate and duration
      const calculatedPremium = this.calculatePremium(selectedPolicy, startDate, endDate, insuranceType);
      
      this.logger.log(`Calculated premium: ${calculatedPremium} for ${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))} days`);

      const policyDetails = {
        policyId: selectedPolicy.policyId,
        premium: calculatedPremium,
        coverage: selectedPolicy.coverage,
        dailyRate: selectedPolicy.dailyRate,
        actualDuration: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
      };

      // Check if user has sufficient balance
      const user = await this.userService.findById(userId);
      if (user.balance < policyDetails.premium) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${policyDetails.premium}, Available: $${user.balance}`
        );
      }

      // Find the insurance agent (prioritize provided agentId over policy.createdBy)
      let insuranceAgent: any = null;
      const targetAgentId = agentId || selectedPolicy.createdBy;
      
      if (targetAgentId) {
        try {
          insuranceAgent = await this.userService.findById(targetAgentId);
          
          // Verify the user is actually an insurance agent
          if (insuranceAgent && insuranceAgent.role !== 'insurance') {
            this.logger.warn(`User ${targetAgentId} is not an insurance agent (role: ${insuranceAgent.role})`);
            insuranceAgent = null;
          } else if (insuranceAgent) {
            this.logger.log(`✅ Found insurance agent: ${insuranceAgent.name} (${insuranceAgent.email})`);
          }
        } catch (error) {
          this.logger.warn(`Could not find insurance agent ${targetAgentId}: ${error.message}`);
        }
      }
      
      if (!insuranceAgent) {
        this.logger.warn('⚠️  No valid insurance agent found - premium will go to insurance pool');
      }

      // Deduct premium from user balance
      await this.userService.updateBalance(userId, -policyDetails.premium);
      
      // Credit the insurance agent's balance if found
      if (insuranceAgent) {
        const agentBalanceBefore = insuranceAgent.balance || 0;
        await this.userService.updateBalance(insuranceAgent._id, policyDetails.premium);
        
        // Verify agent balance was updated
        const agentAfterUpdate = await this.userService.findById(insuranceAgent._id);
        const agentBalanceAfter = agentAfterUpdate.balance || 0;
        
        this.logger.log(`💳 Agent Balance Update - Before: $${agentBalanceBefore}, After: $${agentBalanceAfter}, Expected: $${agentBalanceBefore + policyDetails.premium}`);
      }
      
      // Create a single transaction record that will appear for both parties
      await this.transactionService.createTransaction({
        fromUserId: userId,
        toUserId: insuranceAgent ? insuranceAgent._id : 'insurance_pool',
        amount: policyDetails.premium, // Positive amount for clarity
        type: 'premium_payment',
        description: `Premium payment for ${selectedPolicy.name} policy (${policyDetails.actualDuration} days)`,
        relatedId: selectedPolicy.policyId,
        metadata: {
          policyName: selectedPolicy.name,
          coverage: policyDetails.coverage,
          durationDays: policyDetails.actualDuration,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          subscriberEmail: user.email,
          agentEmail: insuranceAgent?.email
        }
      });

      if (insuranceAgent) {
        this.logger.log(`✅ Credited $${policyDetails.premium} to insurance agent ${insuranceAgent.email} (${insuranceAgent._id})`);
      }

      // Get appropriate coverage based on insurance type
      const coverageAmount = insuranceType === 'premium' 
        ? (selectedPolicy.premiumCoverage || selectedPolicy.coverage)
        : selectedPolicy.coverage;

      // Create insurance record with actual dates
      const insurance = new this.insuranceModel({
        userId,
        userEmail: user.email, // Store user email for subscribers table
        policyId: selectedPolicy.policyId,
        premium: policyDetails.premium,
        insuranceType: insuranceType, // Store insurance type
        coverage: coverageAmount, // Use appropriate coverage amount
        duration: policyDetails.actualDuration, // Store actual duration in days
        startDate: startDate,
        endDate: endDate, // Use the provided end date
        status: 'active',
        // Store agent information for claim routing
        agentId: insuranceAgent ? insuranceAgent._id?.toString() : undefined,
        agentName: insuranceAgent ? insuranceAgent.name : undefined,
        agentEmail: insuranceAgent ? insuranceAgent.email : undefined
      });

      const savedInsurance = await insurance.save();
      this.logger.log(`Policy subscription successful for user ${userId}`);

      return {
        success: true,
        insurance: savedInsurance,
        message: 'Successfully subscribed to insurance policy'
      };
    } catch (error) {
      this.logger.error(`Policy subscription failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelInsurancePolicy(userId: string) {
    try {
      this.logger.log(`=== STARTING POLICY CANCELLATION ===`);
      this.logger.log(`User ID: ${userId}`);
      this.logger.log(`User ID type: ${typeof userId}, length: ${userId?.length}`);

      // Validate userId format
      if (!userId || typeof userId !== 'string' || userId.length < 10) {
        throw new BadRequestException('Invalid user ID provided');
      }

      // Find active insurance policy for the user with more detailed logging
      this.logger.log(`Searching for active insurance policies for user: ${userId}`);
      
      const insurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      this.logger.log(`Insurance query result: ${insurance ? 'Found policy' : 'No policy found'}`);

      if (!insurance) {
        // Let's also check if there are any policies at all for this user
        const allUserPolicies = await this.insuranceModel.find({ userId });
        this.logger.warn(`No active insurance policy found for user ${userId}. Total policies for user: ${allUserPolicies.length}`);
        
        if (allUserPolicies.length > 0) {
          this.logger.log(`Existing policies statuses: ${allUserPolicies.map(p => p.status).join(', ')}`);
        }
        
        throw new NotFoundException('No active insurance policy found to cancel');
      }

      this.logger.log(`Found active policy: ${insurance._id}`);
      this.logger.log(`Policy premium: ${insurance.premium}`);

      // Calculate prorated refund amount based on remaining days
      const currentDate = new Date();
      const startDate = new Date(insurance.startDate);
      const endDate = new Date(insurance.endDate);
      
      // Check if policy has already expired
      if (currentDate > endDate) {
        throw new BadRequestException('Cannot cancel an expired policy. Policy ended on ' + endDate.toDateString());
      }
      
      // Use consistent millisecond conversion (1000 * 60 * 60 * 24)
      const msPerDay = 1000 * 60 * 60 * 24;
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
      const usedDays = Math.max(0, Math.ceil((currentDate.getTime() - startDate.getTime()) / msPerDay));
      const remainingDays = Math.max(0, totalDays - usedDays);
      
      // Ensure we don't have negative or zero total days
      if (totalDays <= 0) {
        throw new BadRequestException('Invalid policy duration');
      }
      
      // Calculate refund based on remaining days
      const dailyRate = (insurance.premium || 0) / totalDays;
      const refundAmount = Math.max(0, Math.round((dailyRate * remainingDays) * 100) / 100); // Round to 2 decimal places
      
      this.logger.log(`📅 Policy dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}, Current: ${currentDate.toISOString()}`);
      this.logger.log(`📊 Policy duration: ${totalDays} days, Used: ${usedDays} days, Remaining: ${remainingDays} days`);
      this.logger.log(`💰 Daily rate: $${dailyRate.toFixed(4)}, Original premium: $${insurance.premium}, Refund amount: $${refundAmount}`);

      // Update policy status to cancelled
      insurance.status = 'cancelled';
      insurance.cancellationDate = new Date();
      insurance.refundAmount = refundAmount;

      // Find the policy to get the insurance agent
      let insuranceAgent: any = null;
      try {
        const policy = await this.policyModel.findOne({ policyId: insurance.policyId });
        if (policy && policy.createdBy) {
          try {
            insuranceAgent = await this.userService.findById(policy.createdBy);
            this.logger.log(`Found insurance agent: ${insuranceAgent.email}`);
          } catch (error) {
            this.logger.warn(`Could not find insurance agent ${policy.createdBy}: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Could not find policy ${insurance.policyId}: ${error.message}`);
      }

      // Add refund to user balance if applicable
      if (refundAmount > 0) {
        this.logger.log(`Adding ${refundAmount} to user ${userId} balance`);
        
        try {
          // Get user balance before refund for verification
          const userBefore = await this.userService.findById(userId);
          const balanceBefore = userBefore.balance || 0;
          this.logger.log(`User balance before refund: $${balanceBefore}`);
          
          // Add the refund amount
          await this.userService.addBalance(userId, refundAmount);
          
          // Verify balance was updated
          const userAfter = await this.userService.findById(userId);
          const balanceAfter = userAfter.balance || 0;
          this.logger.log(`User balance after refund: $${balanceAfter}`);
          
          if (Math.abs(balanceAfter - (balanceBefore + refundAmount)) > 0.01) {
            this.logger.error(`❌ Balance verification failed! Expected: ${balanceBefore + refundAmount}, Got: ${balanceAfter}`);
            throw new InternalServerErrorException('Balance update verification failed');
          }

          // Debit the insurance agent's balance if found
          if (insuranceAgent) {
            const agentId = insuranceAgent._id || insuranceAgent.id;
            this.logger.log(`💳 Debiting $${refundAmount} from insurance agent ${insuranceAgent.email} (${agentId}) due to policy cancellation`);
            
            // Get agent balance before deduction for verification
            const agentBalanceBefore = insuranceAgent.balance || 0;
            
            // Check if agent has sufficient balance for refund
            if (agentBalanceBefore < refundAmount) {
              this.logger.warn(`⚠️ Agent has insufficient balance. Required: $${refundAmount}, Available: $${agentBalanceBefore}`);
              // Still proceed with deduction (can go negative) as it's a business requirement
            }
            
            await this.userService.deductBalance(agentId.toString(), refundAmount);
            
            // Verify agent balance was updated
            const agentAfterUpdate = await this.userService.findById(agentId.toString());
            const agentBalanceAfter = agentAfterUpdate.balance || 0;
            
            this.logger.log(`💳 Agent Balance Update - Before: $${agentBalanceBefore}, After: $${agentBalanceAfter}, Expected: $${agentBalanceBefore - refundAmount}`);
          } else {
            this.logger.warn(`⚠️ No insurance agent found for policy ${insurance.policyId} - refund will come from insurance pool`);
          }
          
          // Create a single transaction record for the refund that will be visible to both parties
          const transaction = await this.transactionService.createTransaction({
            fromUserId: insuranceAgent ? insuranceAgent._id : 'insurance_pool',
            toUserId: userId,
            amount: refundAmount,
            type: 'insurance_refund',
            description: `Policy cancellation refund for ${insurance.policyId} - ${remainingDays} days remaining`,
            relatedId: insurance.policyId,
            metadata: {
              originalPremium: insurance.premium,
              totalDays: totalDays,
              usedDays: usedDays,
              remainingDays: remainingDays,
              dailyRate: dailyRate,
              refundAmount: refundAmount,
              cancellationDate: new Date().toISOString(),
              agentId: insuranceAgent ? insuranceAgent._id : null,
              agentEmail: insuranceAgent ? insuranceAgent.email : null
            }
          });
          
          this.logger.log(`✅ Balance updated and transaction recorded successfully. Transaction ID: ${transaction.transactionId || transaction._id}`);
        } catch (balanceError) {
          this.logger.error(`❌ Failed to process refund: ${balanceError.message}`, balanceError.stack);
          throw new InternalServerErrorException(`Failed to process refund: ${balanceError.message}`);
        }
      } else {
        this.logger.log(`ℹ️  No refund amount to process (refundAmount: ${refundAmount})`);
      }

      // Save the updated insurance policy with explicit validation
      this.logger.log(`Saving updated insurance policy with status: ${insurance.status}`);
      
      try {
        const updatedPolicy = await insurance.save();
        this.logger.log(`✅ Policy saved successfully with ID: ${updatedPolicy._id}`);
        
        // Verify the save was successful
        const savedPolicy = await this.insuranceModel.findById(updatedPolicy._id);
        if (savedPolicy?.status !== 'cancelled') {
          this.logger.error(`❌ Policy status verification failed. Expected: 'cancelled', Got: '${savedPolicy?.status}'`);
          throw new InternalServerErrorException('Policy cancellation save verification failed');
        }
        
        this.logger.log(`✅ Policy cancellation completed and verified successfully`);

        return {
          success: true,
          policy: savedPolicy,
          refundAmount,
          refundDetails: {
            totalDays,
            usedDays,
            remainingDays,
            dailyRate,
            originalPremium: insurance.premium
          },
          message: `Policy cancelled successfully. Refunded $${refundAmount} for ${remainingDays} remaining days out of ${totalDays} total days.`
        };
        
      } catch (saveError) {
        this.logger.error(`❌ Failed to save policy cancellation: ${saveError.message}`, saveError.stack);
        throw new InternalServerErrorException(`Failed to complete policy cancellation: ${saveError.message}`);
      }

    } catch (error) {
      this.logger.error(`❌ Policy cancellation failed: ${error.message}`, error.stack);
      
      // Provide more specific error messages
      if (error.message.includes('Cast to ObjectId failed')) {
        throw new BadRequestException('Invalid user ID format');
      }
      
      if (error.message.includes('connection')) {
        throw new InternalServerErrorException('Database connection error. Please try again later.');
      }
      
      throw error;
    }
  }

  async submitClaim(userId: string, claimData: any) {
    try {
      // Check if user has active insurance
      const insurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      if (!insurance) {
        throw new BadRequestException('No active insurance policy found');
      }

      // Create claim (this would typically be in a separate claims collection)
      const claim = {
        userId,
        insuranceId: insurance._id,
        ...claimData,
        status: 'pending',
        submissionDate: new Date()
      };

      // Save claim (simplified for now)
      return {
        success: true,
        claim,
        message: 'Claim submitted successfully'
      };
    } catch (error) {
      this.logger.error(`Claim submission failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllPolicies() {
    try {
      this.logger.log('Fetching policies from database...');
      
      // Get policies from database only - no hardcoded fallback
      const policies = await this.policyModel.find({ status: 'active' }).exec();
      
      this.logger.log(`Found ${policies.length} active policies in database`);
      
      return policies;
    } catch (error) {
      this.logger.error(`Failed to fetch policies: ${error.message}`, error.stack);
      throw error;
    }
  }

  // The getPoliciesByAgent method has been moved to line ~1535

  async debugAllPolicies() {
    try {
      this.logger.log(`DEBUG: Fetching all policies in database`);
      
      const allPolicies = await this.policyModel.find({}).exec();
      
      this.logger.log(`DEBUG: Found ${allPolicies.length} total policies`);
      this.logger.log(`DEBUG: Policy breakdown:`, allPolicies.map(p => ({
        id: p._id,
        name: p.name,
        createdBy: p.createdBy,
        agentEmail: p.agentEmail || 'Not set',
        status: p.status,
        dailyRate: p.dailyRate,
        coverage: p.coverage
      })));
      
      return allPolicies;
    } catch (error) {
      this.logger.error(`Failed to debug all policies: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate premium based on policy daily rate and subscription duration
   */
  calculatePremium(policy: any, startDate: Date, endDate: Date, insuranceType: 'normal' | 'premium' = 'normal'): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Use appropriate daily rate based on insurance type
    const dailyRate = insuranceType === 'premium' 
      ? (policy.premiumDailyRate || policy.dailyRate * 1.5) // fallback to 1.5x if premium rate not set
      : policy.dailyRate;
    
    return dailyRate * daysDiff;
  }

  /**
   * Validate subscription duration against policy limits
   */
  validateDuration(policy: any, startDate: Date, endDate: Date): boolean {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const monthsDiff = Math.ceil(daysDiff / 30);

    return daysDiff >= policy.minDurationDays && monthsDiff <= policy.maxDurationMonths;
  }

  async getMyInsurance(userId: string) {
    try {
      this.logger.log(`🔍 Fetching latest insurance for user: ${userId}`);
      this.logger.log(`🔍 Current timestamp: ${new Date().toISOString()}`);
      
      // First, let's check ALL insurances for this user for debugging
      const allUserInsurances = await this.insuranceModel.find({ userId }).sort({ createdAt: -1 });
      this.logger.log(`📊 Total insurances for user ${userId}: ${allUserInsurances.length}`);
      allUserInsurances.forEach((ins, index) => {
        this.logger.log(`  ${index + 1}. ID: ${ins._id}, Status: ${ins.status}, Created: ${(ins as any).createdAt}, Updated: ${(ins as any).updatedAt}, End: ${ins.endDate}`);
      });
      
      // Fetch the most recent insurance policy for the user regardless of ANY status
      // Use explicit sorting with multiple criteria to ensure we get the absolute latest
      const insurance = await this.insuranceModel
        .findOne({ userId })
        .sort({ 
          createdAt: -1,
          _id: -1  // Use _id as final tiebreaker since it contains timestamp
        })
        .lean()  // Use lean() for better performance and to avoid caching
        .exec();

      this.logger.log(`📋 Insurance query result: ${insurance ? `Found policy with status: ${insurance.status}, ID: ${insurance._id}` : 'No insurance found'}`);
      
      if (insurance) {
        this.logger.log(`✅ SELECTED INSURANCE (most recent by createdAt): ${insurance._id} with status: ${insurance.status}`);
        this.logger.log(`📋 Selected insurance details:`, {
          id: insurance._id,
          status: insurance.status,
          startDate: insurance.startDate,
          endDate: insurance.endDate,
          createdAt: (insurance as any).createdAt,
          updatedAt: (insurance as any).updatedAt,
          premium: insurance.premium,
          duration: insurance.duration
        });

        // Check if active policy has expired and update status automatically
        if (insurance.status === 'active' && insurance.endDate) {
          const currentDate = new Date();
          const endDate = new Date(insurance.endDate);
          
          if (endDate < currentDate) {
            this.logger.log(`🔄 Policy has expired, updating status from 'active' to 'expired'...`);
            // Update the document in database since we used lean()
            await this.insuranceModel.findByIdAndUpdate(
              insurance._id,
              { status: 'expired' },
              { new: true }
            );
            // Update the local object for return
            insurance.status = 'expired';
            this.logger.log(`✅ Policy status updated to 'expired' in database`);
          }
        }
      }

      if (insurance) {
        // Fetch policy details to include both normal and premium rates
        const policy = await this.policyModel.findOne({ policyId: insurance.policyId });
        
        if (policy) {
          // Return insurance with complete policy details (insurance is already a plain object from lean())
          return {
            ...insurance,
            policyDetails: {
              name: policy.name,
              dailyRate: policy.dailyRate, // Normal daily rate
              premiumDailyRate: policy.premiumDailyRate, // Premium daily rate
              monthlyPremium: policy.monthlyPremium, // Normal monthly premium
              premiumMonthlyPremium: policy.premiumMonthlyPremium, // Premium monthly premium
              coverage: policy.coverage, // Normal coverage
              premiumCoverage: policy.premiumCoverage, // Premium coverage
              description: policy.description,
              type: policy.type
            }
          };
        }
      }

      // Format the response to ensure consistent structure
      const formattedResponse = insurance ? {
        ...insurance,
        // Always include the insurance object with standardized fields
        insurance: {
          status: insurance.status || 'unknown',
          coverageAmount: insurance.coverage || 0,
          validFrom: insurance.startDate || null,
          validUntil: insurance.endDate || null,
          premium: insurance.premium || 0,
          policyType: insurance.insuranceType || 'standard'
        }
      } : null;
      
      this.logger.log(`🔍 Final insurance result: ${insurance ? `Status: ${insurance.status}, ID: ${insurance._id}` : 'No insurance found'}`);
      this.logger.log(`📦 Formatted response: ${JSON.stringify(formattedResponse)}`);
      
      return formattedResponse;
    } catch (error) {
      this.logger.error(`Failed to fetch user insurance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInsuranceByEmail(email: string) {
    try {
      this.logger.log(`🔍 Fetching latest insurance for email: ${email}`);
      
      // First find the user by email
      const user = await this.userModel.findOne({ email }).lean();
      if (!user) {
        this.logger.log(`⚠️ No user found with email: ${email}`);
        return null;
      }
      
      const userId = user._id.toString();
      this.logger.log(`🔍 Found user with ID: ${userId} for email: ${email}`);
      
      const now = new Date();
      this.logger.log(`📅 Current date: ${now.toISOString()}`);
      
      // First try to find an active policy within its date range
      let insurance = await this.insuranceModel
        .findOne({ 
          userId, 
          status: 'active',
          startDate: { $lte: now },  // Start date is in the past or today
          endDate: { $gte: now }     // End date is in the future or today
        })
        .sort({ 
          createdAt: -1,
          _id: -1  // Use _id as final tiebreaker since it contains timestamp
        })
        .lean()
        .exec();
        
      if (insurance) {
        this.logger.log(`✅ Found active insurance policy within date range for ${email}`);
      } else {
        // If no active policy found within date range, get the latest one
        this.logger.log(`⚠️ No active in-range policy found for ${email}, fetching latest policy`);
        
        insurance = await this.insuranceModel
          .findOne({ userId })
          .sort({ 
            createdAt: -1,
            _id: -1  // Use _id as final tiebreaker since it contains timestamp
          })
          .lean()
          .exec();
      }
        
      if (!insurance) {
        this.logger.log(`⚠️ No insurance policy found for user ${userId} (email: ${email})`);
        return null;
      }
      
      this.logger.log(`✅ Found insurance policy for ${email}, ID: ${insurance._id}, Status: ${insurance.status}`);
      
      // Fetch the policy details from the policies collection
      if (insurance.policyId) {
        const policyDetails = await this.policyModel.findOne({ policyId: insurance.policyId }).lean();
        
        if (policyDetails) {
          this.logger.log(`✅ Found policy details for policy ID: ${insurance.policyId}`);
          
          // Check if the policy is currently valid based on dates
          const now = new Date();
          const startDate = insurance.startDate ? new Date(insurance.startDate) : null;
          const endDate = insurance.endDate ? new Date(insurance.endDate) : null;
          
      let timeStatus = 'unknown';
      let daysRemaining: number | null = null;
      
      if (startDate && endDate) {
        if (now < startDate) {
          timeStatus = 'future';
        } else if (now > endDate) {
          timeStatus = 'expired';
        } else {
          timeStatus = 'active';
          daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
      }          this.logger.log(`📊 Policy time status: ${timeStatus}, days remaining: ${daysRemaining}`);
          
          // Format response with complete information
          const formattedResponse = {
            ...insurance,
            insurance: {
              status: insurance.status || 'unknown',
              coverageAmount: insurance.coverage || policyDetails.coverage || 0,
              validFrom: insurance.startDate || null,
              validUntil: insurance.endDate || null,
              premium: insurance.premium || 0,
              policyType: insurance.insuranceType || 'standard',
              timeStatus,
              daysRemaining: daysRemaining || null,
              fetchedAt: new Date().toISOString()
            },
            policyDetails: {
              name: policyDetails.name,
              coverage: policyDetails.coverage,
              premiumRate: policyDetails.dailyRate || 0,
              description: policyDetails.description,
              type: policyDetails.type,
              duration: policyDetails.durationMonths || policyDetails.maxDurationMonths
            }
          };
          
          this.logger.log(`📦 Formatted response with policy details`);
          return formattedResponse;
        } else {
          this.logger.log(`⚠️ Policy details not found for policy ID: ${insurance.policyId}`);
        }
      }
      
      // Check if the policy is currently valid based on dates
      // Reuse the existing 'now' variable from above
      const startDate = insurance?.startDate ? new Date(insurance.startDate) : null;
      const endDate = insurance?.endDate ? new Date(insurance.endDate) : null;
      
      let timeStatus = 'unknown';
      let daysRemaining: number | null = null;
      
      if (startDate && endDate) {
        if (now < startDate) {
          timeStatus = 'future';
        } else if (now > endDate) {
          timeStatus = 'expired';
        } else {
          timeStatus = 'active';
          daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      
      this.logger.log(`📊 Policy time status: ${timeStatus}, days remaining: ${daysRemaining}`);
      
      // Return insurance with basic structure if policy details not available
      return {
        ...insurance,
        insurance: {
          status: insurance?.status || 'unknown',
          coverageAmount: insurance?.coverage || 0, // Corrected property name
          validFrom: insurance?.startDate || null,
          validUntil: insurance?.endDate || null,
          premium: insurance?.premium || 0,
          policyType: insurance?.insuranceType || 'standard', // Corrected property name
          timeStatus,
          daysRemaining: daysRemaining || null, // Ensure null instead of undefined
          fetchedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Failed to fetch insurance by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMyClaims(userId: string) {
    try {
      // Return empty array for now as claims would be in separate collection
      return [];
    } catch (error) {
      this.logger.error(`Failed to fetch user claims: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getDashboardData() {
    try {
      this.logger.log('Fetching insurance dashboard data...');

      // Get policies (these are hardcoded, so they should work)
      const allPolicies = await this.getAllPolicies();
      
      // Try to get insurances from database, with fallback
      let allInsurances: any[] = [];
      try {
        allInsurances = await this.insuranceModel.find({}).populate('userId', 'name email role').exec();
        this.logger.log(`Found ${allInsurances.length} insurance records`);
      } catch (dbError) {
        this.logger.warn('Could not fetch insurances from database, using empty array');
        allInsurances = [];
      }

      // For now, use empty claims array (would come from separate claims collection)
      const allClaims = [];

      const stats = {
        totalPolicies: allPolicies.length,
        activePolicies: allInsurances.filter(i => i.status === 'active').length,
        totalClaims: allClaims.length,
        pendingClaims: allClaims.filter((c: any) => c.status === 'pending').length
      };

      this.logger.log(`Dashboard stats: ${JSON.stringify(stats)}`);

      return {
        policies: allPolicies,
        claims: allClaims,
        insurances: allInsurances,
        stats
      };
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard data: ${error.message}`, error.stack);
      
      // Return fallback data instead of throwing
      return {
        policies: [
          {
            _id: '1',
            name: 'Basic Coverage',
            premium: 100,
            coverage: 1000,
            duration: 12,
            description: 'Basic insurance coverage for agricultural products'
          }
        ],
        claims: [],
        insurances: [],
        stats: {
          totalPolicies: 1,
          activePolicies: 0,
          totalClaims: 0,
          pendingClaims: 0
        }
      };
    }
  }

  async createPolicy(policyData: any, createdBy: string) {
    try {
      this.logger.log(`Creating new policy: ${policyData.name} by user: ${createdBy}`);
      this.logger.log(`Policy data received:`, JSON.stringify(policyData, null, 2));
      
      // Get the agent's email from userId
      const agent = await this.userService.findById(createdBy);
      if (!agent) {
        throw new BadRequestException('Agent not found');
      }
      
      this.logger.log(`Policy being created by agent: ${agent.email} (${agent.role})`);
      
      // Check if policy with same policyId already exists
      const existingPolicy = await this.policyModel.findOne({ policyId: policyData.policyId });
      if (existingPolicy) {
        throw new BadRequestException(`Policy with ID ${policyData.policyId} already exists`);
      }

      // Validate required fields for new schema
      if (!policyData.dailyRate || !policyData.premiumDailyRate || !policyData.coverage || !policyData.premiumCoverage || !policyData.maxDurationMonths || !policyData.minDurationDays) {
        throw new BadRequestException('Missing required fields: dailyRate, premiumDailyRate, coverage, premiumCoverage, maxDurationMonths, or minDurationDays');
      }

      // Calculate monthly premiums if not provided
      const calculatedMonthlyPremium = policyData.monthlyPremium || (policyData.dailyRate * 30);
      const calculatedPremiumMonthlyPremium = policyData.premiumMonthlyPremium || (policyData.premiumDailyRate * 30);

      // Log all the premium-related fields to debug
      this.logger.log(`Premium Daily Rate: ${policyData.premiumDailyRate}`);
      this.logger.log(`Premium Coverage: ${policyData.premiumCoverage}`);
      this.logger.log(`Premium Monthly Premium: ${calculatedPremiumMonthlyPremium}`);

      // Create new policy with explicit field mapping including agent email
      const newPolicy = new this.policyModel({
        policyId: policyData.policyId,
        name: policyData.name,
        description: policyData.description,
        dailyRate: policyData.dailyRate,
        premiumDailyRate: policyData.premiumDailyRate,
        monthlyPremium: calculatedMonthlyPremium,
        premiumMonthlyPremium: calculatedPremiumMonthlyPremium,
        coverage: policyData.coverage,
        premiumCoverage: policyData.premiumCoverage,
        durationMonths: policyData.durationMonths || 12, // Default to 12 if not provided
        maxDurationMonths: policyData.maxDurationMonths,
        minDurationDays: policyData.minDurationDays,
        type: policyData.type,
        status: policyData.status || 'active',
        coverageItems: policyData.coverageItems || [],
        terms: policyData.terms || '',
        createdBy: createdBy,
        agentEmail: agent.email
      });

      const savedPolicy = await newPolicy.save();
      this.logger.log(`Policy created successfully: ${savedPolicy.policyId} by ${agent.email}`);

      return {
        success: true,
        message: 'Policy created successfully',
        policy: savedPolicy
      };
    } catch (error) {
      this.logger.error(`Policy creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // This processClaim implementation has been removed to avoid duplication.
  // See the complete implementation at line ~1044

  async payPremium(userId: string, policyId: string, amount: number) {
    try {
      this.logger.log(`Processing premium payment for user ${userId}, policy ${policyId}, amount ${amount}`);

      // Find the user's active insurance policy
      const insurance = await this.insuranceModel.findOne({
        userId,
        policyId,
        status: 'active'
      });

      if (!insurance) {
        throw new BadRequestException('No active insurance policy found for this user and policy');
      }

      // Check if user has sufficient balance
      const user = await this.userService.findById(userId);
      if (user.balance < amount) {
        throw new BadRequestException('Insufficient balance to pay premium');
      }

      // Deduct premium from user balance
      await this.userService.updateBalance(userId, -amount);

      // Create transaction record
      const transaction = await this.transactionService.createTransaction({
        fromUserId: userId,
        toUserId: 'insurance_pool',
        amount: -amount,
        type: 'premium_payment',
        description: `Premium payment for policy ${policyId}`,
        relatedId: policyId,
        metadata: {
          policyId,
          paymentDate: new Date().toISOString()
        }
      });

      this.logger.log(`Premium payment completed successfully for user ${userId}`);

      return {
        success: true,
        transaction: {
          transactionId: transaction.transactionId,
          amount,
          type: transaction.type,
          status: transaction.status,
          description: transaction.description,
          createdAt: transaction.createdAt
        },
        remainingBalance: user.balance - amount,
        message: 'Premium payment processed successfully'
      };

    } catch (error) {
      this.logger.error(`Premium payment failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deletePolicy(policyId: string, userId: string): Promise<Policy> {
    try {
      this.logger.log(`Deleting policy ${policyId} by user ${userId}`);

      // Find the policy
      const policy = await this.policyModel.findOne({
        $or: [
          { _id: policyId },
          { policyId: policyId }
        ]
      });

      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      // Check if any users have active insurances for this policy
      const activeInsurances = await this.insuranceModel.find({
        policyId: policy.policyId,
        status: 'active'
      });

      if (activeInsurances.length > 0) {
        throw new BadRequestException('Cannot delete policy with active subscriptions');
      }

      // Delete the policy
      await this.policyModel.findByIdAndDelete(policy._id);
      
      this.logger.log(`✅ Policy ${policyId} deleted successfully`);
      return policy;

    } catch (error) {
      this.logger.error(`❌ Failed to delete policy: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInsuranceAgents(): Promise<User[]> {
    try {
      this.logger.log('🔍 Fetching all insurance agents');
      
      // First, let's see all users to debug
      const allUsers = await this.userModel.find({}, { name: 1, email: 1, role: 1, _id: 1 }).exec();
      this.logger.log(`Total users in database: ${allUsers.length}`);
      this.logger.log(`User roles found: ${[...new Set(allUsers.map(u => u.role))].join(', ')}`);
      
      const agents = await this.userModel.find(
        { role: 'insurance' },
        { name: 1, email: 1, _id: 1, balance: 1 }
      ).exec();
      
      this.logger.log(`✅ Found ${agents.length} insurance agents`);
      if (agents.length > 0) {
        agents.forEach(agent => {
          this.logger.log(`Agent: ${agent.name} (${agent.email}) - Balance: $${agent.balance || 0}`);
        });
      } else {
        this.logger.warn('⚠️  No users with role "insurance" found in database');
      }
      return agents;
      
    } catch (error) {
      this.logger.error(`❌ Failed to fetch insurance agents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch insurance agents');
    }
  }

  async testTransactionCreation(transactionData: any) {
    try {
      this.logger.log('🧪 Testing transaction creation with data:', JSON.stringify(transactionData));
      
      // Test if the transaction service can create a transaction with insurance_refund type
      const transaction = await this.transactionService.createTransaction(transactionData);
      
      this.logger.log('✅ Test transaction created successfully:', transaction);
      return transaction;
      
    } catch (error) {
      this.logger.error(`❌ Test transaction creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async debugListAllUsers(): Promise<any[]> {
    try {
      this.logger.log('🔍 Debug: Fetching all users for role analysis');
      
      const users = await this.userModel.find(
        {},
        { name: 1, email: 1, role: 1, _id: 1, balance: 1 }
      ).exec();
      
      this.logger.log(`📊 Total users in database: ${users.length}`);
      
      // Group users by role for analysis
      const roleGroups = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      this.logger.log('👥 Users by role:', roleGroups);
      
      // List insurance agents specifically
      const insuranceAgents = users.filter(u => u.role === 'insurance');
      this.logger.log(`🏢 Insurance agents found: ${insuranceAgents.length}`);
      insuranceAgents.forEach(agent => {
        this.logger.log(`  - ${agent.name} (${agent.email}) - ID: ${agent._id}`);
      });
      
      return users;
      
    } catch (error) {
      this.logger.error(`❌ Failed to debug users: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Insurance Claims Methods
  async createClaim(sellerId: string, sellerEmail: string, sellerName: string, claimData: any) {
    try {
      // Validate and extract claim data with defaults for missing values
      const complaintId = claimData.complaintId || `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderId = claimData.orderId || `ORD-${Date.now()}`;
      const productId = claimData.productId || '';
      const productName = claimData.productName || 'Unnamed Product';
      const quantity = parseInt(claimData.quantity || claimData.quantityAffected || '1', 10) || 1;
      const price = parseFloat(claimData.price || claimData.pricePerUnit || '0') || 0;
      const buyerId = claimData.buyerId || 'unknown-buyer';
      const buyerName = claimData.buyerName || 'Unknown Buyer';
      const buyerEmail = claimData.buyerEmail || 'unknown@example.com';
      const orderDate = claimData.orderDate || new Date().toISOString();
      const dispatchDate = claimData.dispatchDate || new Date().toISOString();
      const complaintDate = claimData.complaintDate || new Date().toISOString();
      const description = claimData.description || 'No description provided';
      const forwardToAgent = claimData.forwardToAgent !== undefined ? claimData.forwardToAgent : true;
      
      this.logger.log(`Processing claim for order ${orderId}, product ${productName}, quantity ${quantity}, price ${price}`);
      this.logger.log(`Forward to agent: ${forwardToAgent ? 'Yes' : 'No'}`);
      

      // Check if seller has an active insurance policy
      this.logger.log(`Checking for active insurance policy for seller ${sellerId}`);
      let activeInsurance = await this.insuranceModel.findOne({ 
        userId: sellerId,
        status: 'active'
      });

      if (!activeInsurance) {
        // If no active policy found, get the most recent insurance policy as fallback
        this.logger.warn(`No active insurance policy found for seller ${sellerId}, checking for any policy`);
        const anyInsurance = await this.insuranceModel
          .findOne({ userId: sellerId })
          .sort({ createdAt: -1 });

        if (anyInsurance) {
          this.logger.log(`Found non-active insurance policy: ${anyInsurance._id} with status ${anyInsurance.status}`);
          activeInsurance = anyInsurance;
        } else {
          this.logger.error(`No insurance policy found for seller ${sellerId}`);
          throw new BadRequestException('You do not have an active insurance policy to make a claim');
        }
      }

      this.logger.log(`Found insurance policy ${activeInsurance._id} with status ${activeInsurance.status}`);
      

      // Safely handle dates
      const dispatchDateObj = new Date(dispatchDate || new Date().toISOString());
      
      // Safely get insurance dates with fallbacks
      let startDate = new Date();
      let endDate = new Date();
      
      // Set up start date safely
      if (activeInsurance.startDate) {
        startDate = new Date(activeInsurance.startDate);
      } else {
        this.logger.warn('No start date in insurance record, using current date');
      }
      
      // Set up end date safely
      if (activeInsurance.endDate) {
        endDate = new Date(activeInsurance.endDate);
      } else {
        // Default to 30 days if no duration specified
        const duration = activeInsurance.duration || 30;
        endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
        this.logger.warn(`No end date in insurance record, calculated end date: ${endDate.toISOString()}`);
      }
      
      this.logger.log(`Dispatch date: ${dispatchDateObj.toISOString()}`);
      this.logger.log(`Insurance period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Check dispatch date against insurance period (but continue anyway)
      if (dispatchDateObj < startDate || dispatchDateObj > endDate) {
        this.logger.warn('Dispatch date is outside insurance coverage period, but allowing claim');
        // Instead of throwing an error, we'll just log a warning and continue
        // This allows users to file claims even for borderline cases
      }

      // Check if a claim already exists for this complaint
      const existingClaim = await this.insuranceClaimModel.findOne({ complaintId });
      if (existingClaim) {
        throw new BadRequestException('A claim has already been filed for this complaint');
      }

      // Create a unique claim ID
      const claimId = `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initialize policy variables
      let policyId = '';
      let policyDetails: any = null;
      
      // Check if policyId exists in the insurance record
      if (activeInsurance.policyId) {
        policyId = activeInsurance.policyId;
        this.logger.log(`Looking up policy with ID: ${policyId}`);
        
        try {
          const foundPolicy = await this.policyModel.findOne({ policyId });
          if (foundPolicy) {
            policyDetails = foundPolicy;
            this.logger.log(`Found policy: ${policyDetails.name || 'Unnamed policy'}`);
          } else {
            this.logger.warn(`Policy with ID ${policyId} not found in database`);
          }
        } catch (policyError) {
          this.logger.error(`Error looking up policy: ${policyError.message}`);
        }
      } else {
        this.logger.warn('No policyId found in insurance record, will try fallback');
      }
      
      // If policy not found, try to find any policy
      if (!policyDetails) {
        this.logger.warn(`Policy not found or not available, looking for any policy`);
        
        try {
          const anyPolicy = await this.policyModel.findOne({});
          
          if (anyPolicy) {
            policyDetails = anyPolicy;
            policyId = anyPolicy.policyId;
            this.logger.log(`Found fallback policy: ${policyId}`);
            
            // Update the insurance record with this policy ID for future reference
            try {
              await this.insuranceModel.findByIdAndUpdate(
                activeInsurance._id,
                { policyId }
              );
              this.logger.log(`Updated insurance record with policy ID: ${policyId}`);
            } catch (updateError) {
              this.logger.error(`Failed to update insurance with policy ID: ${updateError.message}`);
            }
          } else {
            this.logger.warn('No policies found in the system');
            policyId = 'default-policy';
          }
        } catch (fallbackError) {
          this.logger.error(`Error finding fallback policy: ${fallbackError.message}`);
          policyId = 'default-policy';
        }
      }
      
      // Get agent ID from policy if available
      let agentId = policyDetails?.createdBy ? policyDetails.createdBy.toString() : null;
      
      // If no agent ID found from policy, search for any insurance agent
      if (!agentId) {
        this.logger.warn('No agent ID found from policy, searching for any insurance agent');
        
        try {
          const anyAgent = await this.userModel.findOne({ role: 'insurance' });
          
          if (anyAgent) {
            agentId = anyAgent._id.toString();
            this.logger.log(`Found fallback agent: ${agentId}`);
          } else {
            this.logger.warn('No insurance agents found in system');
            agentId = 'default-agent-id';
          }
        } catch (agentError) {
          this.logger.error(`Error finding insurance agent: ${agentError.message}`);
          agentId = 'default-agent-id';
        }
      }

      // Ensure we have an agent ID - use a default if all else fails
      if (!agentId) {
        this.logger.warn('No agent ID found after all attempts, using default');
        agentId = 'default-agent-id';
      }
      
      // Add additional logging about the policy and agent
      this.logger.log(`Creating claim with policy: ${policyId}, agent: ${agentId}`);
      
      // Calculate total amount
      const totalAmount = price * quantity;
      
      // Determine status based on forwardToAgent flag
      const claimStatus = forwardToAgent ? 'forwarded_to_agent' : 'pending';
        
      // Create the claim document with all necessary fields and safe fallbacks
      const newClaim = new this.insuranceClaimModel({
        claimId,
        complaintId,
        orderId,
        productId,
        productName,
        quantity,
        price,
        totalAmount,
        sellerId,
        sellerName,
        sellerEmail,
        buyerId,
        buyerName, 
        buyerEmail,
        insuranceId: activeInsurance._id ? activeInsurance._id.toString() : 'unknown-insurance-id',
        policyId: policyId,  // Use the safely determined policy ID
        agentId: agentId,    // Use the safely determined agent ID
        orderDate,
        dispatchDate,
        complaintDate,
        claimDate: new Date().toISOString(),
        claimReason: 'customer_complaint',
        description,
        status: claimStatus,
        forwardedToAgent: forwardToAgent || false,
        forwardedDate: forwardToAgent ? new Date().toISOString() : null
      });

      await newClaim.save();

      this.logger.log(`📋 Claim ${claimId} created with status: ${claimStatus}${forwardToAgent ? ' and forwarded to insurance agent' : ''}`);

      return {
        success: true,
        message: forwardToAgent ? 'Claim forwarded to your insurance agent for review' : 'Claim filed successfully',
        claim: newClaim,
        forwardedToAgent: forwardToAgent || false
      };
    } catch (error) {
      // Add detailed error information
      this.logger.error(`Failed to create insurance claim: ${error.message}`, error.stack);
      
      try {
        // Log as much context as possible
        this.logger.error('Error context:', { 
          sellerId, 
          sellerEmail,
          complaintId: claimData?.complaintId || 'unknown',
          orderId: claimData?.orderId || 'unknown',
          errorName: error.name || 'Unknown error',
          errorMessage: error.message || 'No message'
        });
      } catch (logError) {
        this.logger.error('Failed to log error context');
      }

      // Return a specific error based on the type of failure
      if (error instanceof BadRequestException) {
        // Pass through existing BadRequestExceptions
        throw error;
      } else if (error.message?.includes('policy')) {
        throw new BadRequestException('Cannot file claim: Please contact the insurance administrator to set up your policy.');
      } else if (error.message?.includes('database') || error.message?.includes('mongo')) {
        throw new BadRequestException('Cannot file claim: Database error. Please try again later.');
      } else if (error.message?.includes('schema') || error.message?.includes('validation')) {
        throw new BadRequestException('Cannot file claim: Invalid claim data. Please check your information and try again.');
      } else {
        // Generic error message that doesn't expose internal details
        throw new BadRequestException('Unable to process your claim at this time. Please try again later.');
      }
    }
  }

  async getSellerClaims(sellerId: string) {
    try {
      const claims = await this.insuranceClaimModel.find({ sellerId }).sort({ claimDate: -1 });
      this.logger.log(`Found ${claims.length} claims for seller ${sellerId}`);
      return claims;
    } catch (error) {
      this.logger.error(`Failed to get seller claims: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async getBuyerClaims(buyerId: string) {
    try {
      this.logger.log(`Fetching claims for buyer: ${buyerId}`);
      const claims = await this.insuranceClaimModel.find({ buyerId }).sort({ claimDate: -1 });
      this.logger.log(`Found ${claims.length} claims for buyer ${buyerId}`);
      return claims;
    } catch (error) {
      this.logger.error(`Failed to get buyer claims: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInsuranceAgentClaims(agentId: string) {
    try {
      this.logger.log(`📋 Fetching claims for agent: ${agentId}`);
      
      // Find agent details first to get email
      const agent = await this.userModel.findById(agentId);
      
      if (!agent) {
        this.logger.warn(`⚠️ Agent not found with ID: ${agentId}`);
        return [];
      }
      
      this.logger.log(`🧑‍💼 Found agent: ${agent.name} (${agent.email})`);
      
      // Find all policies created by this agent
      const agentPolicies = await this.policyModel.find({ 
        $or: [
          { agentId: agentId },
          { createdBy: agentId },
          { agentEmail: agent.email }
        ]
      });
      
      this.logger.log(`📝 Found ${agentPolicies.length} policies associated with agent`);
      
      // Get policy IDs
      const policyIds = agentPolicies.map(policy => policy.policyId);
      
      // Find all insurances using these policies
      const insurances = await this.insuranceModel.find({
        policyId: { $in: policyIds }
      });
      
      this.logger.log(`🛡️ Found ${insurances.length} active insurance subscriptions for agent's policies`);
      
      // Enhanced query to find claims:
      // 1. Claims explicitly assigned to this agent
      // 2. Claims for policies this agent created
      // 3. Claims where agentEmail matches
      // 4. Claims from insurances this agent created
      // 5. Claims forwarded to agent
      const claims = await this.insuranceClaimModel.find({
        $or: [
          { agentId: agentId },
          { processingAgentId: agentId },
          { insuranceAgentId: agentId }, // Claims forwarded to this specific agent
          { policyId: { $in: policyIds } },
          { agentEmail: agent.email },
          { status: 'forwarded_to_agent', insuranceAgentId: agentId }, // Specifically forwarded claims
          // Add an explicit check for seller's policies
          { 
            policyId: { 
              $in: insurances.map(i => i.policyId) 
            } 
          }
        ]
      }).sort({ claimDate: -1 });
      
      this.logger.log(`📊 Found ${claims.length} total claims for agent ${agentId}`);
      
      // For debugging, log the status distribution
      const statusCounts = claims.reduce((acc, claim) => {
        acc[claim.status] = (acc[claim.status] || 0) + 1;
        return acc;
      }, {});
      
      this.logger.log(`📊 Status distribution: ${JSON.stringify(statusCounts)}`);
      
      return claims;
      
      this.logger.log(`Status distribution: ${JSON.stringify(statusCounts)}`);
      
      return claims;
    } catch (error) {
      this.logger.error(`Failed to get agent claims: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getClaimById(claimId: string, userId: string) {
    try {
      const claim = await this.insuranceClaimModel.findOne({ claimId });
      
      if (!claim) {
        throw new NotFoundException('Claim not found');
      }
      
      // Check if the user is the seller, agent for the policy, or admin
      const userIsAdmin = await this.userModel.findOne({ _id: userId, role: 'admin' });
      const userIsInsuranceAgent = await this.userModel.findOne({ _id: userId, role: 'insurance' });
      
      if (claim.sellerId !== userId && !userIsAdmin && !userIsInsuranceAgent) {
        throw new ForbiddenException('You do not have permission to view this claim');
      }
      
      return claim;
    } catch (error) {
      this.logger.error(`Failed to get claim: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processClaim(claimId: string, agentId: string, agentName: string, status: string, comments?: string) {
    try {
      const claim = await this.insuranceClaimModel.findOne({ claimId });
      
      if (!claim) {
        throw new NotFoundException('Claim not found');
      }
      
      // Check if the agent is authorized to process this claim
      const agent = await this.userModel.findById(agentId);
      if (!agent || agent.role !== 'insurance') {
        throw new ForbiddenException('Only insurance agents can process claims');
      }
      
      // Get policy to verify agent is responsible for it
      const policy = await this.policyModel.findOne({ policyId: claim.policyId });
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }
      
      if (policy.createdBy !== agentId) {
        throw new ForbiddenException('You can only process claims for policies you created');
      }
      
      // Update claim status
      claim.status = status;
      claim.comments = comments || '';
      claim.processingAgentId = agentId;
      claim.processingAgentName = agentName;
      claim.processingDate = new Date().toISOString();
      
      // If claim is approved, process the refund
      if (status === 'approved') {
        await this.processClaimRefund(claim);
      }
      
      await claim.save();
      
      return {
        success: true,
        message: `Claim ${status}`,
        claim
      };
    } catch (error) {
      this.logger.error(`Failed to process claim: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processClaimRefund(claimIdOrObject: string | any, agentId?: string) {
    try {
      this.logger.log(`Processing claim refund for ID: ${typeof claimIdOrObject === 'string' ? claimIdOrObject : 'Object'}`);
      let claim;
      
      // Handle both claimId string and claim object
      if (typeof claimIdOrObject === 'string') {
        claim = await this.insuranceClaimModel.findOne({ 
          $or: [
            { claimId: claimIdOrObject },
            { _id: claimIdOrObject }
          ]
        });
        
        if (!claim) {
          throw new NotFoundException(`Claim not found with ID: ${claimIdOrObject}`);
        }
        
        // Verify agent has permission to refund this claim
        if (agentId) {
          this.logger.log(`Verifying agent ${agentId} has permission for this claim`);
          const policy = await this.policyModel.findOne({ policyId: claim.policyId });
          if (!policy) {
            throw new NotFoundException(`Policy not found with ID: ${claim.policyId}`);
          }
          
          if (policy.createdBy !== agentId) {
            this.logger.warn(`Agent ${agentId} attempting to refund claim for policy created by ${policy.createdBy}`);
            throw new ForbiddenException('You can only refund claims for policies you created');
          }
        }
      } else {
        claim = claimIdOrObject;
      }
      
      // Check if already refunded
      if (claim.status === 'refunded') {
        throw new BadRequestException('This claim has already been refunded');
      }
      
      // Mark the refund date
      claim.refundDate = new Date().toISOString();
      
      // Find the seller's insurance
      const insurance = await this.insuranceModel.findOne({ 
        $or: [
          { _id: claim.insuranceId },
          { userId: claim.sellerId, status: 'active' }
        ]
      });
      
      if (!insurance) {
        this.logger.warn(`Insurance policy not found for seller ${claim.sellerId} or ID ${claim.insuranceId}`);
        throw new BadRequestException('Insurance policy not found or not active');
      }
      
      // Find the agent responsible for the policy
      // First try to get agent from the claim itself (added during claim filing)
      let agent: any = null;
      
      if (claim.agentId || claim.processingAgentId) {
        const agentId = claim.agentId || claim.processingAgentId;
        agent = await this.userModel.findOne({ _id: agentId, role: 'insurance' });
        if (agent) {
          this.logger.log(`✅ Found agent from claim record: ${agent.name} (${agent._id})`);
        }
      }
      
      // If no agent in claim, try from insurance record
      if (!agent && (insurance as any).agentId) {
        agent = await this.userModel.findOne({ _id: (insurance as any).agentId, role: 'insurance' });
        if (agent) {
          this.logger.log(`✅ Found agent from insurance record: ${agent.name} (${agent._id})`);
        }
      }
      
      // If still no agent, try to find the policy template and get agent from there
      if (!agent) {
        const policy = await this.policyModel.findOne({ 
          $or: [
            { policyId: claim.policyId },
            { policyId: insurance.policyId }
          ] 
        });
        
        if (policy && policy.createdBy) {
          agent = await this.userModel.findOne({ _id: policy.createdBy, role: 'insurance' });
          if (agent) {
            this.logger.log(`✅ Found agent from policy template: ${agent.name} (${agent._id})`);
          }
        }
      }
      
      // As last resort, find any insurance agent
      if (!agent) {
        this.logger.warn(`No agent found through normal channels, finding any available insurance agent`);
        agent = await this.userModel.findOne({ role: 'insurance' });
        if (agent) {
          this.logger.log(`✅ Using fallback agent: ${agent.name} (${agent._id})`);
        }
      }
      
      if (!agent) {
        this.logger.warn(`No insurance agent found in the system`);
        throw new BadRequestException('Insurance agent not found');
      }
      
      this.logger.log(`Processing refund: Buyer ID: ${claim.buyerId}, Amount: ${claim.totalAmount}`);
      this.logger.log(`Insurance agent: ${agent.name} (${agent._id})`);
      
      // Process refund to BUYER (not seller) as per requirement
      const refundAmount = claim.claimAmount || claim.totalAmount;
      
      // Start a transaction to ensure all balance updates succeed or fail together
      let buyerBalanceUpdated = false;
      let agentBalanceUpdated = false;
      let transactionCreated = false;
      
      try {
        // 1. Add balance to buyer
        await this.userService.addBalance(claim.buyerId, refundAmount);
        buyerBalanceUpdated = true;
        this.logger.log(`✅ Added ${refundAmount} to buyer ${claim.buyerId} balance`);
        
        // 2. Deduct from agent's balance
        await this.userService.deductBalance(agent._id.toString(), refundAmount);
        agentBalanceUpdated = true;
        this.logger.log(`✅ Deducted ${refundAmount} from agent ${agent._id} balance`);
        
        // 3. Create transaction record
        await this.transactionService.createTransaction({
          fromUserId: agent._id.toString(),
          toUserId: claim.buyerId, // Refund to buyer
          amount: refundAmount,
          type: 'order_refund',
          description: `Insurance claim refund for ${claim.productName} - Order: ${claim.orderId}`,
          relatedId: claim.claimId,
          metadata: {
            claimId: claim.claimId,
            orderId: claim.orderId,
            productName: claim.productName,
            quantity: claim.quantity,
            price: claim.price,
            totalAmount: refundAmount,
            policyId: claim.policyId,
            buyerId: claim.buyerId,
            buyerName: claim.buyerName,
            sellerId: claim.sellerId,
            refundType: 'complaint_claim'
          }
        });
        transactionCreated = true;
        this.logger.log(`✅ Created transaction record for refund`);
        
        // 4. Update claim status
        claim.status = 'refunded';
        await claim.save();
        this.logger.log(`✅ Updated claim status to 'refunded'`);
        
        // Return success response
        return {
          success: true,
          message: 'Refund processed successfully - Amount credited to buyer account',
          refundAmount,
          refundedTo: 'buyer'
        };
        
      } catch (error) {
        this.logger.error(`❌ Error during refund transaction: ${error.message}`);
        
        // Attempt to rollback if partial completion
        if (buyerBalanceUpdated && !agentBalanceUpdated) {
          // Rollback buyer balance
          await this.userService.deductBalance(claim.buyerId, refundAmount)
            .catch(e => this.logger.error(`Failed to rollback buyer balance: ${e.message}`));
        }
        
        throw new Error(`Refund failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process claim refund: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPendingClaims(agentId: string) {
    try {
      this.logger.log(`Getting pending claims for agent: ${agentId}`);
      
      // Find agent details first to get email
      const agent = await this.userModel.findById(agentId);
      
      if (!agent) {
        this.logger.warn(`⚠️ Agent not found with ID: ${agentId}`);
        return { success: false, claims: [] };
      }
      
      // Find all policies created by this agent
      const agentPolicies = await this.policyModel.find({ 
        $or: [
          { agentId: agentId },
          { createdBy: agentId },
          { agentEmail: agent.email }
        ]
      });
      
      // Get policy IDs
      const policyIds = agentPolicies.map(policy => policy.policyId);
      
      // Find all insurances using these policies
      const insurances = await this.insuranceModel.find({
        policyId: { $in: policyIds }
      });
      
      // Enhanced query for pending claims with broader criteria
      const claims = await this.insuranceClaimModel.find({
        $or: [
          { agentId: agentId }, // Claims assigned to this agent
          { processingAgentId: agentId }, // Claims being processed by this agent
          { policyId: { $in: policyIds } }, // Claims for policies created by this agent
          { agentEmail: agent.email }, // Claims where agent email matches
          { 
            policyId: { 
              $in: insurances.map(i => i.policyId) 
            } 
          } // Claims for insurance policies this agent created
        ],
        status: 'pending'
      }).populate('userId', 'name email').populate('sellerId', 'name email');

      this.logger.log(`Found ${claims.length} pending claims for agent ${agentId}`);
      
      // Add debug info
      if (claims.length > 0) {
        this.logger.log('Pending claims details:');
        claims.forEach((claim, index) => {
          this.logger.log(`Claim ${index + 1}: ID=${claim._id}, AgentID=${claim.agentId || 'none'}, PolicyID=${claim.policyId || 'none'}`);
        });
      } else {
        this.logger.log('No pending claims found with expanded search criteria');
      }
      
      return {
        success: true,
        claims
      };
    } catch (error) {
      this.logger.error(`Failed to get pending claims: ${error.message}`, error.stack);
      throw error;
    }
  }

  async payClaim(claimId: string, agentId: string) {
    try {
      this.logger.log(`Processing claim payment: ${claimId} by agent: ${agentId}`);
      
      const claim = await this.insuranceClaimModel.findById(claimId);
      if (!claim) {
        throw new NotFoundException('Claim not found');
      }

      if (claim.processingAgentId !== agentId) {
        throw new ForbiddenException('You can only process claims assigned to you');
      }

      if (claim.status !== 'pending') {
        throw new BadRequestException('Claim is not in pending status');
      }

      // Update claim status to approved and processed
      claim.status = 'approved';
      claim.processingDate = new Date().toISOString();
      await claim.save();

      // Process payment to buyer
      // This would integrate with your payment service
      // For now, we'll just log it
      this.logger.log(`Payment of ${claim.totalAmount} processed for buyer ${claim.buyerId}`);

      return {
        success: true,
        message: `Claim approved and payment of ${claim.totalAmount} processed`,
        claimId: claim._id
      };
    } catch (error) {
      this.logger.error(`Failed to process claim payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async expireUserPolicy(userId: string) {
    try {
      this.logger.log(`Expiring insurance policy for user: ${userId}`);
      
      // Find the user's active insurance policy
      const insurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      if (!insurance) {
        throw new NotFoundException('No active insurance policy found for user');
      }

      // Check if the policy has actually expired
      const currentDate = new Date();
      const endDate = new Date(insurance.endDate);
      
      if (endDate >= currentDate) {
        throw new BadRequestException('Insurance policy has not yet expired');
      }

      // Update the insurance status to expired
      insurance.status = 'expired';
      await insurance.save();

      this.logger.log(`Insurance policy expired successfully for user ${userId}`);
      
      return {
        success: true,
        message: 'Insurance policy expired successfully',
        insurance: insurance
      };
    } catch (error) {
      this.logger.error(`Failed to expire insurance policy: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUserInsurance(userId: string, updateData: { status?: string }) {
    try {
      this.logger.log(`Updating insurance for user: ${userId} with data: ${JSON.stringify(updateData)}`);
      
      // Find the user's most recent insurance policy regardless of status
      const insurance = await this.insuranceModel.findOne({
        userId
      }).sort({ createdAt: -1, updatedAt: -1 });

      if (!insurance) {
        throw new NotFoundException('No insurance policy found for user');
      }

      // If updating status to expired, verify it has actually expired
      if (updateData.status === 'expired') {
        const currentDate = new Date();
        const endDate = new Date(insurance.endDate);
        
        if (endDate >= currentDate) {
          this.logger.warn(`Attempting to expire policy that hasn't expired yet. End date: ${endDate}, Current: ${currentDate}`);
          // Allow the update anyway, but log it
        }
      }

      // Update the insurance
      if (updateData.status) {
        insurance.status = updateData.status as any;
      }
      await insurance.save();

      this.logger.log(`Insurance updated successfully for user ${userId}`);
      
      return insurance;
    } catch (error) {
      this.logger.error(`Failed to update insurance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async forceUpdateExpiredPolicies() {
    try {
      const currentDate = new Date();
      this.logger.log(`🔄 Checking for expired policies as of: ${currentDate.toISOString()}`);
      
      // Find all active policies that have expired
      const expiredPolicies = await this.insuranceModel.find({
        status: 'active',
        endDate: { $lt: currentDate }
      });

      this.logger.log(`📊 Found ${expiredPolicies.length} expired policies to update`);

      // Update all expired policies
      const updateResult = await this.insuranceModel.updateMany(
        {
          status: 'active',
          endDate: { $lt: currentDate }
        },
        {
          $set: { status: 'expired' }
        }
      );

      this.logger.log(`✅ Updated ${updateResult.modifiedCount} policies to expired status`);
      return {
        foundExpired: expiredPolicies.length,
        updated: updateResult.modifiedCount
      };
    } catch (error) {
      this.logger.error(`Failed to force update expired policies: ${error.message}`, error.stack);
      throw error;
    }
  }

  async debugAllUserInsurances(userId: string) {
    try {
      this.logger.log(`🔍 DEBUG: Fetching ALL insurances for user: ${userId}`);
      
      // Get all insurances for the user with multiple sorting methods
      const allInsurances = await this.insuranceModel
        .find({ userId })
        .sort({ createdAt: -1, _id: -1 })
        .lean()
        .exec();

      this.logger.log(`📊 Found ${allInsurances.length} total insurances for user ${userId}`);
      
      allInsurances.forEach((ins, index) => {
        this.logger.log(`  ${index + 1}. ID: ${ins._id}, Status: ${ins.status}, Created: ${(ins as any).createdAt}, Updated: ${(ins as any).updatedAt}, Premium: ${ins.premium}`);
      });

      const latestInsurance = allInsurances[0]; // First one should be latest
      this.logger.log(`🎯 LATEST INSURANCE should be: ID ${latestInsurance?._id}, Status: ${latestInsurance?.status}`);

      return {
        totalCount: allInsurances.length,
        allInsurances: allInsurances,
        latestInsurance: latestInsurance,
        sortedBy: 'createdAt DESC, _id DESC'
      };
    } catch (error) {
      this.logger.error(`Failed to debug user insurances: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findUserById(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      return user;
    } catch (error) {
      this.logger.error(`Error finding user: ${error.message}`);
      return null;
    }
  }

  async findClaimsByAgentId(agentId: string) {
    try {
      const claims = await this.insuranceClaimModel.find({
        $or: [
          { agentId: agentId },
          { processingAgentId: agentId }
        ]
      });
      return claims;
    } catch (error) {
      this.logger.error(`Error finding claims by agent: ${error.message}`);
      return [];
    }
  }

  async getPoliciesByAgent(agentId: string) {
    try {
      // Find agent details first to get email
      const agent = await this.userModel.findById(agentId);
      
      if (!agent) {
        this.logger.warn(`Agent not found with ID: ${agentId}`);
        return [];
      }
      
      // Find all policies created by this agent
      const policies = await this.policyModel.find({ 
        $or: [
          { agentId: agentId },
          { createdBy: agentId },
          { agentEmail: agent.email }
        ]
      });
      
      return policies;
    } catch (error) {
      this.logger.error(`Error finding policies by agent: ${error.message}`);
      return [];
    }
  }
}
