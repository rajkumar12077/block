import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserService } from '../user/user.service';
import { TransactionService } from '../insurance/transaction.service';

@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService
  ) {}

  @Post('my-insurance-fund')
  @UseGuards(JwtAuthGuard)
  async addMyInsuranceFund(@Body() body: { amount: number }, @Request() req) {
    try {
      this.logger.log(`=== ADD INSURANCE FUND REQUEST ===`);
      this.logger.log(`Request user object:`, req.user);
      this.logger.log(`User ID: ${req.user?.userId}`);
      this.logger.log(`Amount: ${body.amount}`);
      
      if (!req.user?.userId) {
        throw new BadRequestException('User ID not found in request. Please log in again.');
      }
      
      this.logger.log(`Insurance agent ${req.user.userId} adding fund: ${body.amount}`);
      
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        throw new BadRequestException('Invalid amount');
      }

      if (amount > 10000) {
        throw new BadRequestException('Amount cannot exceed $10,000 per transaction');
      }

      const updatedUser = await this.userService.addBalance(req.user.userId, amount);
      
      // Create transaction record
      await this.transactionService.createTransaction({
        fromUserId: 'system',
        toUserId: req.user.userId,
        amount: amount,
        type: 'fund_addition',
        description: 'Insurance fund deposit',
        metadata: {
          userBalance: updatedUser.balance,
          transactionType: 'insurance_fund'
        }
      });
      
      this.logger.log(`✅ Fund added successfully. New balance: ${updatedUser.balance}`);
      
      return {
        success: true,
        message: 'Insurance fund added successfully',
        newBalance: updatedUser.balance,
        amountAdded: amount
      };
    } catch (error) {
      this.logger.error(`❌ Failed to add insurance fund: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('add-balance')
  @UseGuards(JwtAuthGuard)
  async addBalance(@Body() body: { amount: number }, @Request() req) {
    try {
      this.logger.log(`User ${req.user.userId} adding balance: ${body.amount}`);
      
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        throw new BadRequestException('Invalid amount');
      }

      if (amount > 10000) {
        throw new BadRequestException('Amount cannot exceed $10,000 per transaction');
      }

      const updatedUser = await this.userService.addBalance(req.user.userId, amount);
      
      // Create transaction record
      await this.transactionService.createTransaction({
        fromUserId: 'system',
        toUserId: req.user.userId,
        amount: amount,
        type: 'fund_addition',
        description: 'Account balance addition',
        metadata: {
          userBalance: updatedUser.balance,
          transactionType: 'balance_addition'
        }
      });
      
      this.logger.log(`✅ Balance added successfully. New balance: ${updatedUser.balance}`);
      
      return {
        success: true,
        message: 'Balance added successfully',
        newBalance: updatedUser.balance,
        amountAdded: amount
      };
    } catch (error) {
      this.logger.error(`❌ Failed to add balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(@Request() req) {
    try {
      this.logger.log(`User ${req.user.userId} requesting transactions`);
      
      // Get real transactions from database
      let transactions = await this.transactionService.getUserTransactions(req.user.userId);
      
      // Debug: Log all transactions before filtering
      this.logger.log(`🔍 RAW TRANSACTIONS for user ${req.user.userId}:`, 
        transactions.map(tx => ({
          id: tx.transactionId,
          type: tx.type,
          amount: tx.amount,
          fromUserId: tx.fromUserId,
          toUserId: tx.toUserId,
          description: tx.description,
          relatedId: tx.relatedId,
          createdAt: tx.createdAt
        }))
      );
      
      // No additional filtering needed - the TransactionService already handles proper filtering
      
      // Get user's current balance for showing correct balances
      const user = await this.userService.findById(req.user.userId);
      const currentBalance = user?.balance || 0;
      
      // Transform transactions to match frontend format
      // Calculate running balance for each transaction (working backwards from current balance)
      const formattedTransactions = transactions.map((tx, index) => {
        // Determine if this is a credit or debit for this user based on the actual transaction flow
        const isFromUser = tx.fromUserId === req.user.userId;
        const isToUser = tx.toUserId === req.user.userId;
        
        // Calculate display amount and type based on user's perspective:
        // - If user is receiving money (toUserId), it's a credit (positive)
        // - If user is sending money (fromUserId), it's a debit (negative)
        let displayAmount;
        let displayType;
        
        if (isToUser) {
          // User is receiving money - this is a credit (positive amount)
          displayAmount = Math.abs(tx.amount);
          displayType = 'credit';
        } else if (isFromUser) {
          // User is sending money - this is a debit (negative amount)
          displayAmount = -Math.abs(tx.amount);
          displayType = 'debit';
        } else {
          // Fallback - should not happen with proper filtering
          displayAmount = tx.amount;
          displayType = displayAmount >= 0 ? 'credit' : 'debit';
        }
        
        this.logger.log(`📝 Processing transaction ${tx.transactionId}:`, {
          type: tx.type,
          originalAmount: tx.amount,
          fromUserId: tx.fromUserId,
          toUserId: tx.toUserId,
          requestingUserId: req.user.userId,
          isFromUser,
          isToUser,
          displayAmount,
          displayType,
          description: tx.description?.substring(0, 50)
        });
        
        // Calculate balance by working backwards using display amounts from user's perspective
        let balanceAfterThisTransaction = currentBalance;
        for (let i = 0; i < index; i++) {
          const laterTx = transactions[i];
          // Calculate the effect of this later transaction on the user's balance
          const laterIsFromUser = laterTx.fromUserId === req.user.userId;
          const laterIsToUser = laterTx.toUserId === req.user.userId;
          
          let laterEffect;
          if (laterIsToUser) {
            // User received money in this later transaction
            laterEffect = -Math.abs(laterTx.amount); // Subtract because we're going backwards
          } else if (laterIsFromUser) {
            // User sent money in this later transaction  
            laterEffect = Math.abs(laterTx.amount); // Add back because we're going backwards
          } else {
            laterEffect = 0; // Should not happen with proper filtering
          }
          
          balanceAfterThisTransaction += laterEffect;
        }
        
        return {
          id: tx.transactionId,
          date: tx.createdAt || new Date(),
          type: tx.type, // Preserve original transaction type (product_purchase, sale_credit, order_refund, etc.)
          amount: displayAmount, // Show actual amount with correct sign
          description: tx.description || `${tx.type.replace('_', ' ')}`,
          status: tx.status || 'completed',
          transactionType: tx.type, // Keep for backward compatibility
          displayType: displayType, // Add display type for frontend
          relatedId: tx.relatedId,
          metadata: tx.metadata,
          balance: balanceAfterThisTransaction,
          createdAt: tx.createdAt,
          // Additional debug info
          isFromUser: isFromUser,
          isToUser: isToUser,
          originalAmount: tx.amount
        };
      });
      
      // Final logging
      const finalBreakdown = formattedTransactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const debitCount = formattedTransactions.filter(tx => tx.amount < 0).length;
      const creditCount = formattedTransactions.filter(tx => tx.amount >= 0).length;
      
      this.logger.log(`✅ FINAL RESULT for user ${req.user.userId}:`);
      this.logger.log(`  - Total transactions: ${formattedTransactions.length}`);
      this.logger.log(`  - Debit transactions: ${debitCount}`);
      this.logger.log(`  - Credit transactions: ${creditCount}`);
      this.logger.log(`  - Type breakdown:`, finalBreakdown);
      
      if (debitCount === 0) {
        this.logger.warn(`⚠️ NO DEBIT TRANSACTIONS in final result! This might be the issue.`);
      }
      
      return formattedTransactions;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch transactions: ${error.message}`, error.stack);
      throw error;
    }
  }
}
