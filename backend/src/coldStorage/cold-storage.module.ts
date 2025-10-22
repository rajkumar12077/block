import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ColdStorageController } from './cold-storage.controller';
import { ColdStorageService } from './cold-storage.service';
import { TempData, TempDataSchema } from './temp-data.schema';
import { Temperature, TemperatureSchema } from './temperature.schema';
import { User, UserSchema } from '../user/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TempData.name, schema: TempDataSchema },
      { name: Temperature.name, schema: TemperatureSchema },
      { name: User.name, schema: UserSchema }
    ])
  ],
  controllers: [ColdStorageController],
  providers: [ColdStorageService],
  exports: [ColdStorageService]
})
export class ColdStorageModule {}