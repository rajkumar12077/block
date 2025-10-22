import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class Order {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  time: string;

  @Prop({ required: true })
  sellerId: string;

  @Prop({ required: true })
  sellerName: string;

  @Prop({ required: true })
  buyerId: string;

  @Prop({ required: true })
  buyerName: string;

  @Prop({ required: true })
  buyerEmail: string;

  @Prop({ required: true })
  buyerAddress: string;

  @Prop()
  sellerAddress?: string;

  @Prop({ required: true, default: 'pending', enum: ['pending', 'shippedtologistics', 'shipped', 'dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered', 'cancelled'] })
  status: string;

  @Prop({ enum: ['customer', 'coldstorage'], default: 'customer' })
  deliveryDestination: string;

  @Prop()
  coldStorageId?: string;

  @Prop()
  coldStorageName?: string;

  @Prop()
  logisticsId?: string;

  @Prop()
  logisticsName?: string;

  @Prop()
  logisticsEmail?: string;

  @Prop()
  logisticsAddress?: string;

  @Prop()
  coldStorageAddress?: string;

  @Prop()
  driverId?: string;

  @Prop()
  driverName?: string;

  @Prop()
  driverAddress?: string;

  @Prop()
  dispatchedToColdStorageDate?: string;

  @Prop()
  dispatchedFromColdStorageDate?: string;

  @Prop()
  dispatchedToCustomerDate?: string;

  @Prop()
  assignedToVehicle?: string;

  @Prop()
  assignedDate?: Date;

  @Prop()
  dispatchedFromLogistics?: Date;

  @Prop()
  dispatchDate?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
