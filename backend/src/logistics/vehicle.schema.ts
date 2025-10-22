import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true })
  vehicleNumber: string;

  @Prop({ required: true })
  vehicleType: string;

  @Prop({ required: true })
  capacity: number;

  @Prop({ default: 'available', enum: ['available', 'assigned', 'loaded', 'dispatched', 'delivered'] })
  status: string;

  @Prop([String])
  assignedOrders: string[];

  @Prop()
  currentLocation?: string;

  @Prop()
  destination?: string;

  @Prop()
  estimatedDelivery?: Date;

  // Temporary driver assignment
  @Prop()
  currentDriverId?: string; // User ID of currently assigned driver

  @Prop()
  currentDriverName?: string;

  @Prop()
  currentDriverPhone?: string;

  @Prop()
  assignedDate?: Date; // When driver was assigned to this vehicle
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);