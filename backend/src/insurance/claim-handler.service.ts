import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import { TransactionService } from './transaction.service';

@Injectable()
export class ClaimHandlerService {
  private readonly logger = new Logger(ClaimHandlerService.name);

  constructor(
    @InjectModel('InsuranceClaim') private insuranceClaimModel: Model<any>,
    @InjectModel('Insurance') private insuranceModel: Model<any>,
    @InjectModel('Policy') private policyModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService
  ) {}

  async getSellerClaims(sellerId: string) {
    try {
      this.logger.log(`Fetching claims for seller: ${sellerId}`);
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
      this.logger.log(`Fetching claims for agent: ${agentId}`);
      
      // Find agent details first to get email
      const agent = await this.userModel.findById(agentId);
      
      if (!agent) {
        this.logger.warn(`Agent not found with ID: ${agentId}`);
        return [];
      }
      
      // Find all policies created by this agent
      const agentPolicies = await this.policyModel.find({ 
        $or: [
          { agentId: agentId },
          { createdBy: agentId },
          { agentEmail: agent.email }
        ]
      });
      
      this.logger.log(`Found ${agentPolicies.length} policies associated with agent`);
      
      // Get policy IDs
      const policyIds = agentPolicies.map(policy => policy.policyId);
      
      // Find all claims associated with this agent's policies
      const claims = await this.insuranceClaimModel.find({
        $or: [
          { agentId: agentId },
          { processingAgentId: agentId },
          { policyId: { $in: policyIds } }
        ]
      }).sort({ claimDate: -1 });
      
      this.logger.log(`Found ${claims.length} total claims for agent ${agentId}`);
      return claims;
    } catch (error) {
      this.logger.error(`Failed to get agent claims: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async processClaim(claimId: string, agentId: string, agentName: string, status: string, comments?: string) {
    try {
      this.logger.log(`Processing claim ${claimId} with status: ${status}`);
      
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
      
      await claim.save();
      
      // If claim is approved, process the refund
      if (status === 'approved') {
        return await this.processClaimRefund(claim, agentId);
      }
      
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
  
  async processClaimRefund(claim: any, agentId?: string) {
    try {
      this.logger.log(`Processing refund for claim: ${claim.claimId}`);
      
      // Check if already refunded
      if (claim.status === 'refunded') {
        throw new BadRequestException('This claim has already been refunded');
      }
      
      // Find the agent responsible for the policy
      const policy = await this.policyModel.findOne({ policyId: claim.policyId });
      if (!policy) {
        throw new NotFoundException('Insurance policy not found');
      }
      
      const agent = await this.userModel.findById(policy.createdBy);
      if (!agent) {
        throw new NotFoundException('Insurance agent not found');
      }
      
      // Calculate refund amount
      const refundAmount = claim.totalAmount;
      
      this.logger.log(`Refunding ${refundAmount} to buyer ${claim.buyerId}`);
      this.logger.log(`Deducting ${refundAmount} from agent ${agent._id}`);
      
      // Start a transaction to ensure all balance updates succeed or fail together
      let buyerBalanceUpdated = false;
      let agentBalanceUpdated = false;
      let transactionCreated = false;
      
      try {
        // 1. Add balance to buyer
        await this.userService.addBalance(claim.buyerId, refundAmount);
        buyerBalanceUpdated = true;
        this.logger.log(`Added ${refundAmount} to buyer ${claim.buyerId} balance`);
        
        // 2. Deduct from agent's balance
        await this.userService.deductBalance(agent._id.toString(), refundAmount);
        agentBalanceUpdated = true;
        this.logger.log(`Deducted ${refundAmount} from agent ${agent._id} balance`);
        
        // 3. Create transaction record
        const transaction = await this.transactionService.createTransaction({
          fromUserId: agent._id.toString(),
          toUserId: claim.buyerId,
          amount: refundAmount,
          type: 'order_refund',
          description: `Insurance claim refund for ${claim.productName} - Order: ${claim.orderId}`,
          relatedId: claim.claimId,
          metadata: {
            claimId: claim.claimId,
            orderId: claim.orderId,
            productName: claim.productName,
            refundType: 'insurance_claim'
          }
        });
        transactionCreated = true;
        this.logger.log(`Created transaction record for refund: ${transaction.transactionId}`);
        
        // 4. Update claim status to refunded
        claim.status = 'refunded';
        claim.refundDate = new Date().toISOString();
        await claim.save();
        this.logger.log(`Updated claim status to refunded`);
        
        return {
          success: true,
          message: 'Refund processed successfully - Amount credited to buyer account',
          refundAmount,
          refundedTo: 'buyer',
          transaction: {
            transactionId: transaction.transactionId,
            amount: refundAmount
          }
        };
      } catch (error) {
        this.logger.error(`Error during refund transaction: ${error.message}`);
        
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
}