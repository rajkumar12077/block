import { Controller, Get, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ColdStorageService } from './cold-storage.service';

@Controller('cold-storage')
export class ColdStorageController {
  private readonly logger = new Logger(ColdStorageController.name);

  constructor(private readonly coldStorageService: ColdStorageService) {}

  @UseGuards(JwtAuthGuard)
  @Get('temperature/:orderId')
  async getTemperatureData(@Param('orderId') orderId: string) {
    this.logger.log(`Getting temperature data for order ${orderId}`);
    return this.coldStorageService.getTemperatureData(orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature/latest/:orderId')
  async getLatestTemperature(@Param('orderId') orderId: string) {
    return this.coldStorageService.getLatestTemperatureForOrder(orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature')
  async getUserTemperatureData(@Request() req: any) {
    const userId = req.user.userId;
    const role = req.user.role;
    
    this.logger.log(`User ${userId} with role ${role} requesting temperature data`);
    return this.coldStorageService.getTemperatureDataForUser(userId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature/storage/:coldStorageName')
  async getTemperatureDataByStorage(
    @Request() req: any,
    @Param('coldStorageName') coldStorageName: string,
    @Query('device') device?: string
  ) {
    this.logger.log(`Getting temperature data for cold storage: ${coldStorageName}${device ? `, device: ${device}` : ''}`);
    this.logger.log(`User info: ${JSON.stringify({
      userId: req.user.userId,
      role: req.user.role,
      name: req.user.name || 'unknown'
    })}`);

    try {
      // Try getting data by cold storage name first
      const results = await this.coldStorageService.getTemperatureDataByColdStorageNameAndDevice(coldStorageName, device);

      // If no results found by name
      if (!results || results.length === 0) {
        this.logger.log(`No results found by name: ${coldStorageName}`);
        
        // Try looking up by user ID if the requester is a cold storage
        if (req?.user?.role === 'coldstorage') {
          this.logger.log(`Falling back to coldStorageId lookup for user ${req.user.userId}`);
          const idResults = await this.coldStorageService.getTemperatureDataByColdStorageIdAndDevice(req.user.userId, device);
          
          if (!idResults || idResults.length === 0) {
            this.logger.log(`No results found by coldStorageId either: ${req.user.userId}`);
            // Try the user's name as well, just in case
            if (req.user.name) {
              this.logger.log(`Trying user's name as coldStorageName: ${req.user.name}`);
              const nameResults = await this.coldStorageService.getTemperatureDataByColdStorageNameAndDevice(req.user.name, device);
              
              if (nameResults && nameResults.length > 0) {
                this.logger.log(`Found ${nameResults.length} results using user's name`);
                return nameResults;
              }
            }
          } else {
            this.logger.log(`Found ${idResults.length} results by coldStorageId`);
            return idResults;
          }
        }
        
        // Return empty array if all lookups failed
        return [];
      }
      
      this.logger.log(`Found ${results.length} results by coldStorageName`);
      return results;
    } catch (error) {
      this.logger.error(`Error fetching temperature data: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature-with-users')
  async getTemperatureDataWithUserDetails() {
    this.logger.log('Getting temperature data with user details');
    return this.coldStorageService.getTemperatureDataWithUserDetails();
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature-latest/:userName')
  async getLatestTemperatureForUser(@Param('userName') userName: string) {
    this.logger.log(`Getting latest temperature data for user: ${userName}`);
    return this.coldStorageService.getLatestTemperatureForUserByName(userName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('temperature-current-user')
  async getCurrentUserLatestTemperature(@Request() req: any) {
    const userName = req.user.name;
    this.logger.log(`Getting latest temperature data for current user: ${userName}`);
    
    if (!userName) {
      throw new Error('User name not found in token');
    }
    
    return this.coldStorageService.getLatestTemperatureForUserByName(userName);
  }
}