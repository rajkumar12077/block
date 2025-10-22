import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { TransactionService } from '../insurance/transaction.service';
import { Transaction, TransactionSchema } from '../insurance/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema }
    ])
  ],
  controllers: [UserController],
  providers: [UserService, TransactionService],
  exports: [UserService],
})
export class UserModule {}
