import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
import { OrderHistory, OrderHistoryDocument } from './orderhistory.schema';
import { Complaint, ComplaintDocument } from './complaint.schema';
import { Product, ProductDocument } from '../product/product.schema';
import { User, UserDocument } from '../user/user.schema';
import { Vehicle, VehicleDocument } from '../logistics/vehicle.schema';
import { TransactionService } from '../insurance/transaction.service';
import { Insurance } from '../insurance/insurance.schema';
import { InsurancePolicy, InsurancePolicyDocument } from '../insurance/insurance-policy.schema';
import { InsuranceClaim, InsuranceClaimDocument } from '../insurance/insurance-claim.schema';

@Injectable()
export class OrderService {
	constructor(
		@InjectModel(Order.name) private orderModel: Model<OrderDocument>,
		@InjectModel(OrderHistory.name) private orderHistoryModel: Model<OrderHistoryDocument>,
		@InjectModel(Complaint.name) private complaintModel: Model<ComplaintDocument>,
		@InjectModel(Product.name) private productModel: Model<ProductDocument>,
		@InjectModel(User.name) private userModel: Model<UserDocument>,
		@InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
		@InjectModel(InsurancePolicy.name) private insurancePolicyModel: Model<InsurancePolicyDocument>,
		@InjectModel(InsuranceClaim.name) private insuranceClaimModel: Model<InsuranceClaimDocument>,
			@InjectModel(Insurance.name) private insuranceModel: Model<any>,
		private transactionService: TransactionService,
	) {}

	async create(body: any, buyerId: string, buyerEmail: string, buyerName: string) {
		console.log(`🔥 ORDER CREATION STARTED`);
		console.log(`   👤 Buyer: ${buyerName} (${buyerId})`);
		console.log(`   📦 Product: ${body.productName} (ID: ${body.productId})`);
		console.log(`   💵 Price: $${body.price} x ${body.quantity} = $${(body.price * body.quantity).toFixed(2)}`);
		console.log(`   🕐 Timestamp: ${new Date().toISOString()}`);
		
		const session = await this.userModel.db.startSession();
		
		try {
			await session.startTransaction();
			
			const now = new Date();
			const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			console.log(`   🆔 Generated Order ID: ${orderId}`);
			
			// Check product stock and get product details
			const product = await this.productModel.findById(body.productId).session(session);
			if (!product) {
				throw new BadRequestException('Product not found');
			}
			if (product.quantity < body.quantity) {
				throw new BadRequestException('Not enough stock available');
			}
			
			// Get seller information
			const seller = await this.userModel.findById(product.sellerId).session(session);
			if (!seller) {
				throw new BadRequestException('Seller not found');
			}
			
			// Calculate total price
			const totalPrice = body.price * body.quantity;
			
			// Get and check buyer's balance - Use findOne with session for atomic operation
			const buyer = await this.userModel.findOne({ 
				_id: buyerId,
				balance: { $gte: totalPrice } // Ensure sufficient balance
			}).session(session);
			
			if (!buyer) {
				throw new BadRequestException(`Insufficient balance. Required: $${totalPrice.toFixed(2)}`);
			}
			
		console.log(`💰 Pre-transaction balances - Buyer: $${buyer.balance.toFixed(2)}, Seller: $${seller.balance.toFixed(2)}`);
		console.log(`💰 Transaction amount: $${totalPrice.toFixed(2)} for ${body.quantity}x ${product.name}`);
		
		// Update buyer's balance - Use updateOne with session
		console.log(`🔄 Debiting $${totalPrice.toFixed(2)} from buyer ${buyerName} (${buyerId})`);
		const buyerUpdateResult = await this.userModel.updateOne(
			{ _id: buyerId },
			{ $inc: { balance: -totalPrice } }
		).session(session);
		
		if (buyerUpdateResult.modifiedCount !== 1) {
			console.error(`❌ Failed to update buyer balance - ModifiedCount: ${buyerUpdateResult.modifiedCount}`);
			throw new Error('Failed to update buyer balance');
		}
		console.log(`✅ Successfully debited buyer balance`);
		
		// Update seller's balance - Use updateOne with session
		console.log(`🔄 Crediting $${totalPrice.toFixed(2)} to seller ${seller.name} (${product.sellerId})`);
		const sellerUpdateResult = await this.userModel.updateOne(
			{ _id: product.sellerId },
			{ $inc: { balance: totalPrice } }
		).session(session);
		
		if (sellerUpdateResult.modifiedCount !== 1) {
			console.error(`❌ Failed to update seller balance - ModifiedCount: ${sellerUpdateResult.modifiedCount}`);
			throw new Error('Failed to update seller balance');
		}
		console.log(`✅ Successfully credited seller balance`);			// Update product quantity - Use updateOne with session
			const productUpdateResult = await this.productModel.updateOne(
				{ _id: product._id, quantity: { $gte: body.quantity } },
				{ $inc: { quantity: -body.quantity } }
			).session(session);
			
			if (productUpdateResult.modifiedCount !== 1) {
				throw new Error('Failed to update product quantity');
			}
			
			// Verify balances
			const [updatedBuyer, updatedSeller] = await Promise.all([
				this.userModel.findById(buyerId).session(session),
				this.userModel.findById(product.sellerId).session(session)
			]);
			
			console.log(`💰 Post-update balances - Buyer: $${updatedBuyer?.balance.toFixed(2)}, Seller: $${updatedSeller?.balance.toFixed(2)}`);
			
			// Create buyer transaction record only (seller gets credit in their separate transaction history)
			console.log(`📝 Creating buyer transaction record for order ${orderId}`);
			const buyerTransaction = await this.transactionService.createTransaction({
				fromUserId: buyerId,
				toUserId: product.sellerId,
				amount: -totalPrice, // Negative amount for debit
				type: 'product_purchase',
				description: `Purchase of ${product.name} (Qty: ${body.quantity}) from ${seller.name}`,
				relatedId: orderId,
				metadata: {
					orderId,
					productId: (product._id as Types.ObjectId).toString(),
					productName: product.name,
					quantity: body.quantity,
					unitPrice: body.price,
					totalPrice: totalPrice,
					buyerName: buyerName,
					buyerEmail: buyerEmail,
					sellerName: seller.name,
					sellerEmail: seller.email,
					orderDate: now.toISOString()
				}
			}, session);

			console.log(`💰 Buyer transaction created successfully:`);
			console.log(`   🔻 Buyer debit transaction: ${buyerTransaction.transactionId} (-$${totalPrice.toFixed(2)})`);

			// Create seller credit transaction record in parallel (for seller's transaction history)
			console.log(`📝 Creating seller transaction record for order ${orderId}`);
			const sellerTransaction = await this.transactionService.createTransaction({
				fromUserId: buyerId,
				toUserId: product.sellerId,
				amount: totalPrice, // Positive amount for credit
				type: 'sale_credit',
				description: `Sale of ${product.name} (Qty: ${body.quantity}) to ${buyerName}`,
				relatedId: orderId,
				metadata: {
					orderId,
					productId: (product._id as Types.ObjectId).toString(),
					productName: product.name,
					quantity: body.quantity,
					unitPrice: body.price,
					totalPrice: totalPrice,
					buyerName: buyerName,
					buyerEmail: buyerEmail,
					sellerName: seller.name,
					sellerEmail: seller.email,
					orderDate: now.toISOString()
				}
			}, session);
			
			console.log(`💰 Seller transaction created successfully:`);
			console.log(`   🔺 Seller credit transaction: ${sellerTransaction.transactionId} (+$${totalPrice.toFixed(2)})`);

			// Check if an order with this orderId already exists to prevent duplicates
			const existingOrder = await this.orderModel.findOne({ orderId }).session(session);
			if (existingOrder) {
				throw new Error(`Order ${orderId} already exists - potential duplicate creation attempt`);
			}

			// Check for recent duplicate orders from same buyer for same product (within last 5 seconds)
			const fiveSecondsAgo = new Date(Date.now() - 5000);
			const recentDuplicateOrder = await this.orderModel.findOne({
				buyerId,
				productId: product._id,
				quantity: body.quantity,
				price: body.price,
				createdAt: { $gte: fiveSecondsAgo }
			}).session(session);

			if (recentDuplicateOrder) {
				throw new Error(`Duplicate order detected! Order ${recentDuplicateOrder.orderId} for the same product was created recently. Please wait before placing another identical order.`);
			}

			// Create the order document with proper data including addresses
			const orderData = {
				orderId,
				buyerId,
				sellerId: product.sellerId,
				productId: product._id,
				productName: product.name,
				quantity: body.quantity,
				price: body.price,
				totalAmount: totalPrice,
				buyerEmail,
				buyerName,
				buyerAddress: buyer.address, // Include buyer address
				sellerName: seller.name,
				sellerAddress: seller.address, // Include seller address
				status: 'pending',
				date: now.toISOString().split('T')[0],
				time: now.toTimeString().split(' ')[0],
				createdAt: now,
				updatedAt: now
			};

			console.log(`📝 Creating order with ID: ${orderId}`);
			console.log(`📝 Order data:`, JSON.stringify(orderData, null, 2));

			// Create both order and order history within the session
			const [order] = await Promise.all([
				this.orderModel.create([orderData], { session }),
				this.orderHistoryModel.create([orderData], { session })
			]);

			console.log(`✅ Order created successfully in both collections:`);
			console.log(`   📊 Order collection: ${order[0].orderId}`);
			console.log(`   📚 OrderHistory collection: ${orderId}`);

			console.log(`💰 Order Transaction Complete: $${totalPrice.toFixed(2)} debited from buyer ${buyerName} and credited to seller ${seller.name}`);

			// If everything succeeded, commit the transaction
			await session.commitTransaction();
			return order[0];

		} catch (error) {
			// If anything fails, abort the transaction and roll back all changes
			await session.abortTransaction();
			console.error('❌ Order creation failed, rolling back transaction:', error.message);
			throw error;
		} finally {
			// End the session
			await session.endSession();
		}
	}

