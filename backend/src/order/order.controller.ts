import { Controller, Post, Get, Put, Body, Req, UseGuards, Param, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PolicyHelper } from './policy-helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
	constructor(
		private readonly orderService: OrderService,
		private readonly policyHelper: PolicyHelper
	) {}

	@Post()
	@Roles('buyer', 'seller')
	async create(@Body() body: any, @Req() req: any) {
		return this.orderService.create(
			body,
			req.user.sub,
			req.user.email,
			req.user.name
		);
	}

	@Get('buyer-history')
	@Roles('buyer', 'seller')
	async buyerHistory(@Req() req: any) {
		return this.orderService.buyerHistory(req.user.sub);
	}

	@Get('buyer-orders')
	@Roles('buyer', 'seller')
	async buyerOrders(@Req() req: any) {
		return this.orderService.buyerOrders(req.user.sub);
	}

	@Get('seller-history')
	@Roles('seller')
	async sellerHistory(@Req() req: any) {
		return this.orderService.sellerHistory(req.user.sub);
	}

	@Get('seller-orders')
	@Roles('seller')
	async sellerOrders(@Req() req: any) {
		return this.orderService.sellerOrders(req.user.sub);
	}

	@Get('all-orders')
	@Roles('logistics', 'admin')
	async getAllOrders() {
		return this.orderService.getAllOrders();
	}

	@Put('status/:orderId')
	@Roles('logistics', 'admin')
	async updateOrderStatus(@Param('orderId') orderId: string, @Body() body: { status: string }) {
		return this.orderService.updateOrderStatus(orderId, body.status);
	}

	@Put('cancel/:orderId')
	@Roles('buyer', 'seller')
	async cancelOrder(@Param('orderId') orderId: string, @Req() req: any) {
		return this.orderService.cancelOrder(orderId, req.user.sub, req.user.role);
	}

	@Get('cold-storage-orders')
	@Roles('coldstorage', 'admin')
	async getColdStorageOrders() {
		return this.orderService.getColdStorageOrders();
	}

	@Get('debug-order-flow/:productId')
	@UseGuards(JwtAuthGuard)
	async debugOrderFlow(@Param('productId') productId: string, @Req() req: any) {
		// This is a debug endpoint to test order creation flow without actually placing an order
		return this.orderService.debugOrderFlow(productId, req.user.sub, req.user.email, req.user.name);
	}

	@Put('receive-in-cold-storage/:orderId')
	@Roles('coldstorage', 'admin')
	async receiveInColdStorage(@Param('orderId') orderId: string) {
		return this.orderService.receiveInColdStorage(orderId);
	}

	@Put('cold-storage/dispatch/:orderId')
	@Roles('coldstorage', 'admin')
	async dispatchFromColdStorage(
		@Param('orderId') orderId: string,
		@Body() logisticsData: { logisticsId: string, logisticsName: string, logisticsEmail: string }
	) {
		return this.orderService.dispatchFromColdStorage(orderId, logisticsData);
	}

	// Complaint endpoints
	@Post('complaint')
	@Roles('buyer', 'seller', 'admin', 'insurance')
	async fileComplaint(@Body() complaintData: any, @Req() req: any) {
		console.log('=== Complaint Controller Debug ===');
		console.log('User object:', req.user);
		console.log('User role:', req.user?.role);
		console.log('User ID (sub):', req.user?.sub);
		console.log('User ID (userId):', req.user?.userId);
		console.log('User email:', req.user?.email);
		console.log('User name:', req.user?.name);
		console.log('Auth header:', req.headers?.authorization?.substring(0, 20) + '...');
		console.log('Complaint data:', complaintData);
		
		try {
			const result = await this.orderService.fileComplaint(
				req.user.sub || req.user.userId,
				req.user.email,
				req.user.name,
				req.user.role,
				complaintData
			);
			console.log('=== Complaint Filed Successfully ===');
			console.log('Result:', result);
			return result;
		} catch (error) {
			console.error('=== Error Filing Complaint ===');
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
			throw error;
		}
	}

	@Get('complaints/seller')
	@Roles('seller')
	async getSellerComplaints(@Req() req: any) {
		return this.orderService.getSellerComplaints(req.user.sub);
	}

	@Get('complaints/buyer')
	@Roles('buyer')
	async getBuyerComplaints(@Req() req: any) {
		console.log('GET /complaints/buyer request received');
		console.log('User info from request:', JSON.stringify(req.user));
		
		// Check for userId in various places
		const userId = req.user.sub || req.user.userId || req.user.id;
		
		if (!userId) {
			console.error('No user ID found in request. Token data:', JSON.stringify(req.user));
			throw new BadRequestException('No user ID found in authentication token');
		}
		
		console.log(`Using buyer ID: ${userId}`);
		
		try {
			const complaints = await this.orderService.getBuyerComplaints(userId);
			console.log(`Returning ${complaints.length} complaints to client`);
			return complaints;
		} catch (error) {
			console.error('Error in getBuyerComplaints controller:', error);
			throw error;
		}
	}

	// Endpoint for insurance agents to get filed complaints from their subscribers
	@Get('complaints/insurance-agent')
	@Roles('insurance')
	async getInsuranceAgentComplaints(@Req() req: any) {
		console.log('GET /complaints/insurance-agent request received');
		return this.orderService.getInsuranceAgentComplaints(req.user.sub);
	}
	
	// Endpoint to toggle important flag for complaints
	@Post('complaint/:complaintId/toggle-important')
	@Roles('insurance', 'admin')
	async toggleComplaintImportance(
		@Param('complaintId') complaintId: string,
		@Req() req: any
	) {
		console.log(`POST /complaint/${complaintId}/toggle-important request received`);
		return this.orderService.toggleComplaintImportance(complaintId, req.user.sub);
	}
	
	// Endpoint to process refund for complaint
	@Post('complaint/:complaintId/process-refund')
	@Roles('insurance', 'admin')
	async processComplaintRefund(
		@Param('complaintId') complaintId: string,
		@Body() body: { comments?: string },
		@Req() req: any
	) {
		console.log(`POST /complaint/${complaintId}/process-refund request received`);
		return this.orderService.processComplaintRefund(complaintId, req.user.sub, body.comments);
	}

	@Get('complaint/:complaintId')
	@Roles('buyer', 'seller', 'insurance', 'admin')
	async getComplaintById(@Param('complaintId') complaintId: string, @Req() req: any) {
		return this.orderService.getComplaintById(complaintId, req.user.sub);
	}

	@Put('complaint/:complaintId/status')
	@Roles('seller', 'admin')
	async updateComplaintStatus(
		@Param('complaintId') complaintId: string,
		@Body() data: { status: string, claimId?: string },
		@Req() req: any
	) {
		return this.orderService.updateComplaintStatus(
			complaintId,
			data.status,
			req.user.sub,
			data.claimId
		);
	}

	// Claim filing endpoint
	@Post('complaint/:complaintId/claim')
	@Roles('seller', 'admin')
	async fileClaim(
		@Param('complaintId') complaintId: string,
		@Req() req: any
	) {
		return this.orderService.fileClaim(complaintId, req.user.sub);
	}
	
	// Helper endpoint to create a test insurance policy for debugging
	@Post('create-test-policy')
	@Roles('seller', 'admin')
	async createTestPolicy(
		@Req() req: any,
		@Body() body: { policyType?: string, coverageAmount?: number }
	) {
		const { sub: sellerId, name: sellerName, email: sellerEmail } = req.user;
		const { policyType = 'normal', coverageAmount = 10000 } = body;
		
		// Validate policy type
		const validTypes = ['normal', 'premium', 'product_damage', 'delivery_failure', 'comprehensive'];
		const finalPolicyType = validTypes.includes(policyType) ? policyType : 'normal';
		
		// Validate coverage amount (minimum 1000, maximum 100000)
		const finalCoverageAmount = Math.max(1000, Math.min(100000, coverageAmount));
		
		const policy = await this.policyHelper.createTestPolicy(
			sellerId,
			sellerName, 
			sellerEmail,
			finalPolicyType,
			finalCoverageAmount
		);
		
		return {
			success: true,
			message: `Test insurance policy (${finalPolicyType}) created successfully with coverage: $${finalCoverageAmount}`,
			policy
		};
	}
	
	// Helper endpoint to check insurance status
	@Get('check-insurance-status')
	@Roles('seller', 'admin')
	async checkInsuranceStatus(@Req() req: any) {
		const { sub: sellerId } = req.user;
		
		const result = await this.orderService.checkSellerInsuranceStatus(sellerId);
		
		return result;
	}
	
	// Dispatch order to logistics
	@Post('dispatch-to-logistics')
	@Roles('seller')
	async dispatchToLogistics(
		@Body() body: { orderId: string, logisticsId: string, deliveryDestination?: string },
		@Req() req: any
	) {
		return this.orderService.dispatchToLogistics(
			body.orderId, 
			body.logisticsId, 
			req.user.sub,
			body.deliveryDestination || 'customer'
		);
	}
	
	// Order tracking endpoint
	@Get('tracking/:orderId')
	@Roles('buyer', 'seller', 'logistics', 'coldstorage', 'driver', 'admin')
	async getOrderTracking(
		@Param('orderId') orderId: string,
		@Req() req: any
	) {
		return this.orderService.getOrderTracking(orderId, req.user.sub, req.user.role);
	}

	// Order tracking endpoint
	@Get('track/:orderId')
	@Roles('buyer', 'seller', 'logistics', 'driver', 'coldstorage', 'admin')
	async trackOrder(
		@Param('orderId') orderId: string,
		@Req() req: any
	) {
		return this.orderService.getOrderTracking(orderId, req.user.sub, req.user.role);
	}

	// Cancel complaint endpoint
	@Post('complaint/:complaintId/cancel')
	@Roles('seller', 'admin')
	async cancelComplaint(
		@Param('complaintId') complaintId: string,
		@Req() req: any
	) {
		try {
			console.log(`Cancelling complaint with ID: ${complaintId}`);
			console.log(`Request user: ${JSON.stringify({
				id: req.user.sub,
				name: req.user.name,
				role: req.user.role
			})}`);
			
			if (!complaintId) {
				throw new BadRequestException('Complaint ID is required');
			}
			
			const result = await this.orderService.cancelComplaint(complaintId, req.user.sub);
			console.log('Cancellation result:', JSON.stringify(result));
			return result;
		} catch (error) {
			console.error(`Error in cancelComplaint controller: ${error.message}`);
			console.error('Error stack:', error.stack);
			throw error;
		}
	}
}
