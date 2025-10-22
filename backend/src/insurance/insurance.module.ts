import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InsuranceController } from './insurance.controller';
import { TestInsuranceController } from './test-insurance.controller';
import { InsuranceService } from './insurance.service';
import { TransactionService } from './transaction.service';
import { ClaimHandlerService } from './claim-handler.service';
import { Insurance, InsuranceSchema } from './insurance.schema';
import { Policy, PolicySchema } from './policy.schema';
import { Claim, ClaimSchema } from './claim.schema';
import { Transaction, TransactionSchema } from './transaction.schema';
import { InsuranceClaim, InsuranceClaimSchema } from './insurance-claim.schema';
import { User, UserSchema } from '../user/user.schema';
import { Product, ProductSchema } from '../product/product.schema';
import { UserService } from '../user/user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Insurance', schema: InsuranceSchema },
      { name: 'Policy', schema: PolicySchema },
      { name: 'Claim', schema: ClaimSchema },
      { name: 'InsuranceClaim', schema: InsuranceClaimSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  controllers: [InsuranceController, TestInsuranceController],
  providers: [InsuranceService, TransactionService, UserService, ClaimHandlerService],
  exports: [InsuranceService, TransactionService, ClaimHandlerService],
})
export class InsuranceModule {}
