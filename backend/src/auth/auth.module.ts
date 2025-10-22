import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/user.schema';
import { LoginTracking, LoginTrackingSchema } from './login-tracking.schema';
import { LoginTrackingService } from './login-tracking.service';

@Module({
  imports: [
    JwtModule.register({ secret: 'secretKey' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: LoginTracking.name, schema: LoginTrackingSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginTrackingService],
  exports: [LoginTrackingService],
})
export class AuthModule {}
