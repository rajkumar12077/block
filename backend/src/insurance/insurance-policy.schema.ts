import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InsurancePolicyDocument = InsurancePolicy & Document;

// @Schema({ collection: 'insurance_policies', timestamps: true })
export class InsurancePolicy {
  @Prop({ required: true, unique: true })
  policyId: string;

  @Prop({ required: true })
  sellerId: string;
  
  @Prop({ required: true })
  sellerName: string;
  
  @Prop({ required: true })
  sellerEmail: string;
  
  @Prop({ required: true })
  insuranceId: string; // ID of the insurance company
  
  @Prop({ required: true })
  insuranceName: string; // Name of the insurance company
  
  @Prop({ default: null })
  agentId: string; // ID of the insurance agent assigned to this policy
  
  @Prop({ required: true })
  policyType: string; // Type of policy (e.g., 'product_damage', 'delivery_failure')
  
  @Prop({ required: true })
  coverageAmount: number; // Maximum coverage amount
  
  @Prop({ required: true })
  premium: number; // Premium amount paid by seller
  
  @Prop({ required: true })
  startDate: string; // Policy start date (ISO string)
  
  @Prop({ required: true })
  endDate: string; // Policy end date (ISO string)
  
  @Prop({ required: true, default: 'active', enum: ['active', 'expired', 'cancelled', 'suspended'] })
  status: string;
  
  @Prop({ default: [] })
  coveredProducts: string[]; // Array of product IDs covered by this policy
  
  @Prop({ default: 0 })
  claimsCount: number; // Number of claims made against this policy
  
  @Prop({ default: 0 })
  totalClaimsAmount: number; // Total amount claimed against this policy
  
  @Prop({ required: true })
  purchaseDate: string; // When the policy was purchased (ISO string)
  
  @Prop({ default: null })
  lastClaimDate: string; // Date of last claim (ISO string)
}

export const InsurancePolicySchema = SchemaFactory.createForClass(InsurancePolicy);
