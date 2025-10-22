import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TemperatureDocument = Temperature & Document;

@Schema({ collection: 'tempdata', timestamps: false })
export class Temperature extends Document {
  @Prop({ required: true })
  time: string;

  @Prop({ required: true })
  temperature: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  humidity: number;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  device: string;

  // Optional timestamp field for backwards compatibility
  @Prop()
  timestamp: Date;
}

export const TemperatureSchema = SchemaFactory.createForClass(Temperature);