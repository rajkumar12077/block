import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoginTrackingDocument = LoginTracking & Document;

@Schema({ collection: 'logins', timestamps: true })
export class LoginTracking {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userEmail: string;
  
  @Prop({ required: true })
  userName: string;
  
  @Prop({ required: true })
  userRole: string;
  
  @Prop({ required: true })
  eventType: string; // login, logout, otp_sent, otp_verified
  
  @Prop({ required: true })
  timestamp: Date;
  
  @Prop({ type: Object, default: {} })
  metadata: any; // Additional data like IP address, device info, etc.
  
  @Prop({ 
    type: {
      sentTo: String,
      medium: String, // email, sms, etc.
      expiresAt: Date,
      verified: Boolean,
      verifiedAt: Date
    },
    _id: false
  })
  otpDetails?: {
    sentTo: string;
    medium: string; // email, sms, etc.
    expiresAt: Date;
    verified: boolean;
    verifiedAt?: Date;
  };
}

export const LoginTrackingSchema = SchemaFactory.createForClass(LoginTracking);