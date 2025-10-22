import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('product')
export class ProductController {
	constructor(private readonly productService: ProductService) {}

		@Post()
		@UseGuards(JwtAuthGuard, RolesGuard)
		@Roles('seller')
		async create(@Body() body: any, @Req() req: any) {
			return this.productService.create(body, req.user.sub, req.user.email);
		}

	@Get('public')
	async listPublic(@Query('page') page: number = 0, @Query('limit') limit: number = 6) {
		return this.productService.listPublic(page, limit);
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('seller')
	async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
		return this.productService.update(id, body, req.user.sub);
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('seller')
	async remove(@Param('id') id: string, @Req() req: any): Promise<any> {
		return this.productService.remove(id, req.user.sub);
	}

	@Get('seller/:sellerId')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('seller')
	async listBySeller(
		@Param('sellerId') sellerId: string,
		@Query('page') page: number = 0,
		@Query('limit') limit: number = 6
	) {
		return this.productService.listBySeller(sellerId, page, limit);
	}
	@Get('my-products')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('seller')
	async getMyProducts(@Req() req: any) {
		return this.productService.getMyProducts(req.user.userId || req.user.sub);
	}

	@Get('categories')
	@UseGuards(JwtAuthGuard)
	async getCategories() {
		return this.productService.getCategories();
	}

	@Post('categories')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('seller')
	async addCategory(@Body() body: { category: string }) {
		return this.productService.addCategory(body.category);
	}
}
