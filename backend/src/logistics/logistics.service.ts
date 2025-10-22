import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from './vehicle.schema';
import { Order, OrderDocument } from '../order/order.schema';
import { OrderHistory, OrderHistoryDocument } from '../order/orderhistory.schema';
import { User, UserDocument } from '../user/user.schema';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderHistory.name) private orderHistoryModel: Model<OrderHistoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createVehicle(vehicleData: any) {
    const existingVehicle = await this.vehicleModel.findOne({ vehicleNumber: vehicleData.vehicleNumber });
    if (existingVehicle) {
      throw new BadRequestException('Vehicle with this number already exists');
    }

    // Create vehicle without permanent driver assignment
    const vehicleToCreate = {
      vehicleNumber: vehicleData.vehicleNumber,
      vehicleType: vehicleData.vehicleType,
      capacity: vehicleData.capacity,
      currentLocation: vehicleData.currentLocation
    };

    return this.vehicleModel.create(vehicleToCreate);
  }

  async assignDriverToVehicle(vehicleId: string, driverId: string) {
    // Check if driverId is a valid ObjectId
    if (!Types.ObjectId.isValid(driverId)) {
      throw new BadRequestException('Invalid driver ID format');
    }

    const driver = await this.userModel.findOne({ 
      _id: new Types.ObjectId(driverId), 
      role: 'driver' 
    });
    if (!driver) {
      throw new BadRequestException('Invalid driver selected');
    }

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    // Check if driver is already assigned to another vehicle
    const existingAssignment = await this.vehicleModel.findOne({ 
      currentDriverId: driverId,
      status: { $in: ['assigned', 'loaded', 'dispatched'] }
    });
    if (existingAssignment) {
      throw new BadRequestException('Driver is already assigned to another vehicle');
    }

    // Assign driver to vehicle
    vehicle.currentDriverId = driverId;
    vehicle.currentDriverName = driver.name;
    vehicle.currentDriverPhone = driver.phone;
    vehicle.assignedDate = new Date();
    vehicle.status = 'assigned';
    
    await vehicle.save();
    return { message: 'Driver assigned to vehicle successfully' };
  }

  async unassignDriverFromVehicle(vehicleId: string) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    if (vehicle.status === 'loaded' && vehicle.assignedOrders.length > 0) {
      throw new BadRequestException('Cannot unassign driver while vehicle has assigned orders');
    }

    // Remove driver assignment
    vehicle.currentDriverId = undefined;
    vehicle.currentDriverName = undefined;
    vehicle.currentDriverPhone = undefined;
    vehicle.assignedDate = undefined;
    vehicle.status = 'available';
    
    await vehicle.save();
    return { message: 'Driver unassigned from vehicle successfully' };
  }

  async getAllVehicles() {
    return this.vehicleModel.find().sort({ createdAt: -1 });
  }

  async getVehicleById(id: string) {
    return this.vehicleModel.findById(id);
  }

  async updateVehicle(id: string, updateData: any) {
    return this.vehicleModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteVehicle(id: string) {
    return this.vehicleModel.findByIdAndDelete(id);
  }

  async assignOrderToVehicle(vehicleId: string, orderId: string) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    const order = await this.orderModel.findOne({ orderId });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Check if order has a valid status for assignment (case-insensitive, handles spaces)
    const statusLower = order.status?.toLowerCase().replace(/\s+/g, '') || '';
    const validStatuses = ['shippedtologistics', 'dispatchedtologistics'];
    
    if (!validStatuses.includes(statusLower)) {
      throw new BadRequestException(`Order must have status "shippedtologistics" or "dispatched to logistics" to be assigned to a vehicle. Current status: "${order.status}"`);
    }

    // Add order to vehicle
    vehicle.assignedOrders.push(orderId);
    vehicle.status = 'loaded';
    await vehicle.save();

    // Keep order status as 'shippedtologistics' so logistics can still see it
    // Status will change to 'shipped' only when vehicle is actually dispatched
    order.assignedToVehicle = vehicleId;
    order.assignedDate = new Date();
    await order.save();
    
    // Update order history to show it's assigned to vehicle but still with logistics
    await this.orderHistoryModel.updateOne({ orderId }, { 
      assignedToVehicle: vehicleId,
      assignedDate: new Date(),
      status: 'shippedtologistics' // Keep same status until dispatch
    });

    return { message: 'Order assigned to vehicle successfully - ready for dispatch' };
  }

  async dispatchVehicle(vehicleId: string) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    if (vehicle.assignedOrders.length === 0) {
      throw new BadRequestException('No orders assigned to this vehicle');
    }

    // Update all assigned orders to shipped status (now that vehicle is actually dispatched)
    for (const orderId of vehicle.assignedOrders) {
      await this.orderModel.updateOne({ orderId }, { 
        status: 'shipped',
        dispatchedFromLogistics: new Date()
      });
      await this.orderHistoryModel.updateOne({ orderId }, { 
        status: 'shipped',
        dispatchedFromLogistics: new Date()
      });
    }

    // Complete vehicle reset - free up driver and make vehicle available  
    const updateData = {
      assignedOrders: [],
      status: 'available',
      currentDriverId: null,
      currentDriverName: null,
      currentDriverPhone: null, 
      assignedDate: null
    };

    Object.assign(vehicle, updateData);
    const savedVehicle = await vehicle.save();

    console.log('✅ Vehicle dispatched from logistics and driver freed:', {
      vehicleId: savedVehicle._id,
      vehicleNumber: savedVehicle.vehicleNumber,
      status: savedVehicle.status,
      driverFreed: savedVehicle.currentDriverId === null
    });

    return { 
      message: 'Vehicle dispatched successfully - driver is now available',
      vehicle: {
        id: savedVehicle._id,
        status: savedVehicle.status,
        driverAssigned: savedVehicle.currentDriverId !== null
      }
    };
  }

  async getAvailableOrders() {
    console.log('=== AVAILABLE ORDERS DEBUG ===');
    
    // Use comprehensive query to catch all variations of "shipped to logistics" status
    // This includes: 'shippedtologistics', 'shipped to logistics', 'dispatched to logistics', etc.
    const orders = await this.orderModel.find({ 
      $or: [
        { status: { $regex: /^shipped\s*to\s*logistics$/i } },
        { status: { $regex: /^dispatched\s*to\s*logistics$/i } },
        { status: { $regex: /^shippedtologistics$/i } }
      ]
    }).sort({ date: -1, time: -1 });
    
    console.log(`Found ${orders.length} available orders ready for pickup`);
    if (orders.length > 0) {
      console.log('Example order IDs:', orders.slice(0, 3).map(o => o.orderId));
      console.log('Example statuses:', orders.slice(0, 3).map(o => o.status));
    }
    
    console.log('=== END AVAILABLE ORDERS DEBUG ===');
    
    return orders;
  }

  // Get orders that are assigned to vehicles but not yet dispatched
  async getAssignedOrders() {
    return this.orderModel.find({ 
      status: 'shippedtologistics',
      assignedToVehicle: { $exists: true }
    }).sort({ assignedDate: -1 });
  }

  // Get all orders with logistics (available + assigned)
  async getAllLogisticsOrders() {
    console.log('=== LOGISTICS SERVICE DEBUG ===');
    console.log('Querying for orders with status in: shippedtologistics, dispatched, cancelled');
    
    // Use case-insensitive regex to match statuses regardless of capitalization
    const statusRegexes = [
      new RegExp('^shippedtologistics$', 'i'),
      new RegExp('^dispatched$', 'i'),
      new RegExp('^cancelled$', 'i')
    ];
    
    // More comprehensive query using $or with multiple regex conditions
    const orders = await this.orderModel.find({
      $or: [
        { status: { $in: ['shippedtologistics', 'dispatched', 'cancelled'] } }, // Exact matches
        { status: { $regex: /shippedtologistics/i } },  // Case-insensitive regex
        { status: { $regex: /dispatched/i } },
        { status: { $regex: /cancelled/i } },
        // Include logistics ID to ensure we get all orders assigned to logistics
        { logisticsId: { $exists: true } }
      ]
    }).sort({ date: -1, time: -1 });
    
    console.log(`Found ${orders.length} total orders for logistics dashboard`);
    
    // Log detailed status breakdown for debugging
    const statusBreakdown = orders.reduce((acc, order) => {
      const status = order.status || 'undefined';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Status breakdown:', statusBreakdown);
    
    // Specifically check for shippedtologistics orders
    const shippedToLogisticsOrders = orders.filter(order => {
      const status = order.status?.toLowerCase() || '';
      return status === 'shippedtologistics';
    });
    
    console.log(`Found ${shippedToLogisticsOrders.length} orders with status "shippedtologistics"`);
    if (shippedToLogisticsOrders.length > 0) {
      console.log('Example order IDs:', shippedToLogisticsOrders.slice(0, 3).map(o => o.orderId));
    }
    
    console.log('=== END LOGISTICS SERVICE DEBUG ===');
    
    return orders;
  }

  async getVehicleOrders(vehicleId: string) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    const orders = await this.orderModel.find({ 
      orderId: { $in: vehicle.assignedOrders } 
    });
    
    return orders;
  }

  async getDriverVehicle(driverId: string) {
    const vehicle = await this.vehicleModel.findOne({ currentDriverId: driverId });
    
    // Check for inconsistent state - if vehicle shows dispatched but has no orders to process
    if (vehicle && vehicle.status === 'dispatched' && vehicle.assignedOrders.length > 0) {
      // Check if all assigned orders are actually dispatched
      const ordersToProcess = await this.orderModel.find({
        orderId: { $in: vehicle.assignedOrders },
        status: { $in: ['shippedtologistics', 'shipped'] }
      });
      
      // If no orders to process but vehicle still shows assigned, fix it
      if (ordersToProcess.length === 0) {
        console.log('🔧 Fixing inconsistent vehicle state for driver:', driverId);
        await this.vehicleModel.updateOne(
          { _id: vehicle._id },
          {
            $set: {
              assignedOrders: [],
              status: 'available',
              currentDriverId: null,
              currentDriverName: null,
              currentDriverPhone: null,
              assignedDate: null
            }
          }
        );
        
        // Return null so driver sees "No vehicle assigned"
        return null;
      }
    }
    
    return vehicle;
  }

  async dispatchByDriver(driverId: string) {
    // Find vehicle assigned to this driver
    const vehicle = await this.vehicleModel.findOne({ currentDriverId: driverId });
    if (!vehicle) {
      throw new BadRequestException('No vehicle assigned to this driver');
    }

    if (vehicle.status !== 'loaded') {
      throw new BadRequestException('Vehicle must be loaded before dispatch');
    }

    console.log('🚚 Starting dispatch for vehicle:', {
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      driverId: driverId,
      assignedOrders: vehicle.assignedOrders,
      currentStatus: vehicle.status
    });

    // Update all assigned orders to dispatched status
    const orderIds = [...vehicle.assignedOrders].filter(id => !!id);
    for (const orderId of orderIds) {
      if (!orderId) {
        console.warn('⚠️ Skipping invalid orderId in dispatchByDriver:', orderId);
        continue;
      }
      await this.orderModel.updateOne(
        { orderId }, 
        { status: 'dispatched_to_customer' }
      );
      await this.orderHistoryModel.updateOne(
        { orderId }, 
        { status: 'dispatched_to_customer' }
      );
      console.log(`📦 Order ${orderId} updated to dispatched_to_customer`);
    }

    // COMPLETELY RESET VEHICLE - Free up driver and make available for new assignments
    const updateResult = await this.vehicleModel.updateOne(
      { _id: vehicle._id },
      {
        $set: {
          assignedOrders: [],
          status: 'available',
          currentDriverId: null,
          currentDriverName: null,
          currentDriverPhone: null,
          assignedDate: null
        }
      }
    );

    console.log('🔄 Vehicle update result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });

    // Verify the vehicle was properly updated
    const updatedVehicle = await this.vehicleModel.findById(vehicle._id);
    if (!updatedVehicle) {
      throw new BadRequestException('Vehicle not found after update');
    }

    console.log('✅ Vehicle after dispatch reset:', {
      vehicleId: updatedVehicle._id,
      vehicleNumber: updatedVehicle.vehicleNumber,
      status: updatedVehicle.status,
      assignedOrders: updatedVehicle.assignedOrders,
      currentDriverId: updatedVehicle.currentDriverId,
      isDriverFreed: updatedVehicle.currentDriverId === null,
      isVehicleAvailable: updatedVehicle.status === 'available',
      orderCount: updatedVehicle.assignedOrders.length
    });

    return { 
      message: 'Vehicle dispatched successfully - driver is now free for new assignments',
      success: true,
      vehicle: {
        id: updatedVehicle._id,
        status: updatedVehicle.status,
        assignedOrders: updatedVehicle.assignedOrders.length,
        driverAssigned: updatedVehicle.currentDriverId !== null
      },
      ordersDispatched: orderIds.length
    };
  }

  async dispatchOrderToDestination(
    driverId: string, 
    orderId: string, 
    destination: 'customer' | 'coldstorage', 
    coldStorageId?: string,
    coldStorageName?: string
  ) {
    const vehicle = await this.vehicleModel.findOne({ currentDriverId: driverId });
    if (!vehicle) {
      throw new BadRequestException('No vehicle assigned to this driver');
    }

    if (vehicle.status !== 'loaded') {
      throw new BadRequestException('Vehicle must be loaded before dispatch');
    }

    // Check if order is assigned to this driver
    if (!vehicle.assignedOrders.includes(orderId)) {
      throw new BadRequestException('Order not assigned to this driver');
    }

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];

    let newStatus: string;
    let updateData: any = {};

    if (destination === 'coldstorage') {
      // Validate that a cold storage ID is provided
      if (!coldStorageId) {
        throw new BadRequestException('Cold storage user ID is required');
      }
      
      // Get the cold storage user info to verify it exists and get the correct name
      const coldStorageUser = await this.userModel.findOne({ _id: coldStorageId, role: 'coldstorage' });
      if (!coldStorageUser) {
        throw new BadRequestException('Invalid cold storage user selected');
      }
      
      // Use the name from the database for consistency
      const verifiedName = coldStorageUser.name;
      
      newStatus = 'dispatched_to_coldstorage';
      updateData = { 
        status: newStatus, 
        deliveryDestination: 'coldstorage',
        coldStorageId: coldStorageId,
        coldStorageName: verifiedName,
        dispatchedToColdStorageDate: dateString
      };
    } else {
      newStatus = 'dispatched_to_customer';
      updateData = { 
        status: newStatus, 
        deliveryDestination: 'customer',
        coldStorageId: null,
        coldStorageName: null,
        dispatchedToCustomerDate: dateString
      };
    }

    // Update order status
    await this.orderModel.updateOne({ orderId }, updateData);
    await this.orderHistoryModel.updateOne({ orderId }, updateData);

    // Remove the dispatched order from vehicle's assigned orders
    vehicle.assignedOrders = vehicle.assignedOrders.filter(id => id !== orderId);
    
    // If all orders are dispatched, free up the vehicle and driver
    if (vehicle.assignedOrders.length === 0) {
      vehicle.status = 'available';
      vehicle.currentDriverId = undefined;
      vehicle.currentDriverName = undefined;
      vehicle.currentDriverPhone = undefined;
      vehicle.assignedDate = undefined;
    }
    
    await vehicle.save();

    return { message: `Order dispatched to ${destination} successfully` };
  }

  async getDriverOrders(driverId: string) {
    const vehicle = await this.vehicleModel.findOne({ currentDriverId: driverId });
    if (!vehicle) {
      return [];
    }

    // Only return orders that are still assigned and not yet dispatched to customer
    // This excludes orders with status 'dispatched_to_customer', 'delivered', etc.
    const orders = await this.orderModel.find({ 
      orderId: { $in: vehicle.assignedOrders },
      status: { 
        $nin: ['dispatched_to_customer', 'delivered', 'cancelled'] 
      }
    });
    
    console.log(`[getDriverOrders] Driver ${driverId}: Found ${orders.length} active orders out of ${vehicle.assignedOrders.length} total assigned orders`);
    
    return orders;
  }

  async getAvailableVehicles() {
    return this.vehicleModel.find({ 
      status: 'available',
      currentDriverId: { $exists: false }
    }).sort({ createdAt: -1 });
  }

  async getAvailableDrivers() {
    // Get drivers who are not currently assigned to any vehicle
    const assignedDriverIds = await this.vehicleModel.distinct('currentDriverId', {
      currentDriverId: { $exists: true },
      status: { $in: ['assigned', 'loaded', 'dispatched'] }
    });

    return this.userModel.find({ 
      role: 'driver',
      _id: { $nin: assignedDriverIds }
    }).sort({ name: 1 });
  }

  // TEMPORARY FIX: Manual reset for stuck vehicles
  async forceResetVehicle(vehicleId: string) {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    console.log('🔧 Force resetting vehicle:', {
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      currentStatus: vehicle.status,
      assignedOrders: vehicle.assignedOrders.length,
      currentDriver: vehicle.currentDriverId
    });

    // Force reset vehicle to clean state
    await this.vehicleModel.updateOne(
      { _id: vehicleId },
      {
        $set: {
          assignedOrders: [],
          status: 'available',
          currentDriverId: null,
          currentDriverName: null,
          currentDriverPhone: null,
          assignedDate: null
        }
      }
    );

    const resetVehicle = await this.vehicleModel.findById(vehicleId);
    if (!resetVehicle) {
      throw new BadRequestException('Vehicle not found after reset');
    }

    console.log('✅ Vehicle force reset complete:', {
      vehicleId: resetVehicle._id,
      status: resetVehicle.status,
      assignedOrders: resetVehicle.assignedOrders.length,
      driverFreed: resetVehicle.currentDriverId === null
    });

    return {
      message: 'Vehicle force reset successful - driver is now free',
      vehicle: {
        id: resetVehicle._id,
        status: resetVehicle.status,
        driverFreed: true
      }
    };
  }
}