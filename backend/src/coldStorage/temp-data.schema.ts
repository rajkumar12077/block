import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TempDataDocument = TempData & Document;

@Schema({ collection: 'tempdata', timestamps: true })
export class TempData {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  productId: string;
  
  @Prop({ required: true })
  productName: string;
  
  @Prop({ required: true })
  temperature: number;
  
  @Prop({ required: true })
  humidity: number;
  
  @Prop({ required: true })
  timestamp: Date;
  
  @Prop()
  sellerId: string;
  
  @Prop()
  buyerId: string;
  
  @Prop()
  coldStorageId: string;
  
  @Prop()
  coldStorageName: string;
  
  @Prop()
  device: string;
  
  @Prop()
  name: string;
  
  @Prop()
  date: string;
  
  @Prop()
  time: string;
  
  @Prop()
  latitude: number;
  
  @Prop()
  longitude: number;
}

export const TempDataSchema = SchemaFactory.createForClass(TempData);