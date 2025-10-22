import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Insurance extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop()
  userEmail: string; // Store subscriber email for easy access

  @Prop({ required: true })
  policyId: string;

  @Prop({ required: true })
  premium: number;

  @Prop({ 
    required: true,
    enum: ['normal', 'premium'],
    default: 'normal'
  })
  insuranceType: string; // normal or premium insurance type

  @Prop({ required: true })
  coverage: number;

  @Prop({ required: true })
  duration: number; // in months

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ 
    required: true, 
    enum: ['active', 'expired', 'cancelled', 'suspended'],
    default: 'active' 
  })
  status: string;

  @Prop()
  agentId?: string; // Insurance agent who created or manages this policy

  @Prop()
  agentName?: string; // Agent's name for easy reference

  @Prop()
  agentEmail?: string; // Agent's email for easy reference

  @Prop({ default: 0 })
  claimsCount?: number; // Number of claims filed against this policy

  @Prop({ default: 0 })
  totalClaimsAmount?: number; // Total amount claimed so far

  @Prop()
  lastClaimDate?: string; // Date of the last claim filed

  @Prop()
  cancellationDate?: Date;

  @Prop()
  refundAmount?: number;

  @Prop()
  notes?: string;
}

export const InsuranceSchema = SchemaFactory.createForClass(Insurance);
