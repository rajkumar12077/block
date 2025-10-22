import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Claim extends Document {
  @Prop({ required: true })
  claimId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  insuranceId: string;

  @Prop({ required: true })
  policyId: string;

  @Prop({ required: true })
  claimType: string; // 'crop_damage', 'theft', 'weather', etc.

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  claimAmount: number;

  @Prop({ required: true })
  incidentDate: Date;

  @Prop({ 
    required: true, 
    enum: ['pending', 'investigating', 'approved', 'rejected', 'paid'],
    default: 'pending' 
  })
  status: string;

  @Prop()
  approvedAmount?: number;

  @Prop()
  rejectionReason?: string;

  @Prop()
  processedDate?: Date;

  @Prop({ type: [String], default: [] })
  evidence: string[]; // URLs to evidence files

  @Prop()
  productId?: string;

  @Prop()
  orderId?: string;

  @Prop()
  quantityAffected?: number;

  @Prop()
  pricePerUnit?: number;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);