import { Controller, Get } from '@nestjs/common';

@Controller('api-test')
export class ApiTestController {

  @Get('balance')
  getTestBalance() {
    console.log('🧪 Test balance endpoint called');
    return {
      balance:0,
      userId: 'test-user-123',
      email: 'test@example.com',
      message: 'Test balance endpoint working - no authentication required'
    };
  }

  @Get('dashboard-data')
  getTestDashboard() {
    console.log('🧪 Test dashboard endpoint called');
    return {
      policies: [
        {
          _id: 'test-policy-1',
          name: 'Test Basic Coverage',
          premium: 100,
          coverage: 1000,
          duration: 12,
          description: 'Test basic insurance coverage for agricultural products'
        },
        {
          _id: 'test-policy-2',
          name: 'Test Premium Coverage',
          premium: 200,
          coverage: 2500,
          duration: 12,
          description: 'Test premium insurance coverage with extended benefits'
        }
      ],
      claims: [],
      insurances: [
        {
          _id: 'test-insurance-1',
          userId: {
            email: 'testuser@example.com',
            role: 'seller'
          },
          policyId: 'test-policy-1',
          status: 'active',
          premium: 100,
          coverage: 1000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          totalPremiumsPaid: 300
        }
      ],
      stats: {
        totalPolicies: 2,
        activePolicies: 1,
        totalClaims: 0,
        pendingClaims: 0
      },
      message: 'Test dashboard endpoint working - no authentication required'
    };
  }

  @Get('transactions')
  getTestTransactions() {
    console.log('🧪 Test transactions endpoint called');
    return [
      {
        date: new Date().toISOString(),
        type: 'credit',
        amount: 500,
        description: 'Test insurance fund deposit',
        balance: 1500
      },
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'debit',
        amount: -100,
        description: 'Test insurance premium payment',
        balance: 1000
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'credit',
        amount: 1000,
        description: 'Test initial account setup',
        balance: 1100
      }
    ];
  }
}