	async buyerHistory(buyerId: string) {
		// Only show orders that have been dispatched or completed (not pending/shipped)
		return this.orderModel.find({ 
			buyerId,
			status: { 
				$in: [
					'dispatched_to_coldstorage', 
					'in_coldstorage', 
					'dispatched_to_customer', 
					'delivered',
					'cancelled'
				] 
			}
		}).sort({ date: -1, time: -1 });
	}

	async buyerOrders(buyerId: string) {
		// Show all orders for buyer (including pending) so they can cancel
		return this.orderModel.find({ buyerId }).sort({ date: -1, time: -1 });
	}

	async sellerHistory(sellerId: string) {
		// Only show orders that have been dispatched or completed (not pending/shipped)
		return this.orderModel.find({ 
			sellerId,
			status: { 
				$in: [
					'dispatched_to_coldstorage', 
					'in_coldstorage', 
					'dispatched_to_customer', 
					'delivered',
					'cancelled'
				] 
			}
		}).sort({ date: -1, time: -1 });
	}

	async sellerOrders(sellerId: string) {
		// Show all orders for seller (including pending) so they can cancel
		const orders = await this.orderModel.find({ sellerId }).sort({ date: -1, time: -1 });
		
		// Enhance orders with buyer address information
		const enhancedOrders = await Promise.all(orders.map(async (order) => {
			// Get buyer details including address
			const buyer = await this.userModel.findById(order.buyerId).select('name email address phone');
			
			return {
				...order.toObject(),
				buyerAddress: buyer?.address || 'Address not available',
				buyerPhone: buyer?.phone || 'Phone not available',
				// Ensure buyer name and email are present
				buyerName: order.buyerName || buyer?.name || 'Unknown',
				buyerEmail: order.buyerEmail || buyer?.email || 'Unknown'
			};
		}));
		
		return enhancedOrders;
	}

	async getAllOrders() {
		// Use the main Order collection for real-time data
		return this.orderModel.find({}).sort({ date: -1, time: -1 });
	}

	async updateOrderStatus(orderId: string, status: string) {
		await this.orderModel.updateOne({ orderId }, { status });
		return this.orderHistoryModel.updateOne({ orderId }, { status });
	}

	async cancelOrder(orderId: string, userId: string, userRole: string) {
		const session = await this.userModel.db.startSession();
		
		try {
			await session.startTransaction();
			
			// Find the order
			const order = await this.orderModel.findOne({ orderId }).session(session);
			if (!order) {
				throw new BadRequestException('Order not found');
			}

			// Check if user is authorized to cancel the order
			if (userRole === 'buyer' && order.buyerId !== userId) {
				throw new ForbiddenException('Unauthorized to cancel this order');
			}
			if (userRole === 'seller' && order.sellerId !== userId) {
				throw new ForbiddenException('Unauthorized to cancel this order');
			}
			// Allow logistics to cancel any order
			if (userRole === 'logistics') {
				// Logistics can cancel any order
			}

			// Allow canceling orders that are not in final states (delivered, already cancelled)
			const nonCancellableStatuses = ['delivered', 'cancelled'];
			if (nonCancellableStatuses.includes(order.status)) {
				throw new BadRequestException(`Order cannot be cancelled as it is already ${order.status}`);
			}
			
			// Calculate the refund amount
			const refundAmount = order.price * order.quantity;
			
			// Get buyer and seller information for transaction records
			const [buyer, seller] = await Promise.all([
				this.userModel.findById(order.buyerId).session(session),
				this.userModel.findById(order.sellerId).session(session)
			]);
			
			if (!buyer || !seller) {
				throw new BadRequestException('Buyer or seller not found');
			}
			
			console.log(`💰 Pre-refund balances - Buyer: $${buyer.balance.toFixed(2)}, Seller: $${seller.balance.toFixed(2)}`);
			
			// Process refund: credit buyer, debit seller (atomic updates)
			const buyerUpdateResult = await this.userModel.updateOne(
				{ _id: order.buyerId },
				{ $inc: { balance: refundAmount } }
			).session(session);
			
			const sellerUpdateResult = await this.userModel.updateOne(
				{ _id: order.sellerId },
				{ $inc: { balance: -refundAmount } }
			).session(session);
			
			if (buyerUpdateResult.modifiedCount !== 1 || sellerUpdateResult.modifiedCount !== 1) {
				throw new Error('Failed to process refund balance updates');
			}
			
			// Create refund transactions for both parties
			const [buyerRefundTransaction, sellerDebitTransaction] = await Promise.all([
				// Buyer credit transaction (getting money back)
				this.transactionService.createTransaction({
					fromUserId: order.sellerId,
					toUserId: order.buyerId,
					amount: refundAmount, // Positive amount for credit
					type: 'order_refund',
					description: `Refund for cancelled order: ${order.productName} (Qty: ${order.quantity}) from ${seller.name}`,
					relatedId: orderId,
					metadata: {
						originalOrderId: orderId,
						productId: order.productId,
						productName: order.productName,
						quantity: order.quantity,
						unitPrice: order.price,
						totalRefund: refundAmount,
						cancelledAt: new Date().toISOString(),
						cancelledBy: userRole,
						buyerName: buyer.name,
						sellerName: seller.name
					}
				}, session),
				// Seller debit transaction (money being taken back)
				this.transactionService.createTransaction({
					fromUserId: order.sellerId,
					toUserId: order.buyerId,
					amount: -refundAmount, // Negative amount for debit
					type: 'order_refund',
					description: `Refund debit for cancelled order: ${order.productName} (Qty: ${order.quantity}) to ${buyer.name}`,
					relatedId: orderId,
					metadata: {
						originalOrderId: orderId,
						productId: order.productId,
						productName: order.productName,
						quantity: order.quantity,
						unitPrice: order.price,
						totalRefund: refundAmount,
						cancelledAt: new Date().toISOString(),
						cancelledBy: userRole,
						buyerName: buyer.name,
						sellerName: seller.name
					}
				}, session)
			]);
			
			// Restore product quantity when order is cancelled
			const productUpdateResult = await this.productModel.updateOne(
				{ _id: order.productId },
				{ $inc: { quantity: order.quantity } }
			).session(session);
			
			if (productUpdateResult.modifiedCount !== 1) {
				console.warn(`Could not restore product quantity for order ${orderId}`);
			}

			// Remove order from any vehicle assignments if it's assigned
			await this.vehicleModel.updateMany(
				{ assignedOrders: orderId },
				{ $pull: { assignedOrders: orderId } }
			).session(session);
			
			// Update vehicle status if no orders remain
			await this.vehicleModel.updateMany(
				{ assignedOrders: { $size: 0 }, status: 'loaded' },
				{ $set: { status: 'available' } }
			).session(session);

			// Update order status to cancelled
			await Promise.all([
				this.orderModel.updateOne({ orderId }, { status: 'cancelled' }).session(session),
				this.orderHistoryModel.updateOne({ orderId }, { status: 'cancelled' }).session(session)
			]);

			// Verify final balances
			const [updatedBuyer, updatedSeller] = await Promise.all([
				this.userModel.findById(order.buyerId).session(session),
				this.userModel.findById(order.sellerId).session(session)
			]);
			
			console.log(`💰 Post-refund balances - Buyer: $${updatedBuyer?.balance.toFixed(2)}, Seller: $${updatedSeller?.balance.toFixed(2)}`);
			console.log(`💰 Refund transactions created - Buyer credit: ${buyerRefundTransaction.transactionId}, Seller debit: ${sellerDebitTransaction.transactionId}`);
			
			// Commit the transaction if everything succeeded
			await session.commitTransaction();
			return { 
				message: 'Order cancelled successfully', 
				restoredQuantity: order.quantity,
				refundAmount: refundAmount
			};

		} catch (error) {
			// Rollback all changes if anything fails
			await session.abortTransaction();
			console.error('❌ Order cancellation failed, rolling back transaction:', error.message);
			throw error;
		} finally {
			await session.endSession();
		}
	}

	async getColdStorageOrders() {
		return this.orderModel.find({ 
			$or: [
				{ status: 'dispatched_to_coldstorage' },
				{ status: 'in_coldstorage' }
			]
		}).sort({ date: -1, time: -1 });
	}

	async debugOrderFlow(productId: string, buyerId: string, buyerEmail: string, buyerName: string) {
		try {
			// Check if product exists and get details
			const product = await this.productModel.findById(productId);
			if (!product) {
				return { error: 'Product not found', productId };
			}

			// Check if seller exists
			const seller = await this.userModel.findById(product.sellerId);
			if (!seller) {
				return { error: 'Seller not found', sellerId: product.sellerId };
			}

			// Check buyer balance
			const buyer = await this.userModel.findById(buyerId);
			if (!buyer) {
				return { error: 'Buyer not found', buyerId };
			}

			const debugInfo = {
				product: {
					id: product._id,
					name: product.name,
					price: product.price,
					quantity: product.quantity,
					sellerId: product.sellerId
				},
				seller: {
					id: seller._id,
					name: seller.name,
					email: seller.email,
					balance: seller.balance
				},
				buyer: {
					id: buyer._id,
					name: buyer.name,
					email: buyer.email,
					balance: buyer.balance
				},
				canAfford: buyer.balance >= product.price,
				hasStock: product.quantity > 0,
				readyForOrder: buyer.balance >= product.price && product.quantity > 0
			};

			console.log('🔍 Order Flow Debug:', JSON.stringify(debugInfo, null, 2));
			return debugInfo;
		} catch (error) {
			console.error('❌ Debug order flow error:', error);
			return { error: error.message, stack: error.stack };
		}
	}

	async receiveInColdStorage(orderId: string) {
		const order = await this.orderModel.findOne({ orderId });
		if (!order) {
			throw new BadRequestException('Order not found');
		}

		if (order.status !== 'dispatched_to_coldstorage') {
			throw new BadRequestException('Order must be dispatched to cold storage to be received');
		}

		const updateData = { status: 'in_coldstorage' };

		await this.orderModel.updateOne({ orderId }, updateData);
		await this.orderHistoryModel.updateOne({ orderId }, updateData);

		return { message: 'Order received in cold storage' };
	}

	async dispatchFromColdStorage(orderId: string, logisticsData: { logisticsId: string, logisticsName: string, logisticsEmail: string }) {
		const order = await this.orderModel.findOne({ orderId });
		if (!order) {
			throw new BadRequestException('Order not found');
		}

		if (order.status !== 'in_coldstorage') {
			throw new BadRequestException('Order must be in cold storage to dispatch');
		}

		const now = new Date();
		const dateString = now.toISOString().split('T')[0];

		// When cold storage dispatches, it goes to the selected logistics for final delivery
		const updateData = { 
			status: 'shippedtologistics',  // Set to shippedtologistics so logistics can see and process the order
			dispatchedFromColdStorageDate: dateString,
			// Assign to the selected logistics company
			logisticsId: logisticsData.logisticsId,
			logisticsName: logisticsData.logisticsName,
			logisticsEmail: logisticsData.logisticsEmail,
			// Clear cold storage assignment since it's being dispatched
			coldStorageId: null,
			coldStorageName: null
		};

		await this.orderModel.updateOne({ orderId }, updateData);
		await this.orderHistoryModel.updateOne({ orderId }, updateData);

		return { 
			message: `Order dispatched from cold storage to ${logisticsData.logisticsName} - ready for pickup`,
			logisticsCompany: logisticsData.logisticsName
		};
	}

	// Complaint-related methods
	async fileComplaint(userId: string, userEmail: string, userName: string, userRole: string, complaintData: any) {
		try {
			console.log('Filing complaint with data:', JSON.stringify(complaintData));
			console.log('User info:', { userId, userEmail, userName, userRole });
			
			// Extract necessary fields, with fallbacks
			const orderId = complaintData.orderId;
			const reason = complaintData.complaintReason || complaintData.reason;
			const description = complaintData.description;
			
			if (!orderId || !reason || !description) {
				console.error('Missing required fields:', { orderId, reason, description });
				throw new BadRequestException('Missing required fields: orderId, reason, and description are required');
			}
			
			// Normalize the user role to handle case inconsistencies
			const normalizedRole = userRole?.toLowerCase();
			console.log('Normalized user role:', normalizedRole);
			
			// Validate the order exists and belongs to this user (buyer or seller)
			let order;
			
			// Allow admin and insurance users to file complaints for any order
			if (normalizedRole === 'admin' || normalizedRole === 'insurance') {
				console.log(`Looking for order as ${normalizedRole}: { orderId: ${orderId} }`);
				order = await this.orderModel.findOne({ orderId: orderId });
			}
			// Buyer role check
			else if (normalizedRole === 'buyer') {
				console.log(`Looking for order as buyer: { orderId: ${orderId}, buyerId: ${userId} }`);
				order = await this.orderModel.findOne({ 
					orderId: orderId,
					buyerId: userId 
				});
			} 
			// Seller role check
			else if (normalizedRole === 'seller') {
				console.log(`Looking for order as seller: { orderId: ${orderId}, sellerId: ${userId} }`);
				order = await this.orderModel.findOne({ 
					orderId: orderId,
					sellerId: userId 
				});
			} 
			// Fallback: try both buyer and seller lookups
			else {
				console.log(`User role ${normalizedRole} not explicitly recognized. Trying buyer and seller lookup.`);
				order = await this.orderModel.findOne({ 
					orderId: orderId,
					$or: [
						{ buyerId: userId },
						{ sellerId: userId }
					]
				});
				
				// If order found, determine the actual role
				if (order) {
					userRole = order.buyerId === userId ? 'buyer' : 'seller';
					console.log(`Determined user role from order: ${userRole}`);
				} else {
					throw new BadRequestException('Invalid user role or order not found');
				}
			}

		if (!order) {
			throw new NotFoundException('Order not found or does not belong to you');
		}

		// Check if order is dispatched to customer (status dispatched_to_customer)
		if (order.status !== 'dispatched_to_customer' && order.status !== 'delivered') {
			throw new BadRequestException('You can only file complaints for orders that have been dispatched or delivered');
		}
		
		// Check if complaint already exists for this order
		const existingComplaint = await this.complaintModel.findOne({ orderId });
		if (existingComplaint) {
			throw new BadRequestException('A complaint already exists for this order');
		}

		// Check if the complaint is being filed within 24 hours of dispatch
		if (!order.dispatchedToCustomerDate) {
			throw new BadRequestException('This order has not been dispatched yet');
		}
		
		const dispatchDate = new Date(order.dispatchedToCustomerDate);
		const currentDate = new Date();
		const hoursDiff = Math.abs(currentDate.getTime() - dispatchDate.getTime()) / 36e5; // Convert ms to hours
		
		if (hoursDiff > 24) {
			throw new BadRequestException('Complaints must be filed within 24 hours of dispatch');
		}
		
		// Get both buyer and seller information
		const buyer = await this.userModel.findById(order.buyerId);
		const seller = await this.userModel.findById(order.sellerId);
		
		if (!buyer) {
			throw new NotFoundException('Buyer information not found');
		}
		if (!seller) {
			throw new NotFoundException('Seller information not found');
		}

		// Check if seller has active insurance subscription
		console.log(`🔍 Checking insurance for seller ID: ${order.sellerId}`);

		let insuranceValidation = {
			hasInsurance: false,
			canFileClaim: false,
			reason: '',
			coverageAmount: 0,
			orderAmount: order.price * order.quantity
		};

		try {
			console.log(`Approach 1: Looking for insurance policies directly...`);
			// First, check if there are any active insurance policies for this seller
			const directPolicies = await this.insurancePolicyModel.find({
				sellerId: order.sellerId,
				status: 'active',
				endDate: { $gte: new Date().toISOString() }
			});
			
			console.log(`Found ${directPolicies.length} direct policies for seller ${order.sellerId}`);
			
			if (directPolicies.length > 0) {
				const policy = directPolicies[0]; // Use the first active policy
				insuranceValidation.hasInsurance = true;
				const coverageAmount = policy.coverageAmount || 30; // Default to 30 for demo
				
				insuranceValidation.coverageAmount = coverageAmount;
				console.log(`Insurance Policy Found - ID: ${policy._id}, Type: ${policy.policyType}, Coverage: ₹${coverageAmount}`);
				
				if (insuranceValidation.orderAmount <= coverageAmount) {
					insuranceValidation.canFileClaim = true;
					console.log(`✅ Order amount (₹${insuranceValidation.orderAmount}) is within coverage (₹${coverageAmount})`);
				} else {
					insuranceValidation.reason = `❌ Order amount (₹${insuranceValidation.orderAmount}) exceeds insurance coverage (₹${coverageAmount})`;
					console.log(insuranceValidation.reason);
				}
			} else {
				console.log(`Approach 2: Looking in insurance collection by userId...`);
				// Try to find in the insurance collection by userId
				const sellerInsurance = await this.insuranceModel.findOne({
					userId: order.sellerId,
					status: 'active',
					endDate: { $gte: new Date() }
				});
				
				if (sellerInsurance) {
					console.log(`Found insurance record: ${sellerInsurance._id}, policy reference: ${sellerInsurance.policyId}`);
					insuranceValidation.hasInsurance = true;
					
					// Use coverage from the insurance record if available
					const coverageAmount = sellerInsurance.coverage || 30; // Default to 30 for demo
					insuranceValidation.coverageAmount = coverageAmount;
					
					console.log(`Using coverage amount: ₹${coverageAmount}`);
					
					if (insuranceValidation.orderAmount <= coverageAmount) {
						insuranceValidation.canFileClaim = true;
						console.log(`✅ Order amount (₹${insuranceValidation.orderAmount}) is within coverage (₹${coverageAmount})`);
					} else {
						insuranceValidation.reason = `❌ Order amount (₹${insuranceValidation.orderAmount}) exceeds insurance coverage (₹${coverageAmount})`;
						console.log(insuranceValidation.reason);
					}
				} else {
					// For demo purposes, allow claims even if no insurance found
					console.log(`No active insurance found, using demo values for testing`);
					insuranceValidation.hasInsurance = true;
					insuranceValidation.canFileClaim = true;
					insuranceValidation.coverageAmount = 30; // Demo value
					insuranceValidation.reason = '';
				}
			}
		} catch (error) {
			console.error('Error checking insurance:', error);
			// For demo purposes, use default values
			insuranceValidation.hasInsurance = true;
			insuranceValidation.canFileClaim = true;
			insuranceValidation.coverageAmount = 30;
			insuranceValidation.reason = '';
		}

		// Create a unique complaint ID
		const complaintId = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Create new complaint with insurance validation info
		const newComplaint = new this.complaintModel({
			complaintId,
			orderId: order.orderId,
			productId: order.productId,
			productName: order.productName,
			quantity: order.quantity,
			price: order.price,
			totalAmount: order.price * order.quantity,
			buyerId: order.buyerId,
			buyerName: buyer.name,
			buyerEmail: buyer.email,
			sellerId: order.sellerId,
			sellerName: seller.name,
			sellerEmail: seller.email,
			orderDate: order.date,
			dispatchDate: order.dispatchedToCustomerDate,
			complaintDate: new Date().toISOString(),
			complaintReason: reason,
			description,
			status: 'pending',
			complainantId: userId,
			complainantName: userName,
			complainantEmail: userEmail,
			complainantRole: userRole,
			// Insurance validation info
			hasInsurance: insuranceValidation.hasInsurance,
			canFileClaim: insuranceValidation.canFileClaim,
			insuranceReason: insuranceValidation.reason,
			coverageAmount: insuranceValidation.coverageAmount,
			orderAmount: insuranceValidation.orderAmount
		});
		
		await newComplaint.save();
		
		console.log(`Complaint filed successfully: ${complaintId}`);
		
		return { 
			success: true,
			message: 'Complaint filed successfully',
			complaint: newComplaint
		};
		} catch (error) {
			console.error('Error filing complaint:', error);
			throw error;
		}
	}

	async getSellerComplaints(sellerId: string) {
		const complaints = await this.complaintModel.find({ sellerId }).sort({ complaintDate: -1 });
		return complaints;
	}

	async getBuyerComplaints(buyerId: string) {
		try {
			console.log(`Fetching complaints for buyer: ${buyerId}`);
			
			if (!buyerId) {
				console.error('No buyerId provided to getBuyerComplaints');
				throw new BadRequestException('Buyer ID is required');
			}
			
			// Check if buyer exists
			const buyer = await this.userModel.findById(buyerId);
			if (!buyer) {
				console.log(`Warning: Buyer with ID ${buyerId} not found`);
			}
			
			// Find all complaints for this buyer
			console.log(`Executing query: this.complaintModel.find({ buyerId: ${buyerId} })`);
			const complaints = await this.complaintModel.find({ buyerId }).sort({ complaintDate: -1 });
			console.log(`Found ${complaints.length} complaints for buyer ${buyerId}`);
			
			// Log the first complaint for debugging
			if (complaints.length > 0) {
				console.log('First complaint sample:', JSON.stringify(complaints[0]));
			}
			
			return complaints;
		} catch (error) {
			console.error(`Error in getBuyerComplaints: ${error.message}`, error.stack);
			throw error;
		}
	}

	// Toggle complaint importance flag
	async toggleComplaintImportance(complaintId: string, agentId: string) {
		try {
			console.log(`🌟 Toggling importance for complaint: ${complaintId} by agent: ${agentId}`);
			
			// Find the complaint
			const complaint = await this.complaintModel.findOne({ complaintId });
			if (!complaint) {
				throw new NotFoundException('Complaint not found');
			}
			
			// Toggle the importance flag
			complaint.isImportant = !complaint.isImportant;
			
			// Set or clear the agent ID who marked it
			if (complaint.isImportant) {
				complaint.markedByAgentId = agentId;
			} else {
				complaint.markedByAgentId = ''; // Use empty string instead of null
			}
			
			await complaint.save();
			
			console.log(`✅ Complaint importance toggled to: ${complaint.isImportant}`);
			return {
				success: true,
				isImportant: complaint.isImportant,
				complaint
			};
		} catch (error) {
			console.error(`Error toggling complaint importance: ${error.message}`, error.stack);
			throw error;
		}
	}
	
	// Get complaints for insurance agent - shows filed claims from their subscribers
	async getInsuranceAgentComplaints(agentId: string) {
		try {
			console.log(`🔍 Fetching complaints for insurance agent: ${agentId}`);
			
			// Find the agent
			const agent = await this.userModel.findById(agentId);
			if (!agent || agent.role !== 'insurance') {
				throw new BadRequestException('Invalid insurance agent');
			}
			
			console.log(`👤 Agent: ${agent.name} (${agent.email})`);
			
			// Find all insurances where this agent is assigned
			const insurances = await this.insuranceModel.find({
				$or: [
					{ agentId: agentId },
					{ agentEmail: agent.email }
				],
				status: 'active'
			});
			
			console.log(`📋 Found ${insurances.length} insurances for this agent`);
			
			// Get seller emails from these insurances
			const sellerEmails = insurances.map(ins => ins.userEmail).filter(email => email);
			
			console.log(`📧 Seller emails: ${sellerEmails.length > 0 ? sellerEmails.join(', ') : 'NO SELLER EMAILS FOUND!'}`);
			
			// Debug: Check if there are any complaints with status 'filed' in the system
			const allFiledComplaints = await this.complaintModel.find({ status: 'filed' });
			console.log(`🔎 DEBUG: Total complaints with status 'filed' in the system: ${allFiledComplaints.length}`);
			
			// If no seller emails, just get all filed complaints for debugging
			let complaints;
			if (sellerEmails.length === 0) {
				console.log('⚠️ No seller emails found. Getting all filed complaints for debugging...');
				complaints = await this.complaintModel.find({ status: 'filed' }).limit(20);
			} else {
				// Find all complaints with status 'filed' from these sellers, regardless of claim status
				complaints = await this.complaintModel.find({
					sellerEmail: { $in: sellerEmails },
					status: 'filed'
				}).sort({ complaintDate: -1 });
			}
			
			console.log(`✅ Found ${complaints.length} filed complaints for agent's subscribers`);
			
			// Debug: Log the complaint IDs that were found
			if (complaints.length > 0) {
				complaints.forEach((c, i) => {
					console.log(`   ${i+1}. Complaint ${c.complaintId}: status=${c.status}, seller=${c.sellerEmail}`);
				});
			} else {
				console.log('⚠️ No complaints found with status "filed" for these sellers');
			}
			
			return complaints;
		} catch (error) {
			console.error(`Error in getInsuranceAgentComplaints: ${error.message}`, error.stack);
			throw error;
		}
	}

	async getComplaintById(complaintId: string, userId: string) {
		const complaint = await this.complaintModel.findOne({ complaintId });
		
		if (!complaint) {
			throw new NotFoundException('Complaint not found');
		}
		
		// Ensure the user is either the buyer or seller
		if (complaint.buyerId !== userId && complaint.sellerId !== userId) {
			throw new ForbiddenException('You do not have permission to view this complaint');
		}
		
		return complaint;
	}

	async updateComplaintStatus(complaintId: string, status: string, userId: string, claimId?: string) {
		const complaint = await this.complaintModel.findOne({ complaintId });
		
		if (!complaint) {
			throw new NotFoundException('Complaint not found');
		}
		
		// Only seller can update status to 'claimed'
		if (status === 'claimed' && complaint.sellerId !== userId) {
			throw new ForbiddenException('Only the seller can claim a complaint');
		}
		
		// Update complaint status
		complaint.status = status;
		
		// If the status is 'claimed', link to the insurance claim
		if (status === 'claimed' && claimId) {
			complaint.claimId = claimId;
			complaint.hasClaim = true;
		}
		
		await complaint.save();
		
		return {
			success: true,
			message: `Complaint status updated to ${status}`,
			complaint
		};
	}

	async fileClaim(complaintId: string, sellerId: string) {
		console.log(`🚀 CLAIM FILING STARTED - ComplaintId: ${complaintId}, SellerId: ${sellerId}`);
		
		// Get the complaint
		const complaint = await this.complaintModel.findOne({ complaintId });
		if (!complaint) {
			throw new NotFoundException('Complaint not found');
		}
		
		console.log(`📄 Complaint found: ${complaint.productName} - Amount: $${complaint.price * complaint.quantity}`);

		// Check if the seller owns this complaint
		if (complaint.sellerId !== sellerId) {
			throw new BadRequestException('You can only file claims for your own complaints');
		}

		// Check if complaint is still pending
		if (complaint.status !== 'pending') {
			throw new BadRequestException('Claims can only be filed for pending complaints');
		}

		// Check if a claim already exists for this complaint
		if (complaint.hasClaim) {
			throw new BadRequestException('A claim has already been filed for this complaint');
		}

		// NOTE: We removed the early validation checks (hasInsurance, canFileClaim) from complaint data
		// because they are cached at complaint creation time and may be outdated.
		// Instead, we'll check the current insurance status directly from the database below.

		// Check if seller has an active insurance policy from insurance collection
		console.log(`🔍 VALIDATING INSURANCE POLICY for seller: ${sellerId}`);
		
		const currentDate = new Date();
		console.log(`📅 Current date: ${currentDate.toISOString()}`);
		
		// Find the seller to get email
		const seller = await this.userModel.findOne({ _id: sellerId });
		if (!seller || !seller.email) {
			throw new NotFoundException('Seller not found or email missing');
		}
		
		// First check in the insurances collection by seller's email with date validation
		// For policy validation, we check if the status is 'active' AND dates are valid
		// Sort by createdAt descending to get the most recent policy
		const activeInsurances = await this.insuranceModel.find({
			userEmail: seller.email,
			status: 'active',
			startDate: { $lte: currentDate },
			endDate: { $gte: currentDate }
		}).sort({ createdAt: -1 });
		
		console.log(`Found ${activeInsurances.length} insurances with status 'active' and valid dates for seller email: ${seller.email}`);
		
		let activePolicy: any = null;
		let insuranceAgent: any = null;
		let insuranceDocument: any = null; // Keep reference to the actual insurance document for updates
		
		// If found in insurance collection, use that
		if (activeInsurances.length > 0) {
			const activeInsurance = activeInsurances[0];
			insuranceDocument = activeInsurance; // Store the actual document reference
			console.log(`✅ ACTIVE INSURANCE FOUND in insurance collection:`);
			console.log(`   Policy ID: ${activeInsurance.policyId}`);
			console.log(`   Coverage: $${activeInsurance.coverage}`);
			console.log(`   Type: ${activeInsurance.insuranceType}`);
			console.log(`   Status: ${activeInsurance.status}`);
			console.log(`   Start Date: ${activeInsurance.startDate}`);
			console.log(`   End Date: ${activeInsurance.endDate}`);
			console.log(`   Agent ID: ${activeInsurance.agentId || 'NOT SET'}`);
			console.log(`   Agent Name: ${activeInsurance.agentName || 'NOT SET'}`);
			console.log(`   Agent Email: ${activeInsurance.agentEmail || 'NOT SET'}`);
			
			// Try to find the insurance agent who created this policy
			if (activeInsurance.agentId) {
				insuranceAgent = await this.userModel.findOne({ 
					_id: activeInsurance.agentId, 
					role: 'insurance' 
				});
				
				if (insuranceAgent) {
					console.log(`   ✅ Agent Found via agentId: ${insuranceAgent.name} (${insuranceAgent.email})`);
				} else {
					console.log(`   ⚠️ Agent ID exists but agent not found or not insurance role`);
				}
			} else {
				console.log(`   ⚠️ No agentId in insurance record - trying to find any insurance agent`);
				
				// If no agent in insurance record, find any insurance agent as fallback
				insuranceAgent = await this.userModel.findOne({ role: 'insurance' });
				if (insuranceAgent) {
					console.log(`   ✅ Fallback Agent Found: ${insuranceAgent.name} (${insuranceAgent.email})`);
				}
			}
			
			// Create a compatible policy object from the insurance data
			activePolicy = {
				policyId: activeInsurance.policyId,
				coverageAmount: activeInsurance.coverage || 10000, // Default coverage if not specified
				policyType: activeInsurance.insuranceType || 'normal',
				startDate: activeInsurance.startDate,
				endDate: activeInsurance.endDate,
				status: activeInsurance.status,
				totalClaimsAmount: 0, // Default value since it might not exist in the new schema
				claimsCount: 0,       // Default value
				insuranceId: activeInsurance._id,
				agentId: insuranceAgent?._id,
				agentName: insuranceAgent?.name,
				agentEmail: insuranceAgent?.email
			};
		} else {
			// If not found in new collection, check the old collection for backward compatibility
			console.log(`🔍 Checking old insurancePolicyModel for seller: ${sellerId}`);
			
			// Get all active policies for the seller from the old collection
			const activePolicies = await this.insurancePolicyModel.find({
				sellerId: sellerId,
				status: 'active'
			});
			
			// Filter policies with valid date range using JavaScript
			activePolicy = activePolicies.find(policy => {
				const startDate = new Date(policy.startDate);
				const endDate = new Date(policy.endDate);
				return startDate <= currentDate && endDate >= currentDate;
			});
			
			console.log(`🎯 Active policy found in old collection: ${activePolicy ? 'YES' : 'NO'}`);
			
			if (!activePolicy) {
				// Debug: Check what policies exist for this seller
				const allPolicies = await this.insurancePolicyModel.find({ sellerId });
				console.log(`📋 Total policies for seller: ${allPolicies.length}`);
				if (allPolicies.length > 0) {
					console.log('📊 Policy Status Breakdown:');
					allPolicies.forEach((policy, index) => {
						const startDate = new Date(policy.startDate);
						const endDate = new Date(policy.endDate);
						const isDateValid = startDate <= currentDate && endDate >= currentDate;
						
						console.log(`  ${index + 1}. Policy ${policy.policyId}:`);
						console.log(`     Status: ${policy.status}`);
						console.log(`     Dates: ${policy.startDate} to ${policy.endDate}`);
						console.log(`     Date Valid: ${isDateValid}`);
						console.log(`     Coverage: $${policy.coverageAmount}`);
					});
					
					// Find the specific issue
					const activeStatusPolicies = allPolicies.filter(p => p.status === 'active');
					if (activeStatusPolicies.length === 0) {
						throw new BadRequestException('You need an active insurance policy to file a claim. Please purchase an insurance policy and try again.');
					} else {
						// Check date issues
						const validDatePolicies = activeStatusPolicies.filter(p => {
							const start = new Date(p.startDate);
							const end = new Date(p.endDate);
							return start <= currentDate && end >= currentDate;
						});
						
						if (validDatePolicies.length === 0) {
							const policy = activeStatusPolicies[0];
							const start = new Date(policy.startDate);
							const end = new Date(policy.endDate);
							
							if (start > currentDate) {
								throw new BadRequestException(`Your insurance policy will become active on ${start.toLocaleDateString()}. Please try again after that date.`);
							} else if (end < currentDate) {
								throw new BadRequestException(`Your insurance policy expired on ${end.toLocaleDateString()}. Please renew your policy to file claims.`);
							}
						}
					}
				} else {
					throw new BadRequestException('You need an active insurance policy to file a claim. Please purchase an insurance policy and try again.');
				}
			} else {
				console.log(`✅ VALID INSURANCE POLICY FOUND in old collection:`);
				console.log(`   Policy ID: ${activePolicy.policyId}`);
				console.log(`   Coverage: $${activePolicy.coverageAmount}`);
				console.log(`   Type: ${activePolicy.policyType}`);
				console.log(`   Claims Used: $${activePolicy.totalClaimsAmount || 0}`);
				console.log(`   Status: ${activePolicy.status}`);
				console.log(`   Valid From: ${activePolicy.startDate}`);
				console.log(`   Valid Until: ${activePolicy.endDate}`);
			}
		}
		
		// At this point, activePolicy is guaranteed to exist and be valid
		if (!activePolicy) {
			throw new BadRequestException('You need an active insurance policy to file a claim. Please purchase an insurance policy and try again.');
		}

		// Log policy type information
		console.log('Policy type check:', {
			policyId: activePolicy.policyId,
			policyType: activePolicy.policyType || 'normal',
			complaintReason: complaint.complaintReason
		});

		// Check if the policy type is appropriate for the complaint reason
		// Default to 'normal' if policyType is missing
		const policyType = (activePolicy.policyType || 'normal').toLowerCase();
		
		// With active status confirmed, we can assume all complaints are covered
		// This simplifies the policy validation as per your requirement
		const isComplaintCoveredByPolicy = true;
			
		if (!isComplaintCoveredByPolicy) {
			throw new BadRequestException(`Your policy type (${policyType}) doesn't cover this type of complaint`);
		}

		// Calculate the claim amount
		const claimAmount = complaint.price * complaint.quantity;
		console.log('Claim amount calculation:', {
			price: complaint.price,
			quantity: complaint.quantity,
			calculatedAmount: claimAmount,
			coverageAmount: activePolicy.coverageAmount,
			totalClaimsAmount: activePolicy.totalClaimsAmount || 0,
			remainingCoverage: activePolicy.coverageAmount - (activePolicy.totalClaimsAmount || 0),
			policyType: activePolicy.policyType
		});
		
		// Make sure totalClaimsAmount exists and is a number
		if (!activePolicy.totalClaimsAmount) {
			activePolicy.totalClaimsAmount = 0;
		}
		
		// Check if the claim exceeds the policy's coverage amount
		// Ensure we have a valid coverage amount
		const coverageAmount = activePolicy.coverageAmount || 10000; // Default to 10000 if not specified
		
		// Check if the claim exceeds the policy's coverage amount
		if (claimAmount > coverageAmount) {
			console.log('Claim denied: Single claim exceeds coverage limit');
			throw new BadRequestException(`Claim amount ($${claimAmount.toFixed(2)}) exceeds your policy coverage limit ($${coverageAmount.toFixed(2)})`);
		}
		
		// Check if adding this claim would exceed the total coverage
		// Ensure totalClaimsAmount is a number
		const totalClaimsAmount = activePolicy.totalClaimsAmount || 0;
		
		if ((totalClaimsAmount + claimAmount) > coverageAmount) {
			const remainingCoverage = coverageAmount - totalClaimsAmount;
			console.log('Claim denied: Total claims would exceed coverage limit');
			throw new BadRequestException(`This claim would exceed your remaining coverage. Claim: $${claimAmount.toFixed(2)}, Remaining coverage: $${remainingCoverage.toFixed(2)}`);
		}

		// Generate claim ID
		const claimId = `CLM${Date.now()}${Math.floor(Math.random() * 1000)}`;
		const currentTime = new Date();
		const dateString = currentTime.toISOString().split('T')[0];

		// If agent information isn't available in the policy, try to find a suitable agent
		let assignedAgentId = activePolicy.agentId;
		let assignedAgentName = activePolicy.agentName;
		let assignedAgentEmail = activePolicy.agentEmail;
		
		// If agent information is not available in the policy, try to find an agent from policy details
		if (!assignedAgentId) {
			console.log(`🔍 No agent assigned in policy - searching for agents that handle policy ${activePolicy.policyId}`);
			
			// Try finding an agent through the policy collection
			if (activePolicy.policyId) {
				const policy = await this.insurancePolicyModel.findOne({ policyId: activePolicy.policyId });
				if (policy && (policy as any).agentId) {
					console.log(`👥 Found agent through policy lookup`);
					
					const agent = await this.userModel.findOne({ 
						_id: (policy as any).agentId,
						role: 'insurance'
					});
					
					if (agent) {
						assignedAgentId = agent._id;
						assignedAgentName = agent.name;
						assignedAgentEmail = agent.email;
						console.log(`✅ Assigned agent found: ${assignedAgentName} (${assignedAgentEmail})`);
					}
				}
			}
			
			// If still no agent found, try to find any active agent
			if (!assignedAgentId) {
				console.log(`🔍 No agent found through policy - finding any available insurance agent`);
				
				const anyAgent = await this.userModel.findOne({ role: 'insurance' });
				if (anyAgent) {
					assignedAgentId = anyAgent._id;
					assignedAgentName = anyAgent.name;
					assignedAgentEmail = anyAgent.email;
					console.log(`✅ Found available agent: ${assignedAgentName} (${assignedAgentEmail})`);
				} else {
					console.warn('⚠️ No insurance agents found in the system!');
				}
			}
		}
		
		// Create insurance claim
		console.log(`\n🎯 PREPARING CLAIM DATA:`);
		console.log(`   Assigned Agent ID: ${assignedAgentId || 'NULL'}`);
		console.log(`   Assigned Agent Name: ${assignedAgentName || 'NULL'}`);
		console.log(`   Assigned Agent Email: ${assignedAgentEmail || 'NULL'}`);
		
		const claimData = {
			claimId,
			complaintId: complaint.complaintId,
			orderId: complaint.orderId,
			productId: complaint.productId,
			productName: complaint.productName,
			quantity: complaint.quantity,
			price: complaint.price,
			totalAmount: claimAmount,
			sellerId: complaint.sellerId,
			sellerName: complaint.sellerName,
			sellerEmail: complaint.sellerEmail,
			buyerId: complaint.buyerId,
			buyerName: complaint.buyerName,
			buyerEmail: complaint.buyerEmail,
			insuranceId: activePolicy.insuranceId,
			policyId: activePolicy.policyId,
			orderDate: complaint.orderDate,
			dispatchDate: complaint.dispatchDate,
			complaintDate: complaint.complaintDate,
			claimDate: dateString,
			claimReason: complaint.complaintReason,
			description: complaint.description,
			// Add insurance agent information to route claims to the right agent
			agentId: assignedAgentId || null,
			agentName: assignedAgentName || null,
			agentEmail: assignedAgentEmail || null,
			// Make sure we also set the processingAgentId which is used in queries
			processingAgentId: assignedAgentId || null,
			status: 'pending'
		};

		console.log(`\n💾 CREATING CLAIM IN DATABASE:`);
		console.log(`   Claim ID: ${claimId}`);
		console.log(`   Processing Agent ID: ${claimData.processingAgentId || 'NULL - WILL NOT APPEAR IN AGENT DASHBOARD!'}`);
		
		// Create claim in database
		const claim = await this.insuranceClaimModel.create(claimData);
		
		console.log(`\n✅ CLAIM CREATED IN DATABASE:`);
		console.log(`   Claim _id: ${claim._id}`);
		console.log(`   Claim ID: ${claim.claimId}`);
		console.log(`   Processing Agent ID: ${(claim as any).processingAgentId || 'NOT SET'}`);
		console.log(`   Agent ID: ${(claim as any).agentId || 'NOT SET'}`);
		console.log(`   Status: ${claim.status}`);

		// Update complaint to link to the claim and set status to 'filed' (not 'claimed')
		// so insurance agents can see it in their dashboard
		complaint.claimId = claimId;
		complaint.hasClaim = true;
		complaint.status = 'filed'; // Use 'filed' status for insurance agent to see
		await complaint.save();
		
		console.log(`📝 Complaint status updated to 'filed' for insurance agent to see`);

		// Update policy statistics
		// If we have the insurance document (from new collection), update it directly
		// If we have old policy model, update that instead
		if (insuranceDocument) {
			// Update the insurance document from the new collection
			console.log(`Updating insurance document ${activePolicy.policyId}`);
			
			// Since insurance schema doesn't have claimsCount/totalClaimsAmount fields by default,
			// we'll track them in the insurance document dynamically
			if (!(insuranceDocument as any).claimsCount) {
				(insuranceDocument as any).claimsCount = 0;
			}
			if (!(insuranceDocument as any).totalClaimsAmount) {
				(insuranceDocument as any).totalClaimsAmount = 0;
			}
			if (!(insuranceDocument as any).lastClaimDate) {
				(insuranceDocument as any).lastClaimDate = null;
			}
			
			(insuranceDocument as any).claimsCount += 1;
			(insuranceDocument as any).totalClaimsAmount += claimAmount;
			(insuranceDocument as any).lastClaimDate = dateString;
			
			console.log(`Updated claims: count=${(insuranceDocument as any).claimsCount}, total=$${(insuranceDocument as any).totalClaimsAmount}`);
			await insuranceDocument.save();
		} else if (activePolicy && activePolicy.save) {
			// Update old policy model
			activePolicy.claimsCount += 1;
			activePolicy.totalClaimsAmount += claimAmount;
			activePolicy.lastClaimDate = dateString;
			console.log(`Updating policy ${activePolicy.policyId}: claims count=${activePolicy.claimsCount}, total amount=${activePolicy.totalClaimsAmount}`);
			await activePolicy.save();
		} else {
			console.log(`⚠️ No document to update policy statistics - skipping`);
		}

		console.log(`🎉 CLAIM FILED SUCCESSFULLY!`);
		console.log(`   Claim ID: ${claimId}`);
		console.log(`   Amount: $${claimAmount.toFixed(2)}`);
		console.log(`   Policy: ${activePolicy.policyId} (${activePolicy.policyType})`);
		if (activePolicy.agentId) {
			console.log(`   Assigned to Agent: ${activePolicy.agentName} (${activePolicy.agentEmail})`);
		}
		
		return {
			success: true,
			message: activePolicy.agentName ? 
				`Insurance claim filed successfully and assigned to agent ${activePolicy.agentName}` : 
				'Insurance claim filed successfully',
			claimId,
			claimAmount,
			agentAssigned: activePolicy.agentName ? true : false,
			agentId: activePolicy.agentId || null,
			agentName: activePolicy.agentName || null,
			agentEmail: activePolicy.agentEmail || null
		};
	}
	
	async checkSellerInsuranceStatus(sellerId: string) {
		console.log(`🔍 Checking insurance status for seller: ${sellerId}`);
		
		const currentDate = new Date();
		
		// Find the user to get their email
		const seller = await this.userModel.findOne({ _id: sellerId });
		if (!seller) {
			throw new NotFoundException('Seller not found');
		}
		
		// First, check for expired insurance policies and update their status to 'expired'
		// Find all policies that are still active but have expired based on endDate
		const expiredPolicies = await this.insuranceModel.find({
			userEmail: seller.email,
			status: 'active',
			endDate: { $lt: currentDate } // endDate is before currentDate (expired)
		});
		
		// Update expired policies to 'expired' status
		if (expiredPolicies.length > 0) {
			console.log(`Found ${expiredPolicies.length} expired insurance policies for seller ${seller.email}`);
			
			// Update each expired policy
			for (const policy of expiredPolicies) {
				console.log(`Updating expired policy ${policy.policyId} to status 'expired'`);
				await this.insuranceModel.updateOne(
					{ _id: policy._id },
					{ $set: { status: 'expired' } }
				);
			}
		}
		
		// Get active insurance policies for the seller
		const activeInsurances = await this.insuranceModel.find({
			userId: sellerId,
			status: 'active'
		});

		// Get insurance policy information
		const insurancePolicies = await this.insurancePolicyModel.find({
			status: 'active'
		});

		// Return active insurance information for the seller
		return {
			sellerId,
			sellerEmail: seller.email,
			hasActiveInsurance: activeInsurances.length > 0,
			activeInsurancesCount: activeInsurances.length,
			activePolicies: insurancePolicies.length,
			currentDate: currentDate.toISOString()
		};
	}

	async updateExpiredInsurancePolicies() {
		console.log(`🔄 Checking and updating expired insurance policies`);
		const currentDate = new Date();
		
		// Update new insurance model
		const expiredPolicies = await this.insuranceModel.find({
			status: 'active',
			endDate: { $lt: currentDate }
		});
		
		if (expiredPolicies.length > 0) {
			console.log(`Found ${expiredPolicies.length} expired insurance policies`);
			
			// Update each expired policy
			for (const policy of expiredPolicies) {
				console.log(`Updating expired policy ${policy.policyId} for ${policy.userEmail} to status 'expired'`);
				await this.insuranceModel.updateOne(
					{ _id: policy._id },
					{ $set: { status: 'expired' } }
				);
			}
		} else {
			console.log('No expired policies found in new insurance model');
		}
		
		// Update old insurance policy model
		const oldExpiredPolicies = await this.insurancePolicyModel.find({
			status: 'active',
			endDate: { $lt: currentDate }
		});
		
		if (oldExpiredPolicies.length > 0) {
			console.log(`Found ${oldExpiredPolicies.length} expired old insurance policies`);
			
			// Update each expired policy
			for (const policy of oldExpiredPolicies) {
				console.log(`Updating expired old policy ${policy.policyId} to status 'expired'`);
				await this.insurancePolicyModel.updateOne(
					{ _id: policy._id },
					{ $set: { status: 'expired' } }
				);
			}
		} else {
			console.log('No expired policies found in old insurance model');
		}
		
		return {
			success: true,
			expiredPoliciesCount: expiredPolicies.length + oldExpiredPolicies.length,
			message: `Updated ${expiredPolicies.length + oldExpiredPolicies.length} expired insurance policies to 'expired' status`
		};
	}

	async getOrderTracking(orderId: string, userId: string, userRole: string) {
		console.log(`🔍 Order tracking request: ${orderId} by user ${userId} (${userRole})`);
		
		// Find the order
		const order = await this.orderModel.findOne({ orderId });
		if (!order) {
			throw new NotFoundException('Order not found');
		}

		// Check if user has permission to view this order
		const hasPermission = 
			userRole === 'admin' || 
			order.buyerId === userId ||
			order.sellerId === userId ||
			order.logisticsId === userId ||
			order.coldStorageId === userId ||
			order.driverId === userId;

		if (!hasPermission) {
			throw new ForbiddenException('You do not have permission to view this order');
		}

		// Get additional user details for addresses
		const [buyer, seller, logistics, coldStorage, driver] = await Promise.all([
			this.userModel.findById(order.buyerId),
			this.userModel.findById(order.sellerId),
			order.logisticsId ? this.userModel.findById(order.logisticsId) : null,
			order.coldStorageId ? this.userModel.findById(order.coldStorageId) : null,
			order.driverId ? this.userModel.findById(order.driverId) : null
		]);

		// Return comprehensive order tracking information
		return {
			orderId: order.orderId,
			productName: order.productName,
			quantity: order.quantity,
			price: order.price,
			totalAmount: order.price * order.quantity,
			status: order.status,
			date: order.date,
			time: order.time,
			deliveryDestination: order.deliveryDestination || 'customer',
			
			// Buyer information
			buyerName: order.buyerName,
			buyerEmail: order.buyerEmail,
			buyerAddress: buyer?.address || order.buyerAddress || 'Address not available',
			
			// Seller information
			sellerName: order.sellerName,
			sellerAddress: seller?.address || order.sellerAddress || 'Address not available',
			
			// Logistics information
			logisticsName: order.logisticsName,
			logisticsAddress: logistics?.address || order.logisticsAddress,
			
			// Cold storage information
			coldStorageName: order.coldStorageName,
			coldStorageAddress: coldStorage?.address || order.coldStorageAddress,
			
			// Driver information
			driverName: order.driverName,
			driverAddress: driver?.address || order.driverAddress,
			
			// Tracking dates
			dispatchedToColdStorageDate: order.dispatchedToColdStorageDate,
			dispatchedFromColdStorageDate: order.dispatchedFromColdStorageDate,
			dispatchedToCustomerDate: order.dispatchedToCustomerDate,
			
			// Additional metadata
			createdAt: order.get('createdAt'),
			updatedAt: order.get('updatedAt')
		};
	}
	
	// Handle initial dispatch from seller to logistics
	async dispatchToLogistics(orderId: string, logisticsId: string, sellerId: string, deliveryDestination: string = 'customer') {
		const dateString = new Date().toISOString();
		
		// Find the order and verify it belongs to this seller
		const order = await this.orderModel.findOne({ 
			orderId, 
			sellerId 
		});
		
		if (!order) {
			throw new BadRequestException('Order not found or not authorized');
		}
		
		// Allow orders from any status to be dispatched to logistics
		// Common statuses include: pending, in_coldstorage, dispatched_from_coldstorage
		const validSourceStatuses = ['pending', 'in_coldstorage', 'dispatched_from_coldstorage', 'in cold storage'];
		
		if (!validSourceStatuses.includes(order.status?.toLowerCase())) {
			throw new BadRequestException(`Order cannot be dispatched to logistics from status "${order.status}". Valid statuses are: ${validSourceStatuses.join(', ')}`);
		}
		
		// Get logistics provider details
		const logistics = await this.userModel.findOne({ _id: logisticsId, role: 'logistics' });
		
		if (!logistics) {
			throw new BadRequestException('Logistics provider not found');
		}
		
		// Always dispatch directly to customer - removed cold storage routing
		const requiresColdStorage = false; // Cold storage feature disabled
		// Set status to 'shippedtologistics' to indicate the order is ready for logistics to process
		const newStatus = 'shippedtologistics';
		
		console.log(`=== DISPATCH TO LOGISTICS DEBUG ===`);
		console.log(`Order ID: ${orderId}`);
		console.log(`Seller ID: ${sellerId}`);
		console.log(`Logistics ID: ${logisticsId}`);
		console.log(`Logistics Name: ${logistics.name}`);
		console.log(`Delivery Destination Parameter: "${deliveryDestination}"`);
		console.log(`Requires Cold Storage: ${requiresColdStorage}`);
		console.log(`New Status: ${newStatus}`);
		console.log(`=== END DEBUG ===`);
		
		// Update both order models with logistics info and direct delivery status
		const updateData = {
			status: newStatus, // Set to 'shippedtologistics' so logistics knows it's ready for pickup
			deliveryDestination: 'customer', // Always set to customer delivery
			logisticsId: logistics._id,
			logisticsName: logistics.name,
			logisticsEmail: logistics.email,
			dispatchDate: dateString,
		};

		// Update both order and order history
		await Promise.all([
			this.orderModel.updateOne({ orderId }, updateData),
			this.orderHistoryModel.updateOne({ orderId }, updateData)
		]);
		
		// Get the updated order
		const updatedOrder = await this.orderModel.findOne({ orderId });
		
		// Generate success message for direct delivery
		const successMessage = `Order successfully assigned to ${logistics.name} for delivery to customer (status: shipped to logistics)`;
		
		return {
			success: true,
			message: successMessage,
			deliveryDestination: 'customer',
			status: newStatus,
			order: {
				orderId: updatedOrder?.orderId || orderId,
				productName: updatedOrder?.productName || 'Product',
				status: updatedOrder?.status || newStatus,
				logisticsName: updatedOrder?.logisticsName || logistics.name,
				dispatchDate: dateString,
				deliveryDestination: 'customer'
			}
		};
	}

	async cancelComplaint(complaintId: string, sellerId: string) {
		try {
			console.log(`🚫 Attempting to cancel complaint: ${complaintId} by seller: ${sellerId}`);
			
			// Find the complaint - log query parameters for debugging
			console.log(`Query parameters: complaintId=${complaintId}`);
			const complaint = await this.complaintModel.findOne({ complaintId });
			
			// Debug complaint lookup result
			console.log(`Complaint lookup result: ${complaint ? 'Found' : 'Not Found'}`);
			if (complaint) {
				console.log(`Complaint details: ID=${complaint._id}, Status=${complaint.status}`);
				// Print the entire complaint object structure but omit large text fields
				const complaintSummary = { ...complaint.toObject() };
				if (complaintSummary.description && complaintSummary.description.length > 100) {
					complaintSummary.description = complaintSummary.description.substring(0, 100) + '...';
				}
				console.log('Complaint summary:', JSON.stringify(complaintSummary, null, 2));
			}
			
			if (!complaint) {
				throw new NotFoundException(`Complaint not found with ID: ${complaintId}`);
			}
			
			// Check if the seller owns this complaint
			if (complaint.sellerId !== sellerId) {
				throw new ForbiddenException(`You can only cancel your own complaints. Found sellerId: ${complaint.sellerId}, expected: ${sellerId}`);
			}
			
			// Check if complaint is in a state that can be cancelled
			const cancellableStatuses = ['pending'];
			if (!cancellableStatuses.includes(complaint.status)) {
				throw new BadRequestException(`Complaint cannot be cancelled as it is in ${complaint.status} status`);
			}
			
			// If there's a claim associated with this complaint, prevent cancellation
			if (complaint.hasClaim || complaint.claimId) {
				throw new BadRequestException('Cannot cancel complaint with an associated insurance claim');
			}
			
			// CRITICAL FIX: Do NOT use complaint.save() as it triggers validation
			// Instead, use direct database operations that bypass Mongoose validation
			try {
				// Use the native MongoDB driver to update directly
				const db = this.complaintModel.db;
				const collection = db.collection('complaints');
				
				console.log('Using direct MongoDB update to bypass Mongoose validation...');
				
				// Use Mongoose updateOne instead to avoid type issues with _id
				const updateResult = await this.complaintModel.updateOne(
					{ _id: complaint._id },
					{ 
						$set: {
							status: 'rejected',  // Using 'rejected' instead of 'cancelled'
							cancellationDate: new Date().toISOString(),
							cancellationReason: 'Cancelled by seller'
						}
					},
					{ runValidators: false } // Bypass schema validation
				);
				
				console.log(`Direct DB update result: ${JSON.stringify(updateResult)}`);
				
				if (updateResult.modifiedCount !== 1) {
					throw new Error('Failed to update complaint status');
				}
				
				// Fetch the updated complaint to return it
				const updatedComplaint = await this.complaintModel.findById(complaint._id);
				
				console.log(`✅ Complaint ${complaintId} successfully cancelled`);
				
				return {
					success: true,
					message: 'Complaint cancelled successfully',
					complaint: updatedComplaint
				};
			} catch (updateError) {
				console.error('Error during complaint update:', updateError);
				// Check if it's a validation error
				if (updateError.name === 'ValidationError') {
					throw new BadRequestException(`Validation error: ${updateError.message}`);
				}
				throw updateError;
			}
		} catch (error) {
			console.error(`❌ Error cancelling complaint: ${error.message}`);
			console.error('Error stack:', error.stack);
			throw error;
		}
	}
	
	// Process refund for a filed complaint (used by insurance agents)
	async processComplaintRefund(complaintId: string, agentId: string, comments?: string) {
		const session = await this.orderModel.db.startSession();
		session.startTransaction();
		
		try {
			console.log(`🔄 Processing refund for complaint: ${complaintId} by agent: ${agentId}`);
			
			// Find the complaint
			const complaint = await this.complaintModel.findOne({ complaintId }).session(session);
			if (!complaint) {
				throw new NotFoundException('Complaint not found');
			}
			
			// Validate the complaint status is filed
			if (complaint.status !== 'filed') {
				throw new BadRequestException(`Cannot process refund for complaint with status: ${complaint.status}. Status must be 'filed'.`);
			}
			
			// Get the order amount to refund
			const refundAmount = complaint.orderAmount || (complaint.price * complaint.quantity);
			
			// Find the buyer using their email (to credit funds to)
			console.log(`🔍 Looking for buyer with email: ${complaint.buyerEmail}`);
			let buyer = await this.userModel.findOne({ 
				email: complaint.buyerEmail 
			}).session(session);
			
			// Fallback to ID lookup if not found by email
			if (!buyer) {
				console.error(`❌ Buyer not found with email: ${complaint.buyerEmail}`);
				console.log(`🔍 Falling back to buyerId: ${complaint.buyerId}`);
				
				buyer = await this.userModel.findById(complaint.buyerId).session(session);
				if (!buyer) {
					throw new BadRequestException(`Buyer not found with email: ${complaint.buyerEmail} or id: ${complaint.buyerId}`);
				}
				console.log(`✅ Buyer found by ID: ${buyer.name} (${buyer._id})`);
			} else {
				console.log(`✅ Buyer found by email: ${buyer.name} (${buyer._id})`);
			}
			
			// Find the insurance agent (to debit funds from) - try multiple lookup methods
			console.log(`🔍 Looking for insurance agent with userId: ${agentId}`);
			
			// First try looking up by _id directly
			let insuranceAgent = await this.userModel.findOne({ 
				_id: agentId, 
				role: 'insurance'
			}).session(session);
			
			// If not found, try looking up in the insurance collection first
			if (!insuranceAgent) {
				console.log(`⚠️ Agent not found directly. Looking up in insurance collection.`);
				const insuranceRecord = await this.insuranceModel.findOne({ userId: agentId }).session(session);
				
				if (insuranceRecord) {
					console.log(`✅ Found insurance record with userId: ${insuranceRecord.userId}`);
					// Now get the user record
					insuranceAgent = await this.userModel.findOne({ 
						_id: insuranceRecord.userId,
						role: 'insurance'
					}).session(session);
				}
			}
			
			// If still not found, look for any insurance agent as fallback
			if (!insuranceAgent) {
				console.log(`⚠️ Still no agent found. Looking for any available insurance agent.`);
				insuranceAgent = await this.userModel.findOne({ role: 'insurance' }).session(session);
				
				if (insuranceAgent) {
					console.log(`✅ Found fallback insurance agent: ${insuranceAgent.name}`);
				}
			}
			
			// Final check if agent is found
			if (!insuranceAgent) {
				console.error(`❌ No insurance agent found in the system!`);
				throw new ForbiddenException(`No insurance agent found in the system. Please contact administrator.`);
			}
			
			console.log(`✅ Using insurance agent: ${insuranceAgent.name} (${insuranceAgent._id})`);
			console.log(`💰 Insurance agent balance: $${insuranceAgent.balance.toFixed(2)}`);
			
			// Store the agent ID for later use - handle the TypeScript type issue
			const insuranceAgentId = insuranceAgent._id ? insuranceAgent._id.toString() : agentId;
			
			// Check if insurance account has sufficient balance
			if (insuranceAgent.balance < refundAmount) {
				throw new BadRequestException(`Insufficient funds in insurance account. Required: $${refundAmount.toFixed(2)}, Available: $${insuranceAgent.balance.toFixed(2)}`);
			}
			
			console.log(`💰 Pre-refund balances - Buyer: $${buyer.balance.toFixed(2)}, Insurance: $${insuranceAgent.balance.toFixed(2)}`);
			
			// Process refund: debit insurance account, credit buyer account
			console.log(`💸 Debiting $${refundAmount.toFixed(2)} from insurance agent account (${insuranceAgentId})`);
			const insuranceUpdateResult = await this.userModel.updateOne(
				{ _id: insuranceAgentId, role: 'insurance' },
				{ $inc: { balance: -refundAmount } }
			).session(session);
			
			// Safely extract buyer ID from MongoDB Document
			// Use type assertions to tell TypeScript that we know buyer._id exists
			const buyerId = buyer._id ? buyer._id.toString() : complaint.buyerId;
			console.log(`💸 Crediting $${refundAmount.toFixed(2)} to buyer account (${buyerId})`);
			
			const buyerUpdateResult = await this.userModel.updateOne(
				{ _id: buyerId },
				{ $inc: { balance: refundAmount } }
			).session(session);
			
			if (insuranceUpdateResult.modifiedCount !== 1 || buyerUpdateResult.modifiedCount !== 1) {
				throw new Error('Failed to process refund balance updates');
			}
			
			// Create refund transactions for both parties
			const timestamp = new Date().toISOString();
			
			// Extract buyer data safely
			const buyerName = buyer.name || complaint.buyerName;
			const buyerEmail = buyer.email || complaint.buyerEmail;
			
			console.log(`💳 Creating transaction records for refund`);
			console.log(`   From: Insurance agent ${insuranceAgentId}`);
			console.log(`   To: Buyer ${buyerId} (${buyerName}, ${buyerEmail})`);
			console.log(`   Amount: $${refundAmount.toFixed(2)}`);
			
			const [buyerRefundTransaction, insuranceDebitTransaction] = await Promise.all([
				// Buyer credit transaction (getting money back)
				this.transactionService.createTransaction({
					fromUserId: insuranceAgentId, // Use the verified insurance agent ID
					toUserId: buyerId, // Use the found buyer's ID as string
					amount: refundAmount, // Positive amount for credit
					type: 'complaint_refund',
					description: `Refund for complaint: ${complaintId} - ${complaint.productName} (Qty: ${complaint.quantity})`,
					relatedId: complaintId,
					metadata: {
						complaintId,
						orderId: complaint.orderId,
						productId: complaint.productId,
						productName: complaint.productName,
						quantity: complaint.quantity,
						unitPrice: complaint.price,
						totalRefund: refundAmount,
						processedAt: timestamp,
						processedBy: insuranceAgentId,
						buyerName: buyerName,
						buyerEmail: buyerEmail,
						comments: comments || 'Complaint processed by insurance agent'
					}
				}, session),
				
				// Insurance debit transaction (money coming from insurance)
				this.transactionService.createTransaction({
					fromUserId: insuranceAgentId, // Use the verified insurance agent ID
					toUserId: buyerId, // Use the found buyer's ID as string
					amount: -refundAmount, // Negative amount for debit
					type: 'complaint_refund',
					description: `Insurance payout for complaint: ${complaintId} - ${complaint.productName} (Qty: ${complaint.quantity}) to ${buyerName}`,
					relatedId: complaintId,
					metadata: {
						complaintId,
						orderId: complaint.orderId,
						productId: complaint.productId,
						productName: complaint.productName,
						quantity: complaint.quantity,
						unitPrice: complaint.price,
						totalRefund: refundAmount,
						processedAt: timestamp,
						processedBy: insuranceAgentId,
						buyerName: buyerName,
						buyerEmail: buyerEmail,
						comments: comments || 'Complaint processed by insurance agent'
					}
				}, session)
			]);
			
			// Update complaint status to refunded
			complaint.status = 'refunded';
			await complaint.save({ session });
			
			// Commit the transaction
			await session.commitTransaction();
			
			console.log(`✅ Successfully processed refund for complaint ${complaintId}`);
			console.log(`   🔺 Buyer credit transaction: ${buyerRefundTransaction.transactionId} (+$${refundAmount.toFixed(2)})`);
			console.log(`   🔻 Insurance debit transaction: ${insuranceDebitTransaction.transactionId} (-$${refundAmount.toFixed(2)})`);
			
			return {
				success: true,
				message: 'Refund processed successfully',
				complaint,
				refundAmount,
				transactions: {
					buyer: buyerRefundTransaction,
					insurance: insuranceDebitTransaction
				}
			};
			
		} catch (error) {
			// Abort transaction on error
			await session.abortTransaction();
			console.error(`❌ Error processing refund: ${error.message}`);
			console.error('Error stack:', error.stack);
			throw error;
		} finally {
			// End session
			session.endSession();
		}
	}
}
