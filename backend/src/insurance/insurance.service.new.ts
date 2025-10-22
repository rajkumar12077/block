import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Insurance } from './insurance.schema';
import { Policy } from './policy.schema';
import { Claim } from './claim.schema';
import { Transaction } from './transaction.schema';
import { UserService } from '../user/user.service';
import { User } from '../user/user.schema';
import { Product } from '../product/product.schema';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    @InjectModel('Insurance') private insuranceModel: Model<Insurance>,
    @InjectModel('Policy') private policyModel: Model<Policy>,
    @InjectModel('Claim') private claimModel: Model<Claim>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Product') private productModel: Model<Product>,
    private userService: UserService,
  ) {
    this.initializeDefaultPolicies();
  }

  private async initializeDefaultPolicies() {
    try {
      const count = await this.policyModel.countDocuments();
      if (count === 0) {
        const defaultPolicies = [
          {
            policyId: 'POL-001',
            name: 'Basic Coverage',
            description: 'Basic insurance coverage for agricultural products',
            dailyRate: 5,
            coverage: 1000,
            maxDurationMonths: 12,
            minDurationDays: 7,
            type: 'crop',
            status: 'active',
            coverageItems: ['Crop damage', 'Weather protection', 'Basic theft'],
            terms: 'Standard terms and conditions apply'
          },
          {
            policyId: 'POL-002',
            name: 'Premium Coverage',
            description: 'Premium insurance coverage with extended benefits',
            dailyRate: 12,
            coverage: 2500,
            maxDurationMonths: 18,
            minDurationDays: 14,
            type: 'general',
            status: 'active',
            coverageItems: ['Crop damage', 'Weather protection', 'Theft', 'Equipment damage'],
            terms: 'Premium terms with extended coverage'
          },
          {
            policyId: 'POL-003',
            name: 'Comprehensive Coverage',
            description: 'Comprehensive insurance coverage for all risks',
            dailyRate: 20,
            coverage: 5000,
            maxDurationMonths: 24,
            minDurationDays: 30,
            type: 'general',
            status: 'active',
            coverageItems: ['All risks covered', 'Full protection', 'Premium support'],
            terms: 'Comprehensive coverage with full protection'
          }
        ];

        await this.policyModel.insertMany(defaultPolicies);
        this.logger.log('✅ Default policies initialized');
      }
    } catch (error) {
      this.logger.warn('Could not initialize default policies:', error.message);
    }
  }

  // Policy Management
  async createPolicy(policyData: any) {
    const policy = new this.policyModel({
      policyId: `POL-${Date.now()}`,
      ...policyData,
    });
    return await policy.save();
  }

  async getAllPolicies() {
    return await this.policyModel.find({ status: 'active' });
  }

  // Insurance Subscription
  async subscribeToPolicy(userId: string, policyId: string, startDate: Date = new Date(), endDate: Date) {
    try {
      this.logger.log(`Starting policy subscription for user ${userId}, policy ${policyId}`);

      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const policy = await this.policyModel.findOne({ policyId });
      if (!policy) {
        throw new NotFoundException('Policy not found');
      }

      // Validate subscription duration
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const monthsDiff = Math.ceil(daysDiff / 30);

      if (daysDiff < policy.minDurationDays || monthsDiff > policy.maxDurationMonths) {
        throw new BadRequestException(
          `Invalid duration. Policy allows ${policy.minDurationDays} to ${policy.maxDurationMonths * 30} days`
        );
      }

      // Calculate premium based on daily rate and duration
      const calculatedPremium = policy.dailyRate * daysDiff;

      // Check if user already has active insurance for this policy
      const existingInsurance = await this.insuranceModel.findOne({
        userId,
        policyId,
        status: 'active'
      });

      if (existingInsurance) {
        throw new BadRequestException('Already subscribed to this policy');
      }

      if (user.balance < calculatedPremium) {
        throw new BadRequestException(`Insufficient balance. Required: $${calculatedPremium}, Available: $${user.balance}`);
      }

      // Deduct premium from user balance
      await this.userService.updateBalance(userId, -calculatedPremium);

      // Create insurance record
      const insurance = new this.insuranceModel({
        userId,
        policyId: policy.policyId,
        premium: calculatedPremium,
        coverage: policy.coverage,
        duration: daysDiff, // Store actual duration in days
        startDate: startDate,
        endDate: endDate,
        status: 'active'
      });

      // Create transaction record
      await this.createTransaction({
        fromUserId: userId,
        toUserId: 'insurance_fund',
        amount: calculatedPremium,
        type: 'premium_payment',
        description: `Premium payment for policy ${policy.name}`,
        relatedId: insurance._id,
      });

      const savedInsurance = await insurance.save();
      this.logger.log(`✅ Policy subscription successful for user ${userId}`);

      return {
        success: true,
        insurance: savedInsurance,
        message: 'Successfully subscribed to insurance policy'
      };
    } catch (error) {
      this.logger.error(`❌ Policy subscription failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserInsurances(userId: string) {
    return await this.insuranceModel.find({ userId });
  }

  async getMyInsurance(userId: string) {
    try {
      const insurances = await this.insuranceModel.find({ userId, status: 'active' });
      return insurances;
    } catch (error) {
      this.logger.error(`Failed to fetch user insurances: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Policy Cancellation
  async cancelInsurancePolicy(userId: string) {
    try {
      this.logger.log(`=== STARTING POLICY CANCELLATION ===`);
      this.logger.log(`User ID: ${userId}`);

      const insurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      if (!insurance) {
        this.logger.warn(`No active insurance policy found for user ${userId}`);
        throw new NotFoundException('No active insurance policy found to cancel');
      }

      this.logger.log(`Found active policy: ${insurance._id}`);

      const refundAmount = insurance.premium || 0;
      this.logger.log(`Calculated refund amount: ${refundAmount}`);

      // Update policy status
      insurance.status = 'cancelled';
      insurance.cancellationDate = new Date();
      insurance.refundAmount = refundAmount;

      // Refund to user balance
      if (refundAmount > 0) {
        await this.userService.addBalance(userId, refundAmount);
        
        // Create transaction record
        await this.createTransaction({
          fromUserId: 'insurance_fund',
          toUserId: userId,
          amount: refundAmount,
          type: 'policy_refund',
          description: `Refund for cancelled policy ${insurance.policyId}`,
          relatedId: insurance._id,
        });
      }

      const updatedPolicy = await insurance.save();
      this.logger.log(`✅ Policy cancellation completed successfully`);

      return {
        success: true,
        policy: updatedPolicy,
        refundAmount,
        message: 'Policy cancelled successfully and refund processed'
      };
    } catch (error) {
      this.logger.error(`❌ Policy cancellation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Claims Management
  async submitClaim(userId: string, claimData: any) {
    try {
      const insurance = await this.insuranceModel.findOne({
        userId,
        status: 'active'
      });

      if (!insurance) {
        throw new BadRequestException('No active insurance policy found');
      }

      const claim = new this.claimModel({
        claimId: `CLM-${Date.now()}`,
        userId,
        insuranceId: insurance._id,
        policyId: insurance.policyId,
        ...claimData,
        status: 'pending',
        evidence: claimData.evidence || []
      });

      const savedClaim = await claim.save();

      return {
        success: true,
        claim: savedClaim,
        message: 'Claim submitted successfully'
      };
    } catch (error) {
      this.logger.error(`Claim submission failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processClaim(claimId: string, decision: 'approve' | 'reject', amount?: number, reason?: string) {
    const claim = await this.claimModel.findOne({ claimId });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (decision === 'approve') {
      claim.status = 'approved';
      claim.approvedAmount = amount || claim.claimAmount;
      claim.processedDate = new Date();

      // Add approved amount to user balance
      await this.userService.addBalance(claim.userId, claim.approvedAmount);

      // Create transaction record
      await this.createTransaction({
        fromUserId: 'insurance_fund',
        toUserId: claim.userId,
        amount: claim.approvedAmount,
        type: 'claim_payout',
        description: `Claim payout for ${claim.claimType}`,
        relatedId: claim._id,
      });
    } else {
      claim.status = 'rejected';
      claim.rejectionReason = reason;
      claim.processedDate = new Date();
    }

    return await claim.save();
  }

  async getAllClaims() {
    return await this.claimModel.find().populate([
      { path: 'userId', model: 'User', select: 'username email' }
    ]);
  }

  async getUserClaims(userId: string) {
    return await this.claimModel.find({ userId });
  }

  // Fund Management
  async addInsuranceFund(amount: number) {
    await this.createTransaction({
      fromUserId: 'external',
      toUserId: 'insurance_fund',
      amount,
      type: 'fund_addition',
      description: `Insurance fund addition of $${amount}`,
    });

    return { 
      success: true,
      message: 'Fund added successfully', 
      amount 
    };
  }

  async getInsuranceFundBalance() {
    const deposits = await this.transactionModel.aggregate([
      {
        $match: {
          toUserId: 'insurance_fund',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const withdrawals = await this.transactionModel.aggregate([
      {
        $match: {
          fromUserId: 'insurance_fund',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalDeposits = deposits[0]?.total || 0;
    const totalWithdrawals = withdrawals[0]?.total || 0;

    return {
      balance: totalDeposits - totalWithdrawals,
      totalDeposits,
      totalWithdrawals
    };
  }

  // Transactions
  async getTransactions(userId?: string) {
    const filter = userId ? {
      $or: [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    } : {};

    return await this.transactionModel.find(filter).sort({ createdAt: -1 });
  }

  private async createTransaction(transactionData: any) {
    const transaction = new this.transactionModel({
      transactionId: `TXN-${Date.now()}`,
      status: 'completed',
      ...transactionData,
    });
    return await transaction.save();
  }

  // Dashboard Data
  async getDashboardData() {
    try {
      const totalPolicies = await this.insuranceModel.countDocuments();
      const activePolicies = await this.insuranceModel.countDocuments({ status: 'active' });
      const totalClaims = await this.claimModel.countDocuments();
      const pendingClaims = await this.claimModel.countDocuments({ status: 'pending' });
      
      const policies = await this.insuranceModel.find().limit(10);
      const claims = await this.claimModel.find().limit(10);
      const recentTransactions = await this.transactionModel.find().sort({ createdAt: -1 }).limit(10);
      const fundBalance = await this.getInsuranceFundBalance();

      return {
        stats: {
          totalPolicies,
          activePolicies,
          totalClaims,
          pendingClaims,
          fundBalance: fundBalance.balance
        },
        policies,
        claims,
        insurances: policies,
        transactions: recentTransactions,
        fundBalance
      };
    } catch (error) {
      this.logger.error(`Dashboard data fetch failed: ${error.message}`, error.stack);
      // Return fallback data
      return {
        stats: {
          totalPolicies: 0,
          activePolicies: 0,
          totalClaims: 0,
          pendingClaims: 0,
          fundBalance: 0
        },
        policies: [],
        claims: [],
        insurances: [],
        transactions: [],
        fundBalance: { balance: 0, totalDeposits: 0, totalWithdrawals: 0 }
      };
    }
  }

  async getAllInsurances() {
    return await this.insuranceModel.find().populate([
      { path: 'userId', model: 'User', select: 'username email' }
    ]);
  }
}