import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InsuranceClaimDocument = InsuranceClaim & Document;

@Schema({ collection: 'insurance_claims', timestamps: true })
export class InsuranceClaim {
  @Prop({ required: true, unique: true })
  claimId: string;

  @Prop({ required: true })
  complaintId: string; // Reference to the complaint
  
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;
  
  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;
  
  @Prop({ required: true })
  totalAmount: number; // Total refund amount (price * quantity)

  @Prop({ required: true })
  sellerId: string;
  
  @Prop({ required: true })
  sellerName: string;
  
  @Prop({ required: true })
  sellerEmail: string;
  
  @Prop({ required: true })
  buyerId: string;
  
  @Prop({ required: true })
  buyerName: string;
  
  @Prop({ required: true })
  buyerEmail: string;
  
  @Prop({ required: true })
  insuranceId: string; // Reference to the seller's active insurance policy
  
  @Prop({ required: true })
  policyId: string; // The policy ID

  @Prop({ required: true })
  orderDate: string; // ISO date string of when the order was placed
  
  @Prop({ required: true })
  dispatchDate: string; // ISO date string of when the order was dispatched
  
  @Prop({ required: true })
  complaintDate: string; // ISO date string of when the complaint was filed
  
  @Prop({ required: true })
  claimDate: string; // ISO date string of when the claim was filed

  @Prop({ required: true })
  claimReason: string; // Reason for the claim
  
  @Prop({ required: true })
  description: string; // Detailed description of the issue
  
  @Prop({ default: null })
  agentId: string; // ID of the insurance agent assigned to the claim
  
  @Prop({ default: null })
  processingAgentId: string; // ID of the insurance agent who processed the claim
  
  @Prop({ default: null })
  processingAgentName: string; // Name of the insurance agent who processed the claim
  
  @Prop({ required: true, default: 'pending', enum: ['pending', 'approved', 'rejected', 'refunded'] })
  status: string;
  
  @Prop({ default: null })
  processingDate: string; // ISO date string of when the claim was processed

  @Prop({ default: null })
  refundDate: string; // ISO date string of when the refund was processed
  
  @Prop({ default: null })
  comments: string; // Comments from the insurance agent
}

export const InsuranceClaimSchema = SchemaFactory.createForClass(InsuranceClaim);
