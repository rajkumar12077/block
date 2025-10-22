import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Policy extends Document {
  @Prop({ required: true, unique: true })
  policyId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  dailyRate: number; // daily premium rate for normal insurance

  @Prop({ required: true })
  premiumDailyRate: number; // daily premium rate for premium insurance (higher rate)

  @Prop({ required: false }) // Made optional since it's calculated from dailyRate * 30
  monthlyPremium: number; // monthly premium amount for normal insurance (calculated from dailyRate * 30)

  @Prop({ required: false }) // Made optional since it's calculated from premiumDailyRate * 30
  premiumMonthlyPremium: number; // monthly premium amount for premium insurance

  @Prop({ required: true })
  coverage: number; // maximum coverage amount for normal insurance

  @Prop({ required: true })
  premiumCoverage: number; // maximum coverage amount for premium insurance (higher coverage)

  @Prop({ required: true, min: 1, max: 24 })
  maxDurationMonths: number; // maximum allowed duration in months (1-24)

  @Prop({ required: true, min: 1 })
  minDurationDays: number; // minimum duration in days

  @Prop({ required: false, min: 1, max: 24, default: 12 }) // Made optional with default value
  durationMonths: number; // default duration in months for this policy

  @Prop({ required: true, enum: ['crop', 'livestock', 'equipment', 'general'] })
  type: string;

  @Prop({ 
    required: true, 
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active' 
  })
  status: string;

  @Prop({ default: [] })
  coverageItems: string[];

  @Prop()
  terms: string;

  @Prop({ required: true })
  createdBy: string; // Insurance agent userId who created this policy

  @Prop({ required: true })
  agentEmail: string; // Insurance agent email who created this policy
}

export const PolicySchema = SchemaFactory.createForClass(Policy);