import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { Vehicle, VehicleSchema } from './vehicle.schema';
import { Order, OrderSchema } from '../order/order.schema';
import { OrderHistory, OrderHistorySchema } from '../order/orderhistory.schema';
import { User, UserSchema } from '../user/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderHistory.name, schema: OrderHistorySchema },
      { name: User.name, schema: UserSchema }
    ])
  ],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService]
})
export class LogisticsModule {}