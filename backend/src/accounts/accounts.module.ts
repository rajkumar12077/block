import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsController } from './accounts.controller';
import { User, UserSchema } from '../user/user.schema';
import { Transaction, TransactionSchema } from '../insurance/transaction.schema';
import { UserService } from '../user/user.service';
import { TransactionService } from '../insurance/transaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema },
    ]),
  ],
  controllers: [AccountsController],
  providers: [UserService, TransactionService],
  exports: [UserService, TransactionService],
})
export class AccountsModule {}
