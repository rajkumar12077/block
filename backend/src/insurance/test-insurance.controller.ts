import { Controller, Get, Post, Body, Param, Delete, Put, Logger, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('test-insurance')
export class TestInsuranceController {
  private readonly logger = new Logger(TestInsuranceController.name);

  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('health')
  async health() {
    return { status: 'ok', message: 'Test Insurance API is running' };
  }
}
