import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserService } from './user.service';
import { TransactionService } from '../insurance/transaction.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService
  ) {}

  // Test endpoint to verify routes are working
  @Get('test')
  async testEndpoint() {
    console.log('✅ TEST: /user/test endpoint working');
    return { 
      message: 'User controller is working', 
      timestamp: new Date().toISOString(),
      availableRoutes: [
        'GET /user/test',
        'GET /user/me', 
        'GET /user/cold-storage-users',
        'GET /user/logistics-providers',
        'GET /user/debug-logistics',
        'GET /user/database-health'
      ]
    };
  }

  // Simple test endpoint for logistics
  @Get('test-logistics')
  async testLogistics() {
    console.log('🚛 TEST: /user/test-logistics endpoint working');
    try {
      const count = await this.userService.getUserModel().countDocuments({ role: 'logistics' }).exec();
      return {
        message: 'Logistics test endpoint working',
        logisticsCount: count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        message: 'Error in logistics test',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    try {
      console.log('👤 /user/me called');
      console.log('JWT User:', req.user);
      
      // Also fetch full user data from DB
      if (req.user?.userId) {
        const fullUser = await this.userService.findById(req.user.userId);
        console.log('📋 Full user from DB:', {
          email: fullUser.email,
          balance: fullUser.balance,
          role: fullUser.role
        });
        
        return {
          ...req.user,
          dbBalance: fullUser.balance,
          dbEmail: fullUser.email
        };
      }
      
      return req.user;
    } catch (error) {
      console.error('Error in /user/me:', error);
      return req.user;
    }
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Req() req: any) {
    try {
      console.log('🔍 Balance endpoint called');
      console.log('Request user:', req.user);
      console.log('User ID:', req.user?.userId);
      
      if (!req.user || !req.user.userId) {
        throw new BadRequestException('User authentication required');
      }

      const user = await this.userService.findById(req.user.userId);
      console.log('✅ Found user from DB:', {
        email: user.email,
        balance: user.balance,
        role: user.role
      });
      
      const response = { 
        balance: user.balance || 0,
        userId: req.user.userId,
        email: user.email,
        debug: {
          rawBalance: user.balance,
          userFromDB: !!user
        }
      };
      
      console.log('📤 Returning balance response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      throw error;
    }
  }

  @Get('drivers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('logistics', 'admin')
  async getDrivers() {
    return this.userService.getDrivers();
  }

  @Post('add-balance')
  @UseGuards(JwtAuthGuard)
  async addBalance(@Body() body: { amount: number; description?: string }, @Req() req: any) {
    try {
      console.log(`User ${req.user.userId} adding balance: ${body.amount}`);
      
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        throw new BadRequestException('Invalid amount');
      }

      if (amount > 10000) {
        throw new BadRequestException('Amount cannot exceed $10,000 per transaction');
      }

      const updatedUser = await this.userService.addBalance(req.user.userId, amount);
      
      // Create transaction record
      await this.transactionService.createTransaction({
        fromUserId: 'system',
        toUserId: req.user.userId,
        amount: amount,
        type: 'fund_addition',
        description: body.description || 'Balance top-up',
        metadata: {
          userBalance: updatedUser.balance,
          transactionType: 'user_balance_addition'
        }
      });
      
      console.log(`✅ Balance added successfully. New balance: ${updatedUser.balance}`);
      
      return {
        success: true,
        message: 'Balance added successfully',
        newBalance: updatedUser.balance,
        amountAdded: amount
      };
    } catch (error) {
      console.error(`❌ Failed to add balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Body() body: { oldPassword: string; newPassword: string }, @Req() req: any) {
    try {
      await this.userService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }
  
  // Cold storage users endpoint - Simplified and robust
  @Get('cold-storage-users')
  async getColdStorageUsers() {
    try {
      console.log('🧊 API: GET /user/cold-storage-users called');
      
      // Get cold storage users from database
      const coldStorageUsers = await this.userService.getColdStorageUsers();
      console.log(`🧊 API: Successfully retrieved ${coldStorageUsers.length} cold storage users`);
      
      // If no users found, create default ones
      if (coldStorageUsers.length === 0) {
        console.log('🧊 API: No cold storage users found, creating defaults...');
        const createdUsers = await this.userService.ensureColdStorageUsersExist();
        console.log(`🧊 API: Created ${createdUsers.length} cold storage users`);
        return createdUsers;
      }
      
      return coldStorageUsers;
    } catch (error) {
      console.error('🧊 API ERROR in getColdStorageUsers:', error.message);
      
      // Return proper error response
      throw new BadRequestException(`Failed to get cold storage users: ${error.message}`);
    }
  }

  // Logistics users endpoint
  @Get('logistics-users')
  @UseGuards(JwtAuthGuard)
  async getLogisticsUsers() {
    try {
      console.log('🚛 API: GET /user/logistics-users called');
      
      const logisticsUsers = await this.userService.getLogisticsUsers();
      console.log(`🚛 API: Successfully retrieved ${logisticsUsers.length} logistics users`);
      
      return logisticsUsers;
    } catch (error) {
      console.error('🚛 API ERROR in getLogisticsUsers:', error.message);
      throw new BadRequestException(`Failed to get logistics users: ${error.message}`);
    }
  }

  // Logistics providers endpoint for seller dispatch
  @Get('logistics-providers')
  async getLogisticsProviders() {
    try {
      console.log('📦 API: GET /user/logistics-providers called');
      
      // Ensure logistics users exist, create them if they don't
      await this.userService.ensureLogisticsUsersExist();
      
      // Simple direct database query to get logistics users
      const logisticsUsers = await this.userService.getUserModel()
        .find({ role: 'logistics' })
        .select('_id name email phone address')
        .lean()
        .exec();
      
      console.log(`📦 API: Found ${logisticsUsers.length} logistics users directly from database`);
      
      if (logisticsUsers.length === 0) {
        console.log('📦 API: No logistics users found even after creation attempt, returning empty array');
        return {
          success: true,
          message: 'No logistics providers found',
          providers: []
        };
      }
      
      // Return logistics users with their address information
      const providersWithAddress = logisticsUsers.map(provider => ({
        _id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone || 'Not provided',
        address: provider.address || 'Address not available',
        companyName: provider.name || 'Company Name Not Available'
      }));
      
      console.log('📦 API: Returning providers:', providersWithAddress);
      return providersWithAddress;
      
    } catch (error) {
      console.error('📦 API ERROR in getLogisticsProviders:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        providers: []
      };
    }
  }
  
  // Add new endpoint to get users by role with optional query parameter
  @Get('users')
  async getUsersByRole(@Req() req) {
    try {
      const role = req.query.role;
      if (role) {
        console.log(`Getting users by role: ${role}`);
        if (role === 'coldstorage') {
          return this.userService.getColdStorageUsers();
        }
        return this.userService.getUsersByRole(role);
      }
      return this.userService.getAllUsers();
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }
  
  @Get('database-health')
  async checkDatabaseHealth() {
    try {
      console.log('🏥 API: Checking database health...');
      
      // Simple database connection test
      const totalUsers = await this.userService.getUserModel().countDocuments().exec();
      console.log(`🏥 API: Database responsive - Total users: ${totalUsers}`);
      
      // Get all users and count by role
      const allUsers = await this.userService.getUserModel().find().select('role').lean().exec();
      
      // Count users by role
      const roleBreakdown: Record<string, number> = {};
      allUsers.forEach(user => {
        roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
      });
      
      console.log('🏥 API: Role breakdown:', roleBreakdown);
      
      // Get cold storage users
      const coldStorageUsers = await this.userService.getColdStorageUsers();
      
      // Get logistics users
      const logisticsUsers = await this.userService.getLogisticsUsers();
      
      return {
        databaseHealthy: true,
        totalUsers: allUsers.length,
        roleBreakdown,
        coldStorageUsers: coldStorageUsers.length,
        coldStorageUsersList: coldStorageUsers.map(u => ({ id: u._id, name: u.name, email: u.email })),
        logisticsUsers: logisticsUsers.length,
        logisticsUsersList: logisticsUsers.map(u => ({ id: u._id, name: u.name, email: u.email, address: u.address }))
      };
    } catch (error) {
      console.error('🏥 API: Database health check failed:', error);
      throw new BadRequestException(`Database health check failed: ${error.message}`);
    }
  }

  @Post('create-cold-storage-users')
  async createColdStorageUsers() {
    try {
      console.log('🏭 API: Creating cold storage users in MongoDB...');
      
      const createdUsers = await this.userService.ensureColdStorageUsersExist();
      console.log(`🏭 API: Successfully ensured ${createdUsers.length} cold storage users exist`);
      
      return {
        success: true,
        created: createdUsers.length,
        users: createdUsers.map(u => ({ id: u._id, name: u.name, email: u.email }))
      };
    } catch (error) {
      console.error('🏭 API: Failed to create cold storage users:', error);
      throw new BadRequestException(`Failed to create cold storage users: ${error.message}`);
    }
  }

  @Post('create-logistics-users')
  async createLogisticsUsers() {
    try {
      console.log('🚛 API: Creating logistics users in MongoDB...');
      
      const createdUsers = await this.userService.ensureLogisticsUsersExist();
      console.log(`🚛 API: Successfully ensured ${createdUsers.length} logistics users exist`);
      
      return {
        success: true,
        created: createdUsers.length,
        users: createdUsers.map(u => ({ id: u._id, name: u.name, email: u.email, address: u.address }))
      };
    } catch (error) {
      console.error('🚛 API: Failed to create logistics users:', error);
      throw new BadRequestException(`Failed to create logistics users: ${error.message}`);
    }
  }

  @Get('debug-logistics')
  async debugLogistics() {
    try {
      console.log('🔍 DEBUG: Checking logistics users...');
      
      // Get all users and their roles
      const allUsers = await this.userService.getUserModel().find().select('name email role address').lean().exec();
      const logisticsUsers = allUsers.filter(u => u.role === 'logistics');
      
      console.log(`🔍 DEBUG: Total users: ${allUsers.length}`);
      console.log(`🔍 DEBUG: Logistics users: ${logisticsUsers.length}`);
      
      // Get role breakdown
      const roleBreakdown: Record<string, number> = {};
      allUsers.forEach(user => {
        roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
      });
      
      return {
        totalUsers: allUsers.length,
        logisticsUsers: logisticsUsers.length,
        roleBreakdown,
        logisticsUsersList: logisticsUsers,
        allRoles: Object.keys(roleBreakdown)
      };
    } catch (error) {
      console.error('🔍 DEBUG ERROR:', error);
      throw new BadRequestException(`Debug failed: ${error.message}`);
    }
  }

}
