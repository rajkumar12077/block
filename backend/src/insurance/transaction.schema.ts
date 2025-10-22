import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface TransactionDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true })
export class Transaction extends Document implements TransactionDocument {
  createdAt: Date;
  updatedAt: Date;
  @Prop({ required: true })
  transactionId: string;

  @Prop({ required: true })
  fromUserId: string;

  @Prop({ required: true })
  toUserId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ 
    required: true, 
    enum: {
      values: ['premium_payment', 'premium_received', 'fund_addition', 'claim_payout', 'policy_refund', 'insurance_refund', 'premium_refund_debit', 'subscription_fee', 'product_purchase', 'sale_credit', 'order_refund'],
      message: 'Invalid transaction type: {VALUE}. Allowed types: premium_payment, premium_received, fund_addition, claim_payout, policy_refund, insurance_refund, premium_refund_debit, subscription_fee, product_purchase, sale_credit, order_refund'
    }
  })
  type: string;

  @Prop({ 
    required: true, 
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed' 
  })
  status: string;

  @Prop()
  description: string;

  @Prop()
  relatedId?: string; // insurance ID, claim ID, etc.

  @Prop({ type: Object })
  metadata?: any; // additional transaction data
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);