import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderHistoryDocument = OrderHistory & Document;

@Schema({ collection: 'orderhistory', timestamps: true })
export class OrderHistory {
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

export const OrderHistorySchema = SchemaFactory.createForClass(OrderHistory);