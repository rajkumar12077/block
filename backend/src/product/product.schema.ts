import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ collection: 'products', timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  image: string;

  @Prop({ required: true })
  sellerId: string;

  @Prop()
  sellerEmail?: string;

  @Prop({ default: false })
  isPlaceholder?: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
