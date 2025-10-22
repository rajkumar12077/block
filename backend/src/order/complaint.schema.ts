import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ComplaintDocument = Complaint & Document;

@Schema({ collection: 'complaints', timestamps: true })
export class Complaint {
  @Prop({ required: true, unique: true })
  complaintId: string;

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

  @Prop()
  totalAmount: number;

  @Prop({ required: true })
  buyerId: string;
  
  @Prop({ required: true })
  buyerName: string;
  
  @Prop({ required: true })
  buyerEmail: string;

  @Prop({ required: true })
  sellerId: string;
  
  @Prop({ required: true })
  sellerName: string;
  
  @Prop({ required: true })
  sellerEmail: string;

  @Prop({ required: true })
  orderDate: string; // ISO date string of when the order was placed
  
  @Prop({ required: true })
  dispatchDate: string; // ISO date string of when the order was dispatched
  
  @Prop({ required: true })
  complaintDate: string; // ISO date string of when the complaint was filed

  @Prop({ required: true })
  complaintReason: string; // The reason for the complaint
  
  @Prop({ required: true })
  description: string; // Detailed description of the issue

  @Prop({ required: true, default: 'pending', enum: ['pending', 'filed', 'claimed', 'approved', 'rejected', 'refunded', 'cancelled'] })
  status: string;

  @Prop({ default: null })
  claimId: string; // Reference to the insurance claim if the seller made a claim

  @Prop({ default: false })
  hasClaim: boolean; // Whether the seller has made an insurance claim for this complaint

  @Prop({ required: true })
  complainantId: string; // ID of the user who filed the complaint (buyer or seller)
  
  @Prop({ required: true })
  complainantName: string; // Name of the user who filed the complaint
  
  @Prop({ required: true })
  complainantEmail: string; // Email of the user who filed the complaint
  
  @Prop({ required: true, enum: ['buyer', 'seller'] })
  complainantRole: string; // Role of the user who filed the complaint
  
  @Prop({ default: null })
  cancellationDate: string; // ISO date string of when the complaint was cancelled
  
  @Prop({ default: null })
  cancellationReason: string; // Reason for cancellation

  // Insurance validation fields
  @Prop({ default: false })
  hasInsurance: boolean; // Whether seller has active insurance

  @Prop({ default: false })
  canFileClaim: boolean; // Whether claim can be filed (within coverage)

  @Prop({ default: null })
  insuranceReason: string; // Reason why claim can't be filed if applicable

  @Prop({ default: 0 })
  coverageAmount: number; // Insurance coverage amount

  @Prop({ default: false })
  isImportant: boolean; // Flag for insurance agents to mark important complaints
  
  @Prop({ default: '' })
  markedByAgentId: string; // ID of the agent who marked this complaint as important

  @Prop({ default: 0 })
  orderAmount: number; // Total order amount
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);