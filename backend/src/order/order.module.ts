import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PolicyHelper } from './policy-helper';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { OrderHistory, OrderHistorySchema } from './orderhistory.schema';
import { Complaint, ComplaintSchema } from './complaint.schema';
import { ProductModule } from '../product/product.module';
import { Product, ProductSchema } from '../product/product.schema';
import { User, UserSchema } from '../user/user.schema';
import { Vehicle, VehicleSchema } from '../logistics/vehicle.schema';
import { TransactionService } from '../insurance/transaction.service';
import { Transaction, TransactionSchema } from '../insurance/transaction.schema';
import { Insurance, InsuranceSchema } from '../insurance/insurance.schema';
import { InsurancePolicy, InsurancePolicySchema } from '../insurance/insurance-policy.schema';
import { InsuranceClaim, InsuranceClaimSchema } from '../insurance/insurance-claim.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderHistory.name, schema: OrderHistorySchema },
      { name: Complaint.name, schema: ComplaintSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Insurance.name, schema: InsuranceSchema },
      { name: InsurancePolicy.name, schema: InsurancePolicySchema },
      { name: InsuranceClaim.name, schema: InsuranceClaimSchema }
    ]),
    ProductModule
  ],
  controllers: [OrderController],
  providers: [OrderService, TransactionService, PolicyHelper],
})
export class OrderModule {}
