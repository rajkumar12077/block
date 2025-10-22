
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiTestController } from './api-test.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { LogisticsModule } from './logistics/logistics.module';
import { InsuranceModule } from './insurance/insurance.module';
import { AccountsModule } from './accounts/accounts.module';
import { HealthController } from './health.controller';
import { ColdStorageModule } from './coldStorage/cold-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain?retryWrites=true&w=majority',
      {
        connectionFactory: (connection) => {
          console.log('📦 MongoDB connected successfully');
          return connection;
        }
      }
    ),
    AuthModule,
    UserModule,
    ProductModule,
    OrderModule,
    LogisticsModule,
    InsuranceModule,
    AccountsModule,
    ColdStorageModule,
  ],
  controllers: [AppController, ApiTestController, HealthController],
  providers: [AppService],
})
export class AppModule {}
