import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getDrivers() {
    return this.userModel.find({ role: 'driver' }).select('_id name email phone').exec();
  }

  async findById(userId: string): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      return user;
    } catch (error) {
      console.error(`Database error in findById for user ${userId}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      const user = await this.userModel.findOne({ email: email }).exec();
      return user;
    } catch (error) {
      console.error(`Database error in findByEmail for email ${email}:`, error);
      throw error;
    }
  }

  async updateBalance(userId: string, amount: number): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    user.balance = (user.balance || 0) + amount;
    return user.save();
  }

  async addBalance(userId: string, amount: number): Promise<User> {
    return this.updateBalance(userId, amount);
  }

  async deductBalance(userId: string, amount: number): Promise<User> {
    return this.updateBalance(userId, -amount);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // For now, we'll just update the password without validation
    // In a real app, you'd want to hash passwords and verify the old password
    user.password = newPassword; // In production, hash this password
    await user.save();
  }
  
  async getColdStorageUsers() {
    try {
      console.log('🔍 SERVICE: Searching for cold storage users in database...');
      
      // Simple and direct query for cold storage users
      const coldStorageUsers = await this.userModel
        .find({ role: 'coldstorage' })
        .select('_id name email phone address')
        .sort({ name: 1 })
        .lean()
        .exec();
      
      console.log(`🔍 SERVICE: Found ${coldStorageUsers.length} cold storage users`);
      
      if (coldStorageUsers.length === 0) {
        console.log('🔍 SERVICE: No cold storage users found in database');
        // Check what roles actually exist
        const allRoles = await this.userModel.distinct('role').exec();
        console.log(`🔍 SERVICE: Available roles in database: ${allRoles.join(', ')}`);
      }
      
      return coldStorageUsers;
    } catch (error) {
      console.error('🔍 SERVICE: Error getting cold storage users:', error.message);
      throw error;
    }
  }

  async getLogisticsUsers() {
    try {
      console.log('🚛 SERVICE: Searching for logistics users in database...');
      
      // Query for logistics users with address field included
      const logisticsUsers = await this.userModel
        .find({ role: 'logistics' })
        .select('_id name email phone address')
        .sort({ name: 1 })
        .lean()
        .exec();
      
      console.log(`🚛 SERVICE: Found ${logisticsUsers.length} logistics users`);
      
      if (logisticsUsers.length === 0) {
        console.log('🚛 SERVICE: No logistics users found in database');
        // Check what roles actually exist
        const allRoles = await this.userModel.distinct('role').exec();
        console.log(`🚛 SERVICE: Available roles in database: ${allRoles.join(', ')}`);
        
        // Check total users
        const totalUsers = await this.userModel.countDocuments().exec();
        console.log(`🚛 SERVICE: Total users in database: ${totalUsers}`);
      } else {
        // Log details of found logistics users
        logisticsUsers.forEach((user, index) => {
          console.log(`🚛 SERVICE: Logistics User ${index + 1}: ${user.name} (${user.email}) - Address: ${user.address || 'No address'}`);
        });
      }
      
      return logisticsUsers;
    } catch (error) {
      console.error('🚛 SERVICE: Error getting logistics users:', error.message);
      throw error;
    }
  }

  async ensureLogisticsUsersExist(): Promise<any[]> {
    try {
      console.log('🚛 SERVICE: Ensuring logistics users exist in database...');
      
      // Check if logistics users already exist
      const existingLogistics = await this.userModel.find({ role: 'logistics' }).exec();
      
      if (existingLogistics.length > 0) {
        console.log(`🚛 SERVICE: Found ${existingLogistics.length} existing logistics users`);
        return existingLogistics;
      }
      
      console.log('🚛 SERVICE: No logistics users found, creating default ones...');
      
      const defaultLogisticsUsers = [
        {
          name: 'FastTrack Logistics',
          email: 'fasttrack@logistics.com',
          phone: '9876543210',
          address: 'Logistics Hub A, Industrial Area, Mumbai, Maharashtra 400001',
          password: '$2b$10$hashedPasswordExample', // This should be properly hashed
          role: 'logistics',
          balance: 0
        },
        {
          name: 'QuickShip Express',
          email: 'quickship@express.com',
          phone: '9876543211',
          address: 'Express Center B, Transport Zone, Delhi, Delhi 110001',
          password: '$2b$10$hashedPasswordExample', // This should be properly hashed
          role: 'logistics',
          balance: 0
        },
        {
          name: 'RapidMove Logistics',
          email: 'rapidmove@logistics.com',
          phone: '9876543212',
          address: 'Logistics Park C, Freight Complex, Bangalore, Karnataka 560001',
          password: '$2b$10$hashedPasswordExample', // This should be properly hashed
          role: 'logistics',
          balance: 0
        }
      ];
      
      const createdUsers = await this.userModel.insertMany(defaultLogisticsUsers);
      console.log(`🚛 SERVICE: Successfully created ${createdUsers.length} logistics users`);
      
      return createdUsers;
    } catch (error) {
      console.error('🚛 SERVICE: Error ensuring logistics users exist:', error.message);
      throw error;
    }
  }
  
  // New method to get users by role
  async getUsersByRole(role: string) {
    try {
      console.log(`Executing query for users with role: ${role}`);
      
      const users = await this.userModel.find({ role })
        .select('_id name email phone')
        .sort({ name: 1 })
        .exec();
      
      console.log(`Query returned ${users.length} users with role ${role}`);
      return users;
    } catch (error) {
      console.error(`Error in getUsersByRole method for role ${role}:`, error);
      throw error;
    }
  }
  
  // New method to get all users
  async getAllUsers() {
    try {
      console.log('Executing query for all users');
      
      const users = await this.userModel.find()
        .select('_id name email phone role')
        .sort({ name: 1 })
        .exec();
      
      console.log(`Query returned ${users.length} total users`);
      return users;
    } catch (error) {
      console.error('Error in getAllUsers method:', error);
      throw error;
    }
  }
  
  // Method to ensure cold storage users exist in database
  async ensureColdStorageUsersExist() {
    try {
      console.log('🏭 SERVICE: Ensuring cold storage users exist...');
      
      // Check existing cold storage users
      const existingUsers = await this.getColdStorageUsers();
      
      if (existingUsers.length > 0) {
        console.log(`🏭 SERVICE: ${existingUsers.length} cold storage users already exist`);
        return existingUsers;
      }
      
      console.log('🏭 SERVICE: Creating default cold storage users...');
      
      const defaultUsers = [
        {
          name: 'Main Cold Storage Facility',
          email: 'main.coldstorage@agriblock.com',
          phone: '+1-555-001',
          address: '100 Cold Valley Drive',
          password: 'password123',
          role: 'coldstorage',
          balance: 0
        },
        {
          name: 'Express Cold Storage',
          email: 'express.coldstorage@agriblock.com', 
          phone: '+1-555-002',
          address: '200 Freezer Lane',
          password: 'password123',
          role: 'coldstorage',
          balance: 0
        }
      ];
      
      // Create the users
      const createdUsers = await this.userModel.insertMany(defaultUsers);
      console.log(`🏭 SERVICE: Created ${createdUsers.length} cold storage users`);
      
      // Return the newly created users
      return await this.getColdStorageUsers();
      
    } catch (error) {
      console.error('🏭 SERVICE: Error ensuring cold storage users exist:', error.message);
      throw error;
    }
  }

  // Add a method to expose the user model for debugging purposes
  getUserModel() {
    return this.userModel;
  }
}
