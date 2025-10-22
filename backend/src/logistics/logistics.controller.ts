import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('logistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('logistics', 'admin')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('vehicle')
  async createVehicle(@Body() vehicleData: any) {
    return this.logisticsService.createVehicle(vehicleData);
  }

  @Get('vehicles')
  async getAllVehicles() {
    return this.logisticsService.getAllVehicles();
  }

  @Get('vehicle/:id')
  async getVehicleById(@Param('id') id: string) {
    return this.logisticsService.getVehicleById(id);
  }

  @Put('vehicle/:id')
  async updateVehicle(@Param('id') id: string, @Body() updateData: any) {
    return this.logisticsService.updateVehicle(id, updateData);
  }

  @Delete('vehicle/:id')
  async deleteVehicle(@Param('id') id: string) {
    return this.logisticsService.deleteVehicle(id);
  }

  @Post('assign-order')
  async assignOrderToVehicle(@Body() body: { vehicleId: string; orderId: string }) {
    return this.logisticsService.assignOrderToVehicle(body.vehicleId, body.orderId);
  }

  @Post('dispatch/:vehicleId')
  async dispatchVehicle(@Param('vehicleId') vehicleId: string) {
    return this.logisticsService.dispatchVehicle(vehicleId);
  }

  @Get('available-orders')
  async getAvailableOrders() {
    return this.logisticsService.getAvailableOrders();
  }

  @Get('assigned-orders')
  async getAssignedOrders() {
    return this.logisticsService.getAssignedOrders();
  }

  @Get('all-logistics-orders')
  async getAllLogisticsOrders() {
    return this.logisticsService.getAllLogisticsOrders();
  }

  @Get('vehicle-orders/:vehicleId')
  async getVehicleOrders(@Param('vehicleId') vehicleId: string) {
    return this.logisticsService.getVehicleOrders(vehicleId);
  }

  @Get('driver/vehicle')
  @Roles('driver')
  async getDriverVehicle(@Req() req: any) {
    return this.logisticsService.getDriverVehicle(req.user.sub);
  }

  @Post('driver/dispatch')
  @Roles('driver')
  async dispatchByDriver(@Req() req: any) {
    return this.logisticsService.dispatchByDriver(req.user.sub);
  }

  @Get('driver/orders')
  @Roles('driver')
  async getDriverOrders(@Req() req: any) {
    return this.logisticsService.getDriverOrders(req.user.sub);
  }

  @Post('driver/dispatch-order')
  @Roles('driver')
  async dispatchOrderToDestination(
    @Req() req: any, 
    @Body() body: { 
      orderId: string; 
      destination: 'customer' | 'coldstorage'; 
      coldStorageId?: string;
      coldStorageName?: string;
    }
  ) {
    return this.logisticsService.dispatchOrderToDestination(
      req.user.sub, 
      body.orderId, 
      body.destination, 
      body.coldStorageId, 
      body.coldStorageName
    );
  }

  @Post('assign-driver-to-vehicle')
  async assignDriverToVehicle(@Body() body: { vehicleId: string; driverId: string }) {
    return this.logisticsService.assignDriverToVehicle(body.vehicleId, body.driverId);
  }

  @Post('unassign-driver-from-vehicle/:vehicleId')
  async unassignDriverFromVehicle(@Param('vehicleId') vehicleId: string) {
    return this.logisticsService.unassignDriverFromVehicle(vehicleId);
  }

  @Get('available-vehicles')
  async getAvailableVehicles() {
    return this.logisticsService.getAvailableVehicles();
  }

  @Get('available-drivers')
  async getAvailableDrivers() {
    return this.logisticsService.getAvailableDrivers();
  }

  @Post('force-reset-vehicle/:vehicleId')
  async forceResetVehicle(@Param('vehicleId') vehicleId: string) {
    return this.logisticsService.forceResetVehicle(vehicleId);
  }
}