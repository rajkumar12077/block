import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel('Transaction') private readonly transactionModel: Model<Transaction>
  ) {}

  async createTransaction(transactionData: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: string;
    description?: string;
    relatedId?: string;
    metadata?: any;
  }, session?: any): Promise<Transaction> {
    try {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate and map transaction type to ensure compatibility
      const validTypes = [
        'premium_payment', 'premium_received', 'fund_addition', 
        'claim_payout', 'policy_refund', 'insurance_refund', 
        'premium_refund_debit', 'subscription_fee', 'product_purchase',
        'sale_credit', 'order_refund'
      ];
      
      let transactionType = transactionData.type;
      if (!validTypes.includes(transactionType)) {
        this.logger.warn(`Invalid transaction type '${transactionType}', mapping to 'fund_addition'`);
        transactionType = 'fund_addition'; // Safe fallback
      }
      
      this.logger.log(`Creating transaction with type: '${transactionType}'`);
      
      const transaction = new this.transactionModel({
        ...transactionData,
        type: transactionType,
        transactionId,
        status: 'completed'
      });

      const result = session ? await transaction.save({ session }) : await transaction.save();
      this.logger.log(`✅ Transaction created: ${transactionId} for amount $${transactionData.amount}`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to create transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      // Find transactions where the user is either sender or recipient
      const allTransactions = await this.transactionModel
        .find({
          $or: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(100) // Get more initially so we can filter
        .exec();
      
      // Debug: Log all transactions before filtering
      this.logger.log(`🔍 ALL TRANSACTIONS for user ${userId}:`, 
        allTransactions.map(tx => ({
          id: tx.transactionId,
          type: tx.type,
          amount: tx.amount,
          fromUserId: tx.fromUserId.toString(),
          toUserId: tx.toUserId.toString(),
          relatedId: tx.relatedId,
          description: tx.description?.substring(0, 50) + '...'
        }))
      );
      
      // Filter transactions to show only those relevant to the requesting user
      const seenPremiumTransactions = new Set<string>();
      
      const filteredTransactions = allTransactions.filter(tx => {
        // Show all transactions where the user is directly involved (as sender or recipient)
        const isFromUser = tx.fromUserId.toString() === userId.toString();
        const isToUser = tx.toUserId.toString() === userId.toString();
        
        // COMPLETELY OPEN FILTERING - Show ALL transactions where user is involved
        if (isFromUser || isToUser) {
          this.logger.log(`✅ SHOWING transaction ${tx.transactionId}:`, {
            type: tx.type,
            amount: tx.amount,
            fromUserId: tx.fromUserId.toString(),
            toUserId: tx.toUserId.toString(),
            requestingUserId: userId,
            isFromUser,
            isToUser,
            description: tx.description?.substring(0, 50)
          });
          
          // Apply deduplication only for premium transactions to avoid duplicates
          if (tx.type === 'premium_payment' || tx.type === 'insurance_refund') {
            const groupKey = tx.relatedId || tx.transactionId;
            const transactionKey = `${groupKey}_${tx.type}`;
            
            if (seenPremiumTransactions.has(transactionKey)) {
              this.logger.log(`🚫 SKIPPING duplicate premium transaction: ${tx.transactionId}`);
              return false; // Skip duplicate premium transactions
            }
            seenPremiumTransactions.add(transactionKey);
          }
          
          return true; // Show ALL other transactions
        }
        
        // Don't show transactions where user is not involved
        this.logger.log(`🚫 FILTERING OUT unrelated transaction ${tx.transactionId}:`, {
          type: tx.type,
          fromUserId: tx.fromUserId.toString(),
          toUserId: tx.toUserId.toString(),
          requestingUserId: userId,
          reason: 'User not involved'
        });
        return false;
      });
      
      // Debug: Log filtering results
      this.logger.log(`🔍 FILTERING RESULTS for user ${userId}:`);
      this.logger.log(`  - Total transactions found: ${allTransactions.length}`);
      this.logger.log(`  - After filtering: ${filteredTransactions.length}`);
      
      const typeBreakdown = filteredTransactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      this.logger.log(`  - Type breakdown:`, typeBreakdown);
      
      // Check for any missing product_purchase transactions
      const allProductPurchases = allTransactions.filter(tx => tx.type === 'product_purchase');
      const filteredProductPurchases = filteredTransactions.filter(tx => tx.type === 'product_purchase');
      if (allProductPurchases.length !== filteredProductPurchases.length) {
        this.logger.warn(`⚠️ MISSING PRODUCT PURCHASES: Found ${allProductPurchases.length} total, but only ${filteredProductPurchases.length} passed filter`);
        const missing = allProductPurchases.filter(ap => !filteredProductPurchases.some(fp => fp.transactionId === ap.transactionId));
        this.logger.warn(`Missing transactions:`, missing.map(tx => ({
          id: tx.transactionId,
          amount: tx.amount,
          fromUserId: tx.fromUserId.toString(),
          toUserId: tx.toUserId.toString(),
          userId: userId,
          description: tx.description
        })));
      }
      
      // Limit to 50 after filtering
      const transactions = filteredTransactions.slice(0, 50);

      this.logger.log(`✅ Found ${transactions.length} transactions for user ${userId}`);
      return transactions;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch user transactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const transaction = await this.transactionModel
        .findOne({ transactionId })
        .exec();

      if (transaction) {
        this.logger.log(`✅ Found transaction: ${transactionId}`);
      } else {
        this.logger.warn(`⚠️ Transaction not found: ${transactionId}`);
      }

      return transaction;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTransactionsByType(userId: string, type: string): Promise<Transaction[]> {
    try {
      const transactions = await this.transactionModel
        .find({
          $or: [
            { fromUserId: userId },
            { toUserId: userId }
          ],
          type
        })
        .sort({ createdAt: -1 })
        .exec();

      this.logger.log(`✅ Found ${transactions.length} ${type} transactions for user ${userId}`);
      return transactions;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch transactions by type: ${error.message}`, error.stack);
      throw error;
    }
  }
}