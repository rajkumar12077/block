import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Backend server is running'
    };
  }

  @Get('test-balance')
  getTestBalance() {
    return {
      balance: 2000,
      userId: 'test-user',
      email: 'test@example.com',
      message: 'Test balance endpoint working'
    };
  }

  @Get('test-dashboard')
  getTestDashboard() {
    return {
      policies: [
        {
          _id: 'test-1',
          name: 'Test Policy',
          premium: 150,
          coverage: 1500,
          duration: 12,
          description: 'Test insurance policy'
        }
      ],
      claims: [],
      insurances: [],
      stats: {
        totalPolicies: 1,
        activePolicies: 0,
        totalClaims: 0,
        pendingClaims: 0
      },
      message: 'Test dashboard endpoint working'
    };
  }
}
