// Test script for insurance claim workflow
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const TOKEN_SELLER = 'YOUR_SELLER_TOKEN';
const TOKEN_BUYER = 'YOUR_BUYER_TOKEN';
const TOKEN_INSURANCE = 'YOUR_INSURANCE_AGENT_TOKEN';

// 1. Setup - Define all the steps in our workflow
const testInsuranceClaimWorkflow = async () => {
  try {
    console.log('🧪 TESTING INSURANCE CLAIM WORKFLOW');
    
    // Step 1: Get seller's active insurance policy
    console.log('\n📋 Step 1: Get seller active insurance');
    const sellerInsuranceResponse = await axios.get(
      `${API_URL}/insurance/my-insurance`, 
      { headers: { Authorization: `Bearer ${TOKEN_SELLER}` } }
    );
    console.log(`✅ Seller has active insurance: ${sellerInsuranceResponse.data.success}`);
    
    // Step 2: File a complaint as the buyer
    console.log('\n📋 Step 2: File a complaint as buyer');
    const complaintData = {
      orderId: 'ORD12345',
      reason: 'Damaged product',
      description: 'The product arrived damaged during shipping'
    };
    
    const complaintResponse = await axios.post(
      `${API_URL}/order/file-complaint`,
      complaintData,
      { headers: { Authorization: `Bearer ${TOKEN_BUYER}` } }
    );
    
    console.log(`✅ Complaint filed: ${complaintResponse.data.success}`);
    const { complaintId } = complaintResponse.data.complaint;
    
    // Step 3: Create an insurance claim as the seller
    console.log('\n📋 Step 3: Create insurance claim as seller');
    const claimData = {
      complaintId,
      orderId: 'ORD12345',
      productId: 'PROD12345',
      productName: 'Test Product',
      quantity: 2,
      price: 10.00,
      buyerId: 'buyer123',
      buyerName: 'Test Buyer',
      buyerEmail: 'buyer@example.com',
      orderDate: new Date().toISOString(),
      dispatchDate: new Date().toISOString(),
      complaintDate: new Date().toISOString(),
      description: 'Damaged product claim',
      forwardToAgent: true  // Automatically forward to agent
    };
    
    const claimResponse = await axios.post(
      `${API_URL}/insurance/claims`,
      claimData,
      { headers: { Authorization: `Bearer ${TOKEN_SELLER}` } }
    );
    
    console.log(`✅ Claim created: ${claimResponse.data.success}`);
    const { claimId } = claimResponse.data.claim;
    
    // Step 4: Insurance agent views pending claims
    console.log('\n📋 Step 4: Insurance agent checks pending claims');
    const agentClaimsResponse = await axios.get(
      `${API_URL}/insurance/agent/claims`,
      { headers: { Authorization: `Bearer ${TOKEN_INSURANCE}` } }
    );
    
    console.log(`✅ Agent has ${agentClaimsResponse.data.claims.length} claims`);
    
    // Step 5: Insurance agent approves the claim
    console.log('\n📋 Step 5: Insurance agent approves claim');
    const processClaimData = {
      claimId,
      status: 'approved',
      comments: 'Claim approved, processing refund to buyer'
    };
    
    const processResponse = await axios.post(
      `${API_URL}/insurance/agent/process-claim`,
      processClaimData,
      { headers: { Authorization: `Bearer ${TOKEN_INSURANCE}` } }
    );
    
    console.log(`✅ Claim processed: ${processResponse.data.success}`);
    
    // Step 6: Check if buyer received the refund
    console.log('\n📋 Step 6: Verify buyer received refund');
    const buyerBalanceResponse = await axios.get(
      `${API_URL}/user/profile`,
      { headers: { Authorization: `Bearer ${TOKEN_BUYER}` } }
    );
    
    console.log(`✅ Buyer's current balance: ${buyerBalanceResponse.data.balance}`);
    
    console.log('\n🎉 INSURANCE CLAIM WORKFLOW TEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('❌ Error during insurance claim workflow test:', error.response?.data || error.message);
  }
};

// Execute the test
testInsuranceClaimWorkflow();