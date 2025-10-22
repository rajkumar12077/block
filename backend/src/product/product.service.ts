import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

@Injectable()
export class ProductService {
	constructor(
		@InjectModel(Product.name) private productModel: Model<ProductDocument>,
	) {}

		async create(body: any, sellerId: string, sellerEmail: string) {
				const now = new Date();
				return this.productModel.create({
					...body,
					sellerId,
					sellerEmail,
					date: now.toISOString().split('T')[0],
					time: now.toTimeString().split(' ')[0],
				});
	}

	async listPublic(page: number = 0, limit: number = 6) {
		const skip = page * limit;
		const query = { isPlaceholder: { $ne: true } };
		const [products, total] = await Promise.all([
			this.productModel.find(query).skip(skip).limit(limit),
			this.productModel.countDocuments(query)
		]);
		return { products, total };
	}

	async update(id: string, body: any, sellerId: string) {
		const product = await this.productModel.findById(id);
		if (!product || product.sellerId !== sellerId) throw new ForbiddenException('Not allowed');
		Object.assign(product, body);
		return product.save();
	}

	async remove(id: string, sellerId: string): Promise<any> {
		const product = await this.productModel.findById(id);
		if (!product || product.sellerId !== sellerId) throw new ForbiddenException('Not allowed');
		return product.deleteOne();
	}

		async listBySeller(sellerId: string, page: number = 0, limit: number = 6) {
			const skip = page * limit;
			const [products, total] = await Promise.all([
				this.productModel.find({ sellerId }).skip(skip).limit(limit),
				this.productModel.countDocuments({ sellerId })
			]);
			return { products, total };
		}

		async getMyProducts(sellerId: string) {
			try {
				const products = await this.productModel.find({ 
					sellerId,
					isPlaceholder: { $ne: true }
				}).select('_id name description price quantity category');
				return products || [];
			} catch (error) {
				console.error('Error fetching user products:', error);
				return [];
			}
		}

		async getCategories() {
			const categories = await this.productModel.distinct('category');
			return categories.filter(category => category); // Filter out any empty categories
		}

		async addCategory(category: string) {
			// Create a temporary product to store the category if no products exist with this category
			const existingCategory = await this.productModel.findOne({ category });
			if (!existingCategory && category) {
				await this.productModel.create({
					name: '_category_placeholder',
					category,
					price: 0,
					quantity: 0,
					description: '_category_placeholder',
					isPlaceholder: true
				});
			}
			return { message: 'Category added successfully' };
		}
}
