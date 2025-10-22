import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { User, UserDocument } from '../user/user.schema';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { LoginTrackingService } from './login-tracking.service';

dotenv.config();

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private loginTrackingService: LoginTrackingService
  ) {}

  async signup(body: any) {
    const { name, email, phone, address, password, role } = body;
    const existing = await this.userModel.findOne({ email });
    if (existing) throw new BadRequestException('User already exists');
    const hashed = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const user = await this.userModel.create({ name, email, phone, address, password: hashed, role, otp, otpExpires });
    
    // Track signup OTP sent event
    await this.loginTrackingService.recordOtpSent(
      email,
      'email',
      otpExpires,
      { 
        userId: String(user._id), // Include the user ID as a string
        userName: name,
        userRole: role,
        reason: 'signup'
      }
    );
    
    await this.sendOtpEmail(email, otp);
    return { message: 'OTP sent to email' };
  }

  async login(body: any) {
    const { email, password } = body;
    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('User not found');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new BadRequestException('Invalid credentials');
    
    // No longer validating role - system will use the user's stored role
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    
    // Track OTP sent event
    await this.loginTrackingService.recordOtpSent(
      email,
      'email',
      user.otpExpires,
      { 
        userId: String(user._id), // Ensure ID is converted to string
        userName: user.name,
        userRole: user.role,
        reason: 'login'
      }
    );
    
    await this.sendOtpEmail(email, otp);
    return { message: 'OTP sent to email', userRole: user.role };
  }

  async verifyOtp(body: any) {
    const { email, otp } = body;
    const user = await this.userModel.findOne({ email });
    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    // Record OTP verification and login
    await this.loginTrackingService.recordOtpVerified(
      email,
      { 
        userId: user._id,
        userName: user.name,
        userRole: user.role 
      }
    );
    
    // Record successful login
    await this.loginTrackingService.recordLogin(
      String(user._id), // Ensure ID is converted to string
      user.email,
      user.name,
      user.role,
      { ip: body.ip || 'unknown', device: body.device || 'unknown' }
    );
    
    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email, name: user.name }, 
      'secretKey', 
      { expiresIn: '1d' }
    );
    
    return { token, role: user.role };
  }

  async resendOtp(body: any) {
    const { email } = body;
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    
    // Track OTP resent event
    await this.loginTrackingService.recordOtpSent(
      email,
      'email',
      user.otpExpires,
      { 
        userId: String(user._id),
        userName: user.name,
        userRole: user.role,
        reason: 'resend'
      }
    );
    
    await this.sendOtpEmail(email, otp);
    return { message: 'OTP resent successfully' };
  }

  async sendOtpEmail(email: string, otp: string) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'no-reply@agri-supply.com',
        to: email,
        subject: 'Your OTP Code - Agri Supply Chain',
        html: `
          <h2>Your OTP Code</h2>
          <p>Your OTP code is: <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>Thank you for using Agri Supply Chain platform!</p>
        `,
      });
      
      console.log(`OTP sent to ${email}: ${otp}`);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      // For development, log the OTP instead of throwing error
      console.log(`Development mode - OTP for ${email}: ${otp}`);
    }
  }
}
