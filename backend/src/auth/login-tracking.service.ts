import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginTracking, LoginTrackingDocument } from './login-tracking.schema';

@Injectable()
export class LoginTrackingService {
  constructor(
    @InjectModel(LoginTracking.name) private loginTrackingModel: Model<LoginTrackingDocument>
  ) {}

  async recordLogin(userId: string, userEmail: string, userName: string, userRole: string, metadata: any = {}) {
    const loginRecord = new this.loginTrackingModel({
      userId,
      userEmail,
      userName,
      userRole,
      eventType: 'login',
      timestamp: new Date(),
      metadata
    });
    
    console.log(`Recording login event for user: ${userEmail}`);
    return await loginRecord.save();
  }

  async recordLogout(userId: string, userEmail: string, userName: string, userRole: string, metadata: any = {}) {
    const logoutRecord = new this.loginTrackingModel({
      userId,
      userEmail,
      userName,
      userRole,
      eventType: 'logout',
      timestamp: new Date(),
      metadata
    });
    
    console.log(`Recording logout event for user: ${userEmail}`);
    return await logoutRecord.save();
  }

  async recordOtpSent(userEmail: string, medium: string, expiresAt: Date, metadata: any = {}) {
    const otpDetails = {
      sentTo: userEmail,
      medium,
      expiresAt,
      verified: false
    };
    
    const otpRecord = new this.loginTrackingModel({
      userId: metadata.userId || 'pending_registration', // Add userId with default value for new registrations
      userEmail,
      userName: 'pending',
      userRole: 'pending',
      eventType: 'otp_sent',
      timestamp: new Date(),
      otpDetails,
      metadata
    });
    
    console.log(`Recording OTP sent to: ${userEmail}`);
    return await otpRecord.save();
  }

  async recordOtpVerified(userEmail: string, metadata: any = {}) {
    // First find the latest OTP sent record
    const latestOtpRecord = await this.loginTrackingModel
      .findOne({ 
        userEmail, 
        eventType: 'otp_sent',
        'otpDetails.verified': false
      })
      .sort({ timestamp: -1 })
      .exec();
    
    if (latestOtpRecord && latestOtpRecord.otpDetails) {
      // Update the OTP record to mark it as verified
      try {
        latestOtpRecord.otpDetails.verified = true;
        latestOtpRecord.otpDetails.verifiedAt = new Date();
        await latestOtpRecord.save();
      } catch (error) {
        console.error('Error updating OTP record:', error);
      }
    }
    
    // Also create a new verification event
    const verificationRecord = new this.loginTrackingModel({
      userId: metadata.userId || 'unknown', // Add userId field with a fallback value
      userEmail,
      userName: metadata.userName || 'verified user',
      userRole: metadata.userRole || 'user',
      eventType: 'otp_verified',
      timestamp: new Date(),
      metadata
    });
    
    console.log(`Recording OTP verification for: ${userEmail}`);
    return await verificationRecord.save();
  }

  async getUserLoginHistory(userId: string) {
    return this.loginTrackingModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .exec();
  }

  async getRecentLogins(limit: number = 100) {
    return this.loginTrackingModel
      .find({ eventType: 'login' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}