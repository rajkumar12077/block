import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TempData, TempDataDocument } from './temp-data.schema';
import { Temperature, TemperatureDocument } from './temperature.schema';
import { User, UserDocument } from '../user/user.schema';

@Injectable()
export class ColdStorageService {
  private readonly logger = new Logger(ColdStorageService.name);

  constructor(
    @InjectModel(TempData.name) private tempDataModel: Model<TempDataDocument>,
    @InjectModel(Temperature.name) private temperatureModel: Model<TemperatureDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}
  
  // Helper method to get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userModel.findById(userId).exec();
    } catch (error) {
      this.logger.error(`Error getting user by ID ${userId}: ${error.message}`);
      return null;
    }
  }

  async getTemperatureData(orderId: string): Promise<TempData[]> {
    try {
      // Get the most recent temperature data for the specified order
      const tempData = await this.tempDataModel.find({ orderId })
        .sort({ timestamp: -1 })  // Sort by timestamp descending (newest first)
        .limit(10)  // Get the 10 most recent readings
        .exec();
      
      this.logger.log(`Retrieved ${tempData.length} temperature readings for order ${orderId}`);
      return tempData;
    } catch (error) {
      this.logger.error(`Failed to get temperature data for order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  async getLatestTemperatureForOrder(orderId: string): Promise<TempData | null> {
    try {
      // Get only the latest temperature reading for the specified order
      const latestTemp = await this.tempDataModel.findOne({ orderId })
        .sort({ timestamp: -1 })  // Sort by timestamp descending (newest first)
        .exec();
      
      return latestTemp;
    } catch (error) {
      this.logger.error(`Failed to get latest temperature for order ${orderId}: ${error.message}`);
      return null;
    }
  }

  async getTemperatureDataForUser(userId: string, role: string): Promise<Record<string, TempData>> {
    try {
      let query = {};
      
      // Depending on the user's role, filter by sellerId or buyerId
      if (role === 'seller') {
        query = { sellerId: userId };
      } else if (role === 'buyer') {
        query = { buyerId: userId };
      } else if (role === 'coldstorage') {
        query = { coldStorageId: userId };
      }
      
      // Get the distinct orders for this user
      const orders = await this.tempDataModel.distinct('orderId', query);
      this.logger.log(`Found ${orders.length} orders with temperature data for user ${userId} (${role})`);
      
      // For each order, get the latest temperature reading
      const latestReadings: Record<string, TempData> = {};
      
      for (const orderId of orders) {
        const latest = await this.getLatestTemperatureForOrder(orderId);
        if (latest) {
          latestReadings[orderId] = latest;
        }
      }
      
      return latestReadings;
    } catch (error) {
      this.logger.error(`Failed to get temperature data for user ${userId}: ${error.message}`);
      throw error;
    }
  }
  
  async getTemperatureDataByColdStorageNameAndDevice(coldStorageName: string, device?: string): Promise<TempData[]> {
    try {
      this.logger.log(`Looking for temperature data for name: "${coldStorageName}"`);
      
      // Build a flexible query that will match various field names based on the actual data structure
      // The MongoDB documents have a 'name' field as shown in the screenshot
      const orClauses: any[] = [];

      // Case-sensitive exact field variants - including the simple 'name' field
      orClauses.push({ name: coldStorageName });  // Primary field based on screenshot - matches "cold" in the image
      orClauses.push({ coldStorageName });        // Legacy field
      orClauses.push({ coldstoragename: coldStorageName }); // Alternative format

      // Case-insensitive match on all field variants
      try {
        const escaped = coldStorageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`^${escaped}$`, 'i');
        orClauses.push({ name: re });           // Case-insensitive name
        orClauses.push({ coldStorageName: re });
        orClauses.push({ coldstoragename: re });
      } catch (e) {
        // If regexp construction fails for any reason, ignore and rely on exact matches above
      }

      // Build base query: match any of the cold storage name variants
      let query: any = { $or: orClauses };

      // Device field variants
      if (device) {
        // match device field as shown in the screenshot
        try {
          const escapedD = device.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const devRe = new RegExp(`^${escapedD}$`, 'i');
          query.$and = [
            query,
            { $or: [
              { device: devRe },      // Screenshot shows 'device: "esp1"' 
              { devicename: devRe },  // Legacy format
              { deviceId: devRe }     // Alternative format
            ]}
          ];
        } catch (e) {
          // fallback to exact matches
          query.$and = [query, { $or: [
            { device: device }, 
            { devicename: device },
            { deviceId: device }
          ]}];
        }
      }

      this.logger.log(`Fetching temperature data for cold storage: ${coldStorageName}${device ? `, device: ${device}` : ''}`);

      // First try to sort by date and time fields (as shown in the screenshot)
      // If these fields don't exist, fall back to timestamp field
      let tempData: TempData[] = [];
      
      try {
        // Try getting the latest entry by date and time (as shown in the screenshot)
        // This will find documents like the one in the image with date: "2025-10-08", time: "00:27:07"
        const dateTimeResults = await this.tempDataModel.find(query)
          .sort({ date: -1, time: -1 }) // Sort by newest date and time first
          .limit(1) // Get only the latest reading (we can expand later if needed)
          .exec();
          
        if (dateTimeResults.length > 0) {
          const latestReading = dateTimeResults[0];
          // Type-safe logging with optional chaining
          this.logger.log(`Retrieved latest temperature reading with date: ${latestReading?.date || 'unknown'}, time: ${latestReading?.time || 'unknown'}`);
          tempData = dateTimeResults;
          
          // Also get some additional readings for history/context
          const additionalResults = await this.tempDataModel.find(query)
            .sort({ date: -1, time: -1 })
            .skip(1) // Skip the first one we already have
            .limit(9) // Get up to 9 more
            .exec();
          
          if (additionalResults.length > 0) {
            tempData = [...tempData, ...additionalResults];
          }
        } else {
          this.logger.warn('No results found with date/time fields, trying timestamp fallback');
          
          // Fall back to timestamp sorting
          const timestampResults = await this.tempDataModel.find(query)
            .sort({ timestamp: -1 })
            .limit(10)
            .exec();
            
          tempData = timestampResults;
        }
      } catch (err) {
        this.logger.warn(`Date/time query failed: ${err.message}, trying timestamp fallback`);
        
        // Fall back to timestamp sorting
        const timestampResults = await this.tempDataModel.find(query)
          .sort({ timestamp: -1 })
          .limit(10)
          .exec();
          
        tempData = timestampResults;
      }

      this.logger.log(`Retrieved ${tempData.length} temperature readings`);
      return tempData;
    } catch (error) {
      this.logger.error(`Failed to get temperature data for cold storage ${coldStorageName}: ${error.message}`);
      throw error;
    }
  }

  async getTemperatureDataByColdStorageIdAndDevice(coldStorageId: string, device?: string): Promise<TempData[]> {
    try {
      // Based on the screenshot, we should first try to find documents by the 'name' field
      // that matches the user's name (in this case, "cold")
      let userInfo;
      try {
        // Try to get the user's name from the users collection
        userInfo = await this.getUserById(coldStorageId);
        this.logger.log(`Found user with name: ${userInfo?.name || 'unknown'}`);
      } catch (e) {
        this.logger.error(`Could not get user info: ${e.message}`);
      }

      // Create OR clauses for matching by name or ID
      const orClauses: any[] = [
        { coldStorageId },
        { coldstorageid: coldStorageId }
      ];
      
      // If we found a user name, add it to our query
      if (userInfo?.name) {
        orClauses.push({ name: userInfo.name });
      }
      
      let query: any = { $or: orClauses };

      if (device) {
        try {
          const escapedD = device.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
          const devRe = new RegExp(`^${escapedD}$`, 'i');
          query = { $and: [query, { $or: [
            { device: devRe }, 
            { devicename: devRe },
            { deviceId: devRe }
          ]}]};
        } catch (e) {
          query = { $and: [query, { $or: [
            { device }, 
            { devicename: device },
            { deviceId: device }
          ]}]};
        }
      }

      this.logger.log(`Fetching temperature data for coldStorageId: ${coldStorageId}${device ? `, device: ${device}` : ''}`);

      const tempData = await this.tempDataModel.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .exec();

      this.logger.log(`Retrieved ${tempData.length} temperature readings for coldStorageId ${coldStorageId}`);
      return tempData;
    } catch (error) {
      this.logger.error(`Failed to get temperature data for coldStorageId ${coldStorageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get temperature data for users using aggregation to join with user details
   * This method matches temperature records with user records by name field
   */
  async getTemperatureDataWithUserDetails(): Promise<any[]> {
    try {
      this.logger.log('Fetching temperature data with user details using aggregation');
      
      const result = await this.temperatureModel.aggregate([
        // Stage 1: Lookup users based on matching name field
        {
          $lookup: {
            from: 'users',          // name of user collection in MongoDB
            localField: 'name',     // field in temperature collection
            foreignField: 'name',   // field in user collection
            as: 'userDetails',      // output field
          },
        },
        // Stage 2: Only include records where user match was found
        {
          $match: {
            'userDetails.0': { $exists: true } // ensure userDetails array is not empty
          }
        },
        // Stage 3: Flatten the userDetails array
        { 
          $unwind: '$userDetails' 
        },
        // Stage 4: Sort by date and time (newest first)
        {
          $sort: {
            date: -1,
            time: -1
          }
        },
        // Stage 5: Project only the fields we want
        {
          $project: {
            _id: 1,
            time: 1,
            temperature: 1,
            name: 1,
            date: 1,
            humidity: 1,
            latitude: 1,
            longitude: 1,
            device: 1,
            timestamp: 1,
            userDetails: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
              address: 1,
              role: 1
            }
          }
        }
      ]);

      this.logger.log(`Retrieved ${result.length} temperature records with user details`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get temperature data with user details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get temperature data for a specific user by name
   * Returns only the latest temperature reading for the user
   */
  async getLatestTemperatureForUserByName(userName: string): Promise<any> {
    try {
      this.logger.log(`Fetching latest temperature data for user: ${userName}`);
      
      const result = await this.temperatureModel.aggregate([
        // Stage 1: Match temperature records by name
        {
          $match: {
            name: userName
          }
        },
        // Stage 2: Lookup user details
        {
          $lookup: {
            from: 'users',
            localField: 'name',
            foreignField: 'name',
            as: 'userDetails',
          },
        },
        // Stage 3: Only include records where user match was found
        {
          $match: {
            'userDetails.0': { $exists: true }
          }
        },
        // Stage 4: Flatten userDetails
        { 
          $unwind: '$userDetails' 
        },
        // Stage 5: Sort by date and time (newest first)
        {
          $sort: {
            date: -1,
            time: -1
          }
        },
        // Stage 6: Get only the latest record
        {
          $limit: 1
        },
        // Stage 7: Project fields
        {
          $project: {
            _id: 1,
            time: 1,
            temperature: 1,
            name: 1,
            date: 1,
            humidity: 1,
            latitude: 1,
            longitude: 1,
            device: 1,
            timestamp: 1,
            userDetails: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
              address: 1,
              role: 1
            }
          }
        }
      ]);

      if (result.length > 0) {
        this.logger.log(`Found latest temperature data for user: ${userName}`);
        return result[0];
      } else {
        this.logger.warn(`No temperature data found for user: ${userName}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get latest temperature for user ${userName}: ${error.message}`);
      throw error;
    }
  }
}