// Helper module for testing insurance policies
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InsurancePolicy, InsurancePolicyDocument } from '../insurance/insurance-policy.schema';

@Injectable()
export class PolicyHelper {
  constructor(
    @InjectModel(InsurancePolicy.name)
    private insurancePolicyModel: Model<InsurancePolicyDocument>,
  ) {}

  /**
   * Creates a test insurance policy for the specified seller
   * @param policyType - The type of policy to create (normal, premium, product_damage, etc)
   * @param coverageAmount - Optional custom coverage amount
   */
  async createTestPolicy(
    sellerId: string, 
    sellerName: string, 
    sellerEmail: string, 
    policyType: string = 'normal',
    coverageAmount: number = 10000
  ): Promise<InsurancePolicy> {
    const now = new Date();
    
    // Set start date to yesterday
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    
    // Set end date to one year from now
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    const policyId = `POL${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // Determine premium based on policy type and coverage
    let premium = 500; // base premium for normal policy
    if (policyType === 'premium') {
      premium = 1000;
    } else if (coverageAmount > 10000) {
      premium = coverageAmount * 0.05; // 5% of coverage amount
    }
    
    const policy = new this.insurancePolicyModel({
      policyId,
      sellerId,
      sellerName,
      sellerEmail,
      insuranceId: 'INS123456',
      insuranceName: 'AgriSure Insurance',
      policyType, // Use the provided policy type
      coverageAmount, // Use the provided coverage amount
      premium,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      coveredProducts: [],
      claimsCount: 0,
      totalClaimsAmount: 0,
      purchaseDate: now.toISOString(),
      lastClaimDate: null
    });
    
    await policy.save();
    return policy;
  }
}