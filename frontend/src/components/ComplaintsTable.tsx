import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '& .MuiTableCell-head': {
    color: theme.palette.common.white,
    fontWeight: 'bold',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  minWidth: 100,
}));

interface Complaint {
  _id: string;
  complaintId: string;     // Added complaintId field
  orderId: string;
  productId?: string;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  dispatchDate: string;
  orderDate: string;
  complaintReason: string;  // Changed from reason to complaintReason
  // Insurance validation fields
  hasInsurance: boolean;
  canFileClaim: boolean;
  insuranceReason: string;
  coverageAmount: number;
  orderAmount: number;
  description: string;
  status: string;
  complaintDate: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId?: string;        // Added seller identifier
  sellerEmail?: string;     // Added seller email
  cancellationDate?: string;
  cancellationReason?: string;
  hasClaim?: boolean;
  claimId?: string;
  sellerInsurancePolicy?: any; // Added seller's insurance policy
  validationDetails?: any;     // Added claim validation details
  policyDetailsText?: string;  // Added formatted policy details text
  policyPlanName?: string;     // Added policy plan name
}

interface ComplaintsTableProps {
  sellerId?: string;
}

const ComplaintsTable: React.FC<ComplaintsTableProps> = ({ sellerId }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [claimDialog, setClaimDialog] = useState(false);
  const [filingClaim, setFilingClaim] = useState(false);
  const [cancellingComplaint, setCancellingComplaint] = useState(false);
  const [insurancePolicy, setInsurancePolicy] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [sellerId]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      console.log('Fetching complaints and insurance data...');
      
      const token = localStorage.getItem('token');
      // Use the Vite proxy configuration for API calls
      const response = await fetch('/api/order/complaints/seller', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Process complaints with insurance check for each individual seller
      const processedComplaints = await Promise.all(data.map(async (complaint: any) => {
        // Default to not eligible
        let canFileClaim = false;
        let insuranceReason = "Not eligible for insurance claim";
        
        // Add detailed logging for debugging
        console.log(`Processing complaint ID: ${complaint.complaintId || complaint._id}`);
        
        // Get the seller's email from the complaint or fetch it if not available
        let sellerEmail = complaint.sellerEmail;
        
        if (!sellerEmail && complaint.sellerId) {
          try {
            // We need to fetch the seller's email using their ID
            console.log(`Fetching seller email for ID: ${complaint.sellerId}`);
            const sellerResponse = await fetch(`/api/user/${complaint.sellerId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (sellerResponse.ok) {
              const sellerData = await sellerResponse.json();
              sellerEmail = sellerData.email;
              console.log(`Found seller email: ${sellerEmail}`);
            }
          } catch (error) {
            console.error(`Failed to fetch seller email:`, error);
          }
        }
        
        console.log(`Seller email for this complaint: ${sellerEmail || 'unknown'}`);
        
        // Fetch insurance policy specifically for this seller
        const policyData = sellerEmail 
          ? await fetchSellerInsurance(sellerEmail)
          : null;
        
        console.log('Seller policy data:', policyData);
        
        // Use the validation helper function to check policy structure
        const isPolicyValid = validateInsuranceData(policyData);
        console.log('Seller insurance policy validation result:', isPolicyValid);
        
        // Extract and calculate additional useful information from policy data
        let policyDetailsText = '';
        let policyPlanName = '';
        if (policyData && policyData.policyDetails) {
          policyPlanName = policyData.policyDetails.name || 'Standard';
          policyDetailsText = `${policyPlanName} Plan`;
          
          if (policyData.policyDetails.type) {
            policyDetailsText += ` (${policyData.policyDetails.type})`;
          }
        }
        
        if (policyData && policyData.insurance && policyData.insurance.validUntil) {
          const validUntilDate = new Date(policyData.insurance.validUntil);
          
          // Check if policy is about to expire (within 30 days)
          const today = new Date();
          const daysRemaining = Math.ceil((validUntilDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 30) {
            policyDetailsText += ` - Expires in ${daysRemaining} days`;
          }
        }
        
        // Check conditions:
        if (isPolicyValid) {
          const orderAmount = complaint.totalAmount || complaint.orderAmount || 0;
          const coverageAmount = policyData.insurance.coverageAmount || 0;
          
          console.log(`Order amount: ${orderAmount}, Coverage amount: ${coverageAmount}`);
          
          // Check if order amount is less than coverage amount
          const isAmountEligible = orderAmount <= coverageAmount;
          
          // Check if complaint was filed within 24 hours of dispatch
          const dispatchTime = new Date(complaint.dispatchDate).getTime();
          const complaintTime = new Date(complaint.complaintDate).getTime();
          const hoursDifference = (complaintTime - dispatchTime) / (1000 * 60 * 60);
          const isTimeEligible = hoursDifference <= 24;
          
          console.log(`Amount eligible: ${isAmountEligible}, Time eligible: ${isTimeEligible} (${Math.round(hoursDifference)} hours)`);
          
          if (!isAmountEligible) {
            insuranceReason = `Order amount (${orderAmount}) exceeds coverage amount (${coverageAmount})`;
          } else if (!isTimeEligible) {
            insuranceReason = `Complaint filed ${Math.round(hoursDifference)} hours after dispatch. Must be within 24 hours.`;
          } else {
            canFileClaim = true;
            insuranceReason = "";
          }
        } else {
          // Provide more detailed reason based on what's missing
          if (!policyData) {
            insuranceReason = "No insurance policy data found";
          } else if (!policyData.insurance) {
            insuranceReason = "Insurance policy data is incomplete";
          } else if (policyData.insurance.status !== 'active') {
            insuranceReason = `Insurance policy status: ${policyData.insurance.status || 'unknown'} (not active)`;
          } else {
            insuranceReason = "No active insurance policy found";
          }
          
          console.log('Insurance check failed. Reason:', insuranceReason);
          console.log('Policy data:', policyData ? JSON.stringify(policyData) : 'No policy data');
        }
        
        // Use our validation helper function to check insurance status
        const hasActiveInsurance = validateInsuranceData(policyData);
        
        // If there's a valid policy, check if we need to fetch additional policy details
        let coverageAmount = policyData?.insurance?.coverageAmount || 0;
        if (hasActiveInsurance && policyData.policyId) {
          console.log(`Fetching additional policy details for policyId: ${policyData.policyId}`);
          try {
            // If needed, we could make an additional call here to get more policy details
            // For now, we'll use the coverage amount from the insurance object
            coverageAmount = policyData.insurance.coverageAmount || 
                            policyData.policyDetails?.coverage || 
                            0;
          } catch (err) {
            console.error('Error fetching policy details:', err);
          }
        }
        
        return {
          ...complaint,
          hasInsurance: hasActiveInsurance,
          canFileClaim,
          insuranceReason,
          coverageAmount: coverageAmount || policyData?.insurance?.coverageAmount || 0,
          sellerInsurancePolicy: policyData, // Include the full policy data for reference
          policyDetailsText, // Include formatted policy details text
          policyPlanName // Include the plan name for easy reference
        };
      }));
      
      setComplaints(processedComplaints);
      setError('');
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsurancePolicy = async () => {
    try {
      setLoadingPolicy(true);
      const token = localStorage.getItem('token');
      
      console.log('Fetching current user insurance policy...');
      
      const response = await fetch('/api/insurance/my-insurance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Insurance API response status:', response.status);
      
      if (response.ok) {
        const policyData = await response.json();
        console.log('Fetched insurance policy data:', JSON.stringify(policyData));
        
        // Log insurance details for debugging
        if (policyData && policyData.insurance) {
          console.log('Insurance status:', policyData.insurance.status);
          console.log('Coverage amount:', policyData.insurance.coverageAmount);
          console.log('Policy valid from:', policyData.insurance.validFrom);
          console.log('Policy valid until:', policyData.insurance.validUntil);
        } else {
          console.log('No insurance data found in response or missing insurance field');
          console.log('Raw response:', JSON.stringify(policyData));
        }
        
        setInsurancePolicy(policyData);
        return policyData;
      } else {
        console.error('Failed to fetch insurance policy, status:', response.status);
        try {
          const errorText = await response.text();
          console.error('Error response:', errorText);
        } catch (e) {
          console.error('Could not parse error response');
        }
        return null;
      }
    } catch (err) {
      console.error('Error fetching insurance policy:', err);
      return null;
    } finally {
      setLoadingPolicy(false);
    }
  };

  // Function to validate and get detailed eligibility status
  const validateClaimEligibility = (complaint: Complaint, policyData: any) => {
    console.log('Validating claim eligibility with policy data:', policyData);
    
    const result = {
      isPolicyActive: false,
      isAmountValid: false,
      isDateValid: false,
      isEligible: false,
      daysDifference: 0,
      hoursDifference: 0,
      orderAmount: complaint.totalAmount || complaint.orderAmount || 0,
      coverageAmount: 0,
      message: '',
      sellerEmail: complaint.sellerEmail || 'unknown'
    };
    
    // Check if we have valid insurance data
    if (!policyData || !policyData.insurance || policyData.insurance.status !== 'active') {
      result.message = `No active insurance policy found for seller ${result.sellerEmail}`;
      console.log('Insurance validation failed:', result.message);
      console.log('Policy data:', policyData);
      return result;
    }
    
    result.isPolicyActive = true;
    
    // Get coverage amount from either insurance object or policy details
    result.coverageAmount = 
                           (policyData.insurance && policyData.insurance.coverageAmount) || 
                           (policyData.policyDetails && policyData.policyDetails.coverage) ||
                           policyData.coverage || 0;
    
    console.log(`Coverage amount determined: ${result.coverageAmount}`);
    
    // Check amount
    result.isAmountValid = result.orderAmount <= result.coverageAmount;
    if (!result.isAmountValid) {
      result.message = `Order amount (${result.orderAmount}) exceeds coverage amount (${result.coverageAmount})`;
    }
    
    // Check time
    const dispatchTime = new Date(complaint.dispatchDate).getTime();
    const complaintTime = new Date(complaint.complaintDate).getTime();
    result.hoursDifference = (complaintTime - dispatchTime) / (1000 * 60 * 60);
    result.daysDifference = result.hoursDifference / 24;
    
    result.isDateValid = result.hoursDifference <= 24;
    if (!result.isDateValid) {
      result.message = `Complaint filed ${Math.round(result.hoursDifference)} hours after dispatch. Must be within 24 hours.`;
    }
    
    // Overall eligibility
    result.isEligible = result.isPolicyActive && result.isAmountValid && result.isDateValid;
    if (result.isEligible) {
      result.message = 'Eligible for insurance claim';
    }
    
    // Log detailed eligibility info for debugging
    console.log('Claim eligibility check details:', result);
    
    return result;
  };

  // Function to fetch insurance policy by seller email
  const fetchSellerInsurance = async (sellerEmail: string) => {
    try {
      console.log(`Fetching latest insurance policy for seller: ${sellerEmail}`);
      const token = localStorage.getItem('token');
      const timestamp = Date.now(); // Add timestamp to prevent caching
      
      // First try the specialized coverage endpoint which is more reliable
      try {
        console.log(`Trying coverage-specific endpoint for ${sellerEmail}`);
        const coverageResponse = await fetch(`/api/insurance/coverage-by-email/${encodeURIComponent(sellerEmail)}?_t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          cache: 'no-cache'
        });
        
        if (coverageResponse.ok) {
          const coverageData = await coverageResponse.json();
          console.log(`Got coverage data for ${sellerEmail}:`, coverageData);
          
          if (coverageData.success && coverageData.coverage > 0) {
            // Convert the simplified response to the full format
            return {
              policyId: coverageData.policyId || 'unknown',
              insurance: {
                status: coverageData.policyStatus || 'active',
                coverageAmount: coverageData.coverage,
                validUntil: coverageData.validUntil,
                timeStatus: 'active', // Assume active since we got a response
                fetchedAt: new Date().toISOString()
              },
              policyDetails: {
                name: coverageData.policyType || 'Standard',
                coverage: coverageData.coverage,
                type: coverageData.policyType || 'Standard'
              }
            };
          }
        }
      } catch (error: any) {
        console.error(`Error fetching from coverage endpoint: ${error.message}`);
        // Continue to fallback endpoint
      }
      
      // Fallback to original endpoint
      console.log(`Falling back to original insurance endpoint for ${sellerEmail}`);
      const response = await fetch(`/api/insurance/by-email/${encodeURIComponent(sellerEmail)}?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // Add cache control to ensure fresh data
        cache: 'no-cache'
      });

      console.log(`Insurance API response status for ${sellerEmail}:`, response.status);
      
      // Add retry logic for non-200 responses
      if (!response.ok && response.status !== 404) {
        console.log(`Retrying insurance fetch for ${sellerEmail} after non-200 response`);
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try again once
        const retryResponse = await fetch(`/api/insurance/by-email/${encodeURIComponent(sellerEmail)}?_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          cache: 'no-cache'
        });
        
        if (retryResponse.ok) {
          console.log(`Retry successful for ${sellerEmail}`);
          return await retryResponse.json();
        }
      }
      
      if (response.ok) {
        // Try to parse the response as JSON
        try {
          const responseText = await response.text();
          console.log(`Raw response for ${sellerEmail}:`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
          
          const policyData = JSON.parse(responseText);
          console.log(`Parsed insurance policy for seller ${sellerEmail}:`, JSON.stringify(policyData).substring(0, 500));
          
          // Log insurance details for debugging
          if (policyData && policyData.insurance) {
            // Convert dates to better readable format
            let validFrom = null;
            let validUntil = null;
            
            try {
              validFrom = policyData.insurance.validFrom ? new Date(policyData.insurance.validFrom) : null;
            } catch (e) {
              console.error('Error parsing validFrom date:', e);
            }
            
            try {
              validUntil = policyData.insurance.validUntil ? new Date(policyData.insurance.validUntil) : null;
            } catch (e) {
              console.error('Error parsing validUntil date:', e);
            }
            
            const createdAt = policyData.createdAt ? new Date(policyData.createdAt) : null;
            
            console.log(`Seller ${sellerEmail} insurance details:`, {
              status: policyData.insurance.status || 'unknown',
              coverageAmount: policyData.insurance.coverageAmount || 0,
              validFrom: validFrom && !isNaN(validFrom.getTime()) ? validFrom.toLocaleString() : 'Unknown',
              validUntil: validUntil && !isNaN(validUntil.getTime()) ? validUntil.toLocaleString() : 'Unknown',
              policyId: policyData.policyId || 'unknown',
              createdAt: createdAt && !isNaN(createdAt.getTime()) ? createdAt.toLocaleString() : 'Unknown',
              hasDetails: !!policyData.policyDetails
            });
            
            // Check if the policy is current (today is between validFrom and validUntil)
            const now = new Date();
            let isCurrentPolicy = true;
            
            if (validFrom && validUntil && !isNaN(validFrom.getTime()) && !isNaN(validUntil.getTime())) {
              isCurrentPolicy = now >= validFrom && now <= validUntil;
              console.log(`Policy date range check: ${isCurrentPolicy ? 'CURRENT' : 'EXPIRED/FUTURE'}`);
              
              if (!isCurrentPolicy) {
                if (now < validFrom) {
                  console.log(`⚠️ Policy not yet active - Starts on ${validFrom.toLocaleString()}`);
                } else {
                  console.log(`⚠️ Policy expired on ${validUntil.toLocaleString()}`);
                }
              }
            } else {
              console.log('⚠️ Cannot determine if policy is current - missing date information or invalid dates');
            }
            
            // Check if policy has details
            if (policyData.policyDetails) {
              console.log(`Policy details for ${sellerEmail}:`, {
                name: policyData.policyDetails.name,
                coverage: policyData.policyDetails.coverage,
                type: policyData.policyDetails.type,
                duration: policyData.policyDetails.duration || 'Unknown'
              });
            }
          } else {
            console.warn(`No insurance data found for seller ${sellerEmail}`);
          }
          
          return policyData;
        } catch (parseError) {
          console.error(`Error parsing response for ${sellerEmail}:`, parseError);
          return null;
        }
      } else {
        // Try to get error details from response
        try {
          const errorText = await response.text();
          console.error(`Failed to fetch insurance for seller ${sellerEmail}, status:`, response.status);
          console.error(`Error response:`, errorText);
        } catch (e) {
          console.error(`Failed to fetch insurance for seller ${sellerEmail}, status:`, response.status);
        }
        return null;
      }
    } catch (err) {
      console.error(`Error fetching insurance for seller ${sellerEmail}:`, err);
      return null;
    }
  };
  
  // Helper function to validate insurance policy structure
  const validateInsuranceData = (policyData: any) => {
    console.log('Validating insurance data structure...');
    
    // Check if policy exists
    if (!policyData) {
      console.error('Error: Policy data is null or undefined');
      return false;
    }
    
    // Check insurance object
    if (!policyData.insurance) {
      console.error('Error: Missing insurance object in policy data');
      console.log('Policy data structure:', Object.keys(policyData));
      
      // Handle legacy format where fields are at top level
      if (policyData.status && (policyData.coverage || policyData.coverageAmount)) {
        console.log('Found legacy policy format, creating insurance object');
        policyData.insurance = {
          status: policyData.status,
          coverageAmount: policyData.coverage || policyData.coverageAmount,
          validFrom: policyData.startDate || policyData.validFrom,
          validUntil: policyData.endDate || policyData.validUntil,
          fetchedAt: new Date().toISOString()
        };
        return true;
      }
      
      return false;
    }
    
    // Check required fields
    const requiredFields = ['status', 'coverageAmount'];
    const missingFields = requiredFields.filter(field => {
      // Check for coverageAmount directly or via policyDetails
      if (field === 'coverageAmount') {
        return (policyData.insurance[field] === undefined || policyData.insurance[field] === null) && 
               (!policyData?.policyDetails || policyData.policyDetails?.coverage === undefined || 
                policyData.policyDetails?.coverage === null);
      }
      return policyData.insurance[field] === undefined || policyData.insurance[field] === null;
    });
    
    if (missingFields.length > 0) {
      console.error(`Error: Missing required fields in insurance data: ${missingFields.join(', ')}`);
      console.log('Available fields:', Object.keys(policyData.insurance));
      return false;
    }
    
    // Validate status - check for active status
    const insuranceStatus = policyData.insurance?.status;
    if (!insuranceStatus || insuranceStatus !== 'active') {
      console.log(`Note: Insurance status is '${insuranceStatus || 'undefined'}', not 'active'`);
      return false;
    }
    
    // Check if policy is within its valid date range
    const now = new Date();
    console.log(`Current date: ${now.toLocaleString()}`);
    
    // Check both validFrom and validUntil dates if available
    if (policyData?.insurance?.validFrom && policyData?.insurance?.validUntil) {
      try {
        const validFrom = new Date(policyData.insurance.validFrom);
        const validUntil = new Date(policyData.insurance.validUntil);
        
        // Check if dates are valid
        if (!isNaN(validFrom.getTime()) && !isNaN(validUntil.getTime())) {
          console.log(`Policy validity period: ${validFrom.toLocaleString()} to ${validUntil.toLocaleString()}`);
          
          // Check if current date is within the policy validity period
          if (now < validFrom) {
            console.log('⚠️ Policy not yet active - Future start date');
            return false;
          }
          
          if (now > validUntil) {
            console.log('⚠️ Insurance policy has expired:', validUntil.toLocaleString());
            return false;
          }
          
          console.log('✅ Policy is currently active (within date range)');
        } else {
          console.error('Invalid date format in policy dates');
        }
      } catch (e) {
        console.error('Error parsing policy dates:', e);
        // Continue with validation even if date parsing fails
      }
    } else if (policyData?.insurance?.validUntil) {
      // If only end date is available, check that
      const validUntil = new Date(policyData.insurance.validUntil);
      console.log(`Policy end date: ${validUntil.toLocaleString()}`);
      
      if (validUntil < now) {
        console.log('⚠️ Insurance policy has expired:', validUntil.toLocaleString());
        return false;
      }
      
      console.log('✅ Policy has not expired (no start date info)');
    } else {
      console.log('⚠️ No policy validity dates available, skipping date check');
    }
    
    // Additional check: ensure coverage amount is greater than zero
    if (!policyData.insurance.coverageAmount || policyData.insurance.coverageAmount <= 0) {
      console.log('Insurance policy has no coverage amount:', policyData.insurance.coverageAmount);
      return false;
    }
    
    // Check if policy details exist
    if (policyData.policyDetails) {
      console.log('Policy details found:', {
        name: policyData.policyDetails.name,
        coverage: policyData.policyDetails.coverage,
        type: policyData.policyDetails.type
      });
      
      // Validate policy details
      if (!policyData.policyDetails.name) {
        console.warn('Policy details missing name');
      }
      
      if (!policyData.policyDetails.coverage) {
        console.warn('Policy details missing coverage amount');
      }
      
      // Use coverage from policy details as a fallback if primary coverage is not set
      if (!policyData.insurance.coverageAmount && policyData.policyDetails.coverage) {
        console.log('Using coverage amount from policy details:', policyData.policyDetails.coverage);
        policyData.insurance.coverageAmount = policyData.policyDetails.coverage;
      }
    } else {
      console.log('No policy details found, using basic insurance data only');
    }
    
    // If we got this far, the policy is valid
    console.log('Policy validated successfully for seller with coverage:', policyData.insurance.coverageAmount);
    return true;
  };

  const handleFileClaim = async (complaint: Complaint) => {
    try {
      // Use the specific seller's policy that was already fetched and stored in the complaint
      const policyData = complaint.sellerInsurancePolicy;
      
      // Validate policy data structure
      if (!validateInsuranceData(policyData)) {
        // If the stored policy isn't valid, try fetching it again
        console.log('Re-fetching seller insurance policy for claim...');
        const freshPolicy = complaint.sellerEmail 
          ? await fetchSellerInsurance(complaint.sellerEmail)
          : null;
          
        if (!validateInsuranceData(freshPolicy)) {
          setError('Could not verify seller insurance policy');
          return;
        }
        
        // Update with fresh policy data
        complaint.sellerInsurancePolicy = freshPolicy;
      }
      
      const eligibility = validateClaimEligibility(complaint, complaint.sellerInsurancePolicy);
      
      if (!eligibility.isEligible) {
        setError(eligibility.message || 'Not eligible for claim filing');
        return;
      }
      
      // If we reach here, complaint is eligible
      setSelectedComplaint({
        ...complaint,
        // Add validation details to selected complaint
        validationDetails: eligibility
      } as any);
      setClaimDialog(true);
    } catch (err) {
      console.error('Error checking claim eligibility:', err);
      setError('Failed to verify claim eligibility');
    }
  };
  
  const handleCancelComplaint = async (complaint: Complaint) => {
    if (!window.confirm(`Are you sure you want to cancel this complaint for ${complaint.productName}?`)) {
      return;
    }
    
    try {
      setCancellingComplaint(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      const complaintId = complaint.complaintId || complaint._id;
      
      console.log(`Cancelling complaint with ID: ${complaintId}`);
      console.log('Full complaint object:', complaint);
      
      if (!complaintId) {
        throw new Error('Missing complaint ID. Cannot proceed with cancellation.');
      }
      
      try {
        const response = await fetch(`/api/order/complaint/${complaintId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Cancel response status:', response.status);
        
        let responseText;
        let responseData;
        
        try {
          // Try to get the response as text first
          responseText = await response.text();
          console.log('Response text:', responseText);
          
          // Then try to parse it as JSON if possible
          if (responseText) {
            try {
              responseData = JSON.parse(responseText);
              console.log('Response data:', responseData);
            } catch (jsonError) {
              console.log('Not JSON response');
            }
          }
        } catch (textError) {
          console.error('Could not get response text:', textError);
        }
        
        if (!response.ok) {
          let errorMessage = `Failed to cancel complaint (Status: ${response.status})`;
          if (responseData && responseData.message) {
            errorMessage = responseData.message;
          } else if (responseText && responseText.includes('error')) {
            errorMessage = responseText;
          }
          throw new Error(errorMessage);
        }
        
        // If we have response data, use it, otherwise parse the text
        const result = responseData || (responseText ? JSON.parse(responseText) : {});
        
        // Update the local state to reflect the cancellation
        setComplaints(prev => 
          prev.map(c => 
            (c._id === complaint._id || c.complaintId === complaint.complaintId) 
              ? { 
                  ...c, 
                  status: result.complaint?.status || 'rejected', // Get actual status from server or use fallback
                  cancellationDate: result.complaint?.cancellationDate || new Date().toISOString(),
                  cancellationReason: result.complaint?.cancellationReason || 'Cancelled by seller'
                } 
              : c
          )
        );
        
        setSuccessMessage(result.message || 'Complaint cancelled successfully');
        
        // Refresh complaints after a short delay to ensure up-to-date data
        setTimeout(() => {
          fetchComplaints();
        }, 1000);
        
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (err) {
      console.error('Error cancelling complaint:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel complaint');
    } finally {
      setCancellingComplaint(false);
    }
  };

  // Function to determine chip color based on status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'approved':
      case 'completed':
      case 'resolved':
        return 'success';
      case 'rejected':
      case 'denied':
        return 'error';
      case 'processing':
      case 'in_progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleClaimSubmit = async () => {
    if (!selectedComplaint) return;

    try {
      setFilingClaim(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      
      // Use the eligibility validation function
      const policyData = await fetchInsurancePolicy();
      const eligibility = validateClaimEligibility(selectedComplaint, policyData);
      
      if (!eligibility.isEligible) {
        setError(eligibility.message || 'Not eligible for claim filing');
        return;
      }

      // Use the Vite proxy configuration for API calls
      const complaintId = selectedComplaint.complaintId || selectedComplaint._id;
      console.log(`Filing claim for complaint ID: ${complaintId}`);
      console.log('Full complaint object:', selectedComplaint);

      // Submit the claim
      const response = await fetch(`/api/order/complaint/${complaintId}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Claim filing response status: ${response.status}`);
      
      if (response.ok) {
        setSuccessMessage('Claim filed successfully');
        setClaimDialog(false);
        fetchComplaints();
      } else {
        let errorMessage = `Failed to file claim (Status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error filing claim:', err);
      setError(err instanceof Error ? err.message : 'Failed to file claim');
    } finally {
      setFilingClaim(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };
  
  // Helper to display elapsed time since complaint was filed
  const formatElapsedTime = (dateString: string) => {
    if (!dateString) {
      return "Unknown time";
    }
    
    try {
      const complaintDate = new Date(dateString);
      
      // Validate date
      if (isNaN(complaintDate.getTime())) {
        return "Invalid date";
      }
      
      const now = new Date();
      const diffMs = now.getTime() - complaintDate.getTime();
      
      // Handle negative time (future date)
      if (diffMs < 0) {
        return "In the future";
      }
      
      // Convert to days, hours, minutes
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h ago`;
      } else {
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMinutes}m ago`;
      }
    } catch (e) {
      console.error('Error formatting elapsed time:', e);
      return "Date error";
    }
  };
  
  const getValidationStatus = () => {
    if (!selectedComplaint) return null;
    
    // Check 1: Date difference - dispatch date and complaint date should be less than one day apart
    let daysDifference = 0;
    let isDateValid = false;
    
    try {
      if (selectedComplaint.dispatchDate && selectedComplaint.complaintDate) {
        const dispatchDate = new Date(selectedComplaint.dispatchDate);
        const complaintDate = new Date(selectedComplaint.complaintDate);
        
        if (!isNaN(dispatchDate.getTime()) && !isNaN(complaintDate.getTime())) {
          daysDifference = (complaintDate.getTime() - dispatchDate.getTime()) / (1000 * 60 * 60 * 24);
          isDateValid = daysDifference < 1;
        }
      }
    } catch (e) {
      console.error('Error calculating date difference:', e);
    }
    
    // Check 2: Policy is active - already handled by fetching the policy
    const isPolicyActive = !!(selectedComplaint.sellerInsurancePolicy || insurancePolicy);
    
    // Check 3: Claim amount vs coverage
    const price = selectedComplaint.price || 0;
    const quantity = selectedComplaint.quantity || 1;
    const claimAmount = price * quantity;
    
    let coverage = 0;
    // Try to get coverage from multiple possible locations
    if (selectedComplaint.sellerInsurancePolicy?.insurance?.coverageAmount) {
      coverage = selectedComplaint.sellerInsurancePolicy.insurance.coverageAmount;
    } else if (selectedComplaint.sellerInsurancePolicy?.policyDetails?.coverage) {
      coverage = selectedComplaint.sellerInsurancePolicy.policyDetails.coverage;
    } else if (selectedComplaint.coverageAmount) {
      coverage = selectedComplaint.coverageAmount;
    } else if (insurancePolicy?.coverage) {
      coverage = insurancePolicy.coverage;
    }
    
    const isAmountValid = coverage > 0 && claimAmount <= coverage;
    
    return {
      isDateValid,
      isPolicyActive,
      isAmountValid,
      isValid: isDateValid && isPolicyActive && isAmountValid,
      daysDifference,
      claimAmount,
      coverage
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Customer Complaints ({complaints.length})
      </Typography>
      
      {successMessage && (
        <Alert severity="success" sx={{ mt: 2, mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {complaints.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No complaints found.
        </Alert>
      ) : (
        <StyledTableContainer>
          <Table>
            <StyledTableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Dispatch Date</TableCell>
                <TableCell>Complaint Filed</TableCell>
                <TableCell>Complaint Reason</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {complaints.map((complaint) => (
                <TableRow key={complaint._id} hover>
                  <TableCell>{complaint.orderId}</TableCell>
                  <TableCell>{complaint.productName}</TableCell>
                  <TableCell>₹{complaint.price.toFixed(2)}</TableCell>
                  <TableCell>{complaint.quantity}</TableCell>
                  <TableCell>{formatDate(complaint.orderDate)}</TableCell>
                  <TableCell>{formatDate(complaint.dispatchDate)}</TableCell>
                  <TableCell>
                    {formatDate(complaint.complaintDate)}
                    {(() => {
                      const complaintDate = new Date(complaint.complaintDate);
                      const now = new Date();
                      const diffHours = (now.getTime() - complaintDate.getTime()) / (1000 * 60 * 60);
                      
                      // Highlight recent complaints (less than 24 hours old)
                      if (diffHours <= 24) {
                        return (
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              size="small" 
                              color="info" 
                              label="NEW" 
                              sx={{ mr: 1, height: '16px', fontSize: '0.65rem' }}
                            />
                            <Typography variant="caption" color="primary.main" fontWeight="bold">
                              {formatElapsedTime(complaint.complaintDate)}
                            </Typography>
                          </Box>
                        );
                      } else {
                        return (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {formatElapsedTime(complaint.complaintDate)}
                          </Typography>
                        );
                      }
                    })()}
                  </TableCell>
                  <TableCell>{complaint.complaintReason || 'No reason provided'}</TableCell>
                  <TableCell>{complaint.description || 'No description provided'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={complaint.cancellationReason ? 'CANCELLED' : complaint.status.replace('_', ' ').toUpperCase()} 
                      color={complaint.cancellationReason ? 'error' : getStatusColor(complaint.status)}
                      size="small"
                    />
                    {/* Show insurance validation info */}
                    {!complaint.hasInsurance && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip size="small" color="error" label="NO INSURANCE" sx={{ mr: 1, fontSize: '0.7rem' }} />
                        <Typography variant="caption" color="warning.main">
                          ⚠️ No active insurance policy
                        </Typography>
                      </Box>
                    )}
                    {complaint.hasInsurance && !complaint.canFileClaim && complaint.insuranceReason && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip size="small" color="warning" label="NOT CLAIMABLE" sx={{ mr: 1, fontSize: '0.7rem' }} />
                        <Typography variant="caption" color="error.main">
                          ❌ {complaint.insuranceReason}
                        </Typography>
                      </Box>
                    )}
                    {complaint.canFileClaim && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip size="small" color="success" label="CLAIMABLE" sx={{ mr: 1, fontSize: '0.7rem' }} />
                        <Typography variant="caption" color="success.main">
                          ✅ ₹{complaint.coverageAmount} coverage available
                        </Typography>
                      </Box>
                    )}
                    {/* Insurance details info - formatted with more details */}
                    <Typography 
                      variant="caption" 
                      display="block" 
                      color="info.main" 
                      sx={{ mt: 0.5, fontSize: '0.7rem', opacity: 0.8 }}
                    >
                      <span style={{ fontWeight: 'bold' }}>Seller:</span> {complaint.sellerEmail || complaint.sellerId || 'Unknown'} | 
                      <span style={{ fontWeight: 'bold' }}> Status:</span> {complaint.sellerInsurancePolicy?.insurance?.status || 'Unknown'} | 
                      <span style={{ fontWeight: 'bold' }}> Coverage:</span> ₹{complaint.coverageAmount || '0'}
                      {complaint.policyDetailsText ? (
                        <span style={{ color: '#0a9c1bff' }}> | {complaint.policyDetailsText}</span>
                      ) : null}
                      {complaint.sellerInsurancePolicy?.insurance?.timeStatus && (
                        <span style={{ 
                          color: complaint.sellerInsurancePolicy.insurance.timeStatus === 'active' ? '#ffffffff' : 
                                 complaint.sellerInsurancePolicy.insurance.timeStatus === 'future' ? '#ffffffff' : '#d32f2f',
                          marginLeft: '5px'
                        }}>
                          {complaint.sellerInsurancePolicy.insurance.timeStatus === 'active' && 
                           complaint.sellerInsurancePolicy.insurance.daysRemaining && (
                            ` (${complaint.sellerInsurancePolicy.insurance.daysRemaining} days remaining)`
                          )}
                          {complaint.sellerInsurancePolicy.insurance.timeStatus === 'expired' && ' (EXPIRED)'}
                          {complaint.sellerInsurancePolicy.insurance.timeStatus === 'future' && ' (STARTS SOON)'}
                        </span>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {complaint.status === 'pending' && !complaint.cancellationReason && (
                      <>
                        <StyledButton
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleFileClaim(complaint)}
                          disabled={!complaint.canFileClaim}
                          title={!complaint.canFileClaim 
                            ? complaint.insuranceReason 
                            : `File insurance claim - Order within coverage (${complaint.coverageAmount}) and filed within 24h of dispatch`
                          }
                        >
                          File Claim
                        </StyledButton>
                        <StyledButton
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleCancelComplaint(complaint)}
                          disabled={cancellingComplaint}
                        >
                          Cancel
                        </StyledButton>
                      </>
                    )}
                    {(complaint.status === 'claim_filed' || complaint.status === 'claimed') && (
                      <Typography variant="body2" color="textSecondary">
                        Claim Filed
                      </Typography>
                    )}
                    {complaint.cancellationReason && (
                      <Typography variant="body2" color="error">
                        Cancelled
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      )}

      {/* Claim Filing Dialog */}
      <Dialog open={claimDialog} onClose={() => !filingClaim && setClaimDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>File Insurance Claim</DialogTitle>
        <DialogContent>
          {selectedComplaint && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Claim Details
              </Typography>
              <Typography><strong>Order ID:</strong> {selectedComplaint.orderId}</Typography>
              <Typography><strong>Product:</strong> {selectedComplaint.productName}</Typography>
              <Typography><strong>Order Amount:</strong> ₹{selectedComplaint.totalAmount}</Typography>
              
              {/* Insurance Eligibility Details */}
              <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #dcedc8' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>
                    <strong>Insurance Eligibility Check</strong>
                  </Typography>
                  {selectedComplaint.canFileClaim ? (
                    <Chip 
                      size="small" 
                      color="success" 
                      label="ELIGIBLE FOR CLAIM" 
                      sx={{ fontWeight: 'bold' }} 
                    />
                  ) : (
                    <Chip 
                      size="small" 
                      color="error" 
                      label="NOT ELIGIBLE" 
                      sx={{ fontWeight: 'bold' }} 
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    size="small" 
                    color={
                      selectedComplaint.sellerInsurancePolicy?.insurance?.timeStatus === 'active' ? 'success' :
                      selectedComplaint.sellerInsurancePolicy?.insurance?.timeStatus === 'future' ? 'info' : 'error'
                    }
                    label={
                      selectedComplaint.sellerInsurancePolicy?.insurance?.timeStatus === 'active' ? 'ACTIVE' :
                      selectedComplaint.sellerInsurancePolicy?.insurance?.timeStatus === 'future' ? 'FUTURE' : 'EXPIRED'
                    }
                    sx={{ mr: 1 }} 
                  />
                  <Typography>
                    <strong>Insurance Policy:</strong>
                    {selectedComplaint.sellerInsurancePolicy?.policyDetails && (
                      <span> {selectedComplaint.sellerInsurancePolicy.policyDetails.name} Plan</span>
                    )}
                    {selectedComplaint.sellerInsurancePolicy?.insurance?.daysRemaining && 
                     selectedComplaint.sellerInsurancePolicy.insurance.timeStatus === 'active' && (
                      <span style={{ color: '#2e7d32' }}> 
                        ({selectedComplaint.sellerInsurancePolicy.insurance.daysRemaining} days remaining)
                      </span>
                    )}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    size="small" 
                    color={selectedComplaint.canFileClaim ? "success" : "error"} 
                    label={selectedComplaint.canFileClaim ? "VERIFIED" : "NOT VERIFIED"} 
                    sx={{ mr: 1 }} 
                  />
                  <Typography>
                    <strong>Order Amount:</strong> ₹{selectedComplaint.totalAmount || 0} 
                    {selectedComplaint?.sellerInsurancePolicy?.insurance?.coverageAmount ? (
                      <span> (within coverage limit of ₹{
                        selectedComplaint.sellerInsurancePolicy?.insurance?.coverageAmount || 
                        selectedComplaint.sellerInsurancePolicy?.policyDetails?.coverage || 
                        selectedComplaint.coverageAmount || 0})</span>
                    ) : (
                      <span> (coverage information not available)</span>
                    )}
                  </Typography>
                </Box>
                
                {/* Policy validity information */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    size="small" 
                    color="info" 
                    label="DATES" 
                    sx={{ mr: 1 }} 
                  />
                  <Typography>
                    <strong>Policy Validity:</strong> 
                    {selectedComplaint.sellerInsurancePolicy?.insurance?.validFrom && (
                      <span> From {new Date(selectedComplaint.sellerInsurancePolicy.insurance.validFrom).toLocaleDateString()}</span>
                    )}
                    {selectedComplaint.sellerInsurancePolicy?.insurance?.validUntil && (
                      <span> to {new Date(selectedComplaint.sellerInsurancePolicy.insurance.validUntil).toLocaleDateString()}</span>
                    )}
                    {!selectedComplaint.sellerInsurancePolicy?.insurance?.validFrom && 
                     !selectedComplaint.sellerInsurancePolicy?.insurance?.validUntil && (
                      <span> No date information available</span>
                    )}
                  </Typography>
                </Box>
                
                {/* Policy fetch time information - to show when this data was retrieved */}
                {selectedComplaint.sellerInsurancePolicy?.insurance?.fetchedAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      size="small" 
                      color="default" 
                      label="INFO" 
                      sx={{ mr: 1 }} 
                    />
                    <Typography variant="caption" color="text.secondary">
                      <strong>Last verified:</strong> {new Date(selectedComplaint.sellerInsurancePolicy.insurance.fetchedAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    size="small" 
                    color="success" 
                    label="VERIFIED" 
                    sx={{ mr: 1 }} 
                  />
                  <Typography>
                    <strong>Complaint Time:</strong> Filed within 24 hours of dispatch
                  </Typography>
                </Box>
              </Box>
              <Typography><strong>Price per unit:</strong> ${selectedComplaint.price.toFixed(2)}</Typography>
              <Typography><strong>Quantity:</strong> {selectedComplaint.quantity}</Typography>
              <Typography><strong>Total Claim Amount:</strong> ${(selectedComplaint.price * selectedComplaint.quantity).toFixed(2)}</Typography>
              <Typography><strong>Complaint Reason:</strong> {selectedComplaint.complaintReason || 'No reason provided'}</Typography>
              <Typography><strong>Description:</strong> {selectedComplaint.description || 'No description provided'}</Typography>
              <Typography><strong>Customer:</strong> {selectedComplaint.buyerName} ({selectedComplaint.buyerEmail})</Typography>
              
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>Validation Requirements:</Typography>
                {selectedComplaint && (
                  <Box sx={{ mb: 2 }}>
                    {getValidationStatus() && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>Validation Status:</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getValidationStatus()?.isDateValid ? 
                              <Chip size="small" color="success" label="PASSED" sx={{ mr: 1 }} /> : 
                              <Chip size="small" color="error" label="FAILED" sx={{ mr: 1 }} />
                            }
                            <Typography>
                              Days between dispatch and complaint: {getValidationStatus()?.daysDifference ? 
                                Number(getValidationStatus()?.daysDifference).toFixed(1) : "0.0"} 
                              {getValidationStatus()?.isDateValid ? 
                                ' (Must be less than 1 day)' : 
                                ' (Must be less than 1 day)'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getValidationStatus()?.isPolicyActive ? 
                              <Chip size="small" color="success" label="PASSED" sx={{ mr: 1 }} /> : 
                              <Chip size="small" color="error" label="FAILED" sx={{ mr: 1 }} />
                            }
                            <Typography>
                              Active insurance policy: {getValidationStatus()?.isPolicyActive ? 'Yes' : 'No'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getValidationStatus()?.isAmountValid ? 
                              <Chip size="small" color="success" label="PASSED" sx={{ mr: 1 }} /> : 
                              <Chip size="small" color="error" label="FAILED" sx={{ mr: 1 }} />
                            }
                            <Typography>
                              Claim amount (${getValidationStatus()?.claimAmount ? getValidationStatus()?.claimAmount.toFixed(2) : '0.00'}) vs Coverage (${getValidationStatus()?.coverage ? getValidationStatus()?.coverage.toFixed(2) : '0.00'})
                            </Typography>
                          </Box>
                        </Box>
                        
                        {getValidationStatus()?.isValid ? (
                          <Alert severity="success" sx={{ mt: 2 }}>
                            All validation checks passed. You can file this claim.
                          </Alert>
                        ) : (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            Some validation checks failed. Please address the issues before filing a claim.
                          </Alert>
                        )}
                      </>
                    )}
                  </Box>
                )}
                
                <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, 
                      bgcolor: selectedComplaint.sellerInsurancePolicy && 
                              selectedComplaint.sellerInsurancePolicy.insurance && 
                              selectedComplaint.sellerInsurancePolicy.insurance.status === 'active' 
                                ? '#f0f7ed' : '#fff4e5' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mb: 0 }}>Insurance Coverage:</Typography>
                    {selectedComplaint.sellerInsurancePolicy && selectedComplaint.sellerInsurancePolicy.insurance && 
                     selectedComplaint.sellerInsurancePolicy.insurance.status === 'active' ? (
                      <Chip 
                        size="small" 
                        color="success" 
                        label="ACTIVE POLICY" 
                        sx={{ fontWeight: 'bold' }} 
                      />
                    ) : (
                      <Chip 
                        size="small" 
                        color="warning" 
                        label="NO ACTIVE POLICY" 
                        sx={{ fontWeight: 'bold' }} 
                      />
                    )}
                  </Box>
                  
                  {selectedComplaint.sellerInsurancePolicy && selectedComplaint.sellerInsurancePolicy.insurance && 
                   (selectedComplaint.sellerInsurancePolicy.insurance.status === 'active' || 
                    (selectedComplaint.sellerInsurancePolicy.insurance.coverageAmount && 
                     selectedComplaint.sellerInsurancePolicy.insurance.coverageAmount > 0)) ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          size="small" 
                          color="primary" 
                          label="COVERAGE" 
                          sx={{ mr: 1, fontSize: '0.7rem' }} 
                        />
                        <Typography variant="subtitle2">
                          ₹{selectedComplaint.sellerInsurancePolicy?.insurance?.coverageAmount || 
                             selectedComplaint.sellerInsurancePolicy?.policyDetails?.coverage || 
                             selectedComplaint.coverageAmount || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          size="small" 
                          color="primary" 
                          label="PLAN" 
                          sx={{ mr: 1, fontSize: '0.7rem' }} 
                        />
                        <Typography>
                          {selectedComplaint.sellerInsurancePolicy?.policyDetails?.name || 'Standard'} 
                          {selectedComplaint.sellerInsurancePolicy?.policyDetails?.type ? 
                            ` (${selectedComplaint.sellerInsurancePolicy.policyDetails.type})` : ''}
                        </Typography>
                      </Box>
                      {selectedComplaint.sellerInsurancePolicy?.insurance?.validUntil && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            size="small" 
                            color="primary" 
                            label="VALID UNTIL" 
                            sx={{ mr: 1, fontSize: '0.7rem' }} 
                          />
                          <Typography>
                            {(() => {
                              try {
                                const validUntil = selectedComplaint.sellerInsurancePolicy?.insurance?.validUntil;
                                if (!validUntil) return 'Unknown date';
                                const date = new Date(validUntil);
                                return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                              } catch (e) {
                                console.error('Error formatting validUntil date:', e);
                                return 'Date error';
                              }
                            })()}
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Alert severity="warning">
                      No active insurance policy found. You must have an active policy to file a claim.
                    </Alert>
                  )}
                </Box>

              <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                  <Typography variant="subtitle1" gutterBottom>Order Details:</Typography>
                  <Typography>
                    <strong>Dispatch Date:</strong> {formatDate(selectedComplaint.dispatchDate)}
                  </Typography>
                  <Typography>
                    <strong>Complaint Filed:</strong> {formatDate(selectedComplaint.complaintDate)} 
                    <Chip 
                      size="small" 
                      label={formatElapsedTime(selectedComplaint.complaintDate)} 
                      color="default" 
                      variant="outlined" 
                      sx={{ ml: 1, fontSize: '0.75rem' }}
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', mt: 1, mb: 1 }}>
                    <Typography>
                      <strong>Time Since Dispatch:</strong>
                    </Typography>
                    {(() => {
                      const dispatchTime = new Date(selectedComplaint.dispatchDate).getTime();
                      const complaintTime = new Date(selectedComplaint.complaintDate).getTime();
                      const diffHours = (complaintTime - dispatchTime) / (1000 * 60 * 60);
                      const diffDays = Math.floor(diffHours / 24);
                      const remainingHours = Math.floor(diffHours % 24);
                      
                      let chipColor = "success";
                      if (diffHours > 24) {
                        chipColor = "error";
                      } else if (diffHours > 12) {
                        chipColor = "warning";
                      }
                      
                      return (
                        <Chip 
                          size="small" 
                          label={`${diffDays > 0 ? `${diffDays}d ` : ''}${remainingHours}h`}
                          color={chipColor as "error" | "success" | "warning"}
                          sx={{ ml: 1 }} 
                        />
                      );
                    })()}
                  </Box>
                  <Typography>
                    <strong>Total Claim Amount:</strong> ₹{((selectedComplaint.price || 0) * (selectedComplaint.quantity || 1)).toFixed(2)}
                  </Typography>
                </Box>
                
                {/* <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                  <Typography variant="subtitle1" gutterBottom>Insurance Coverage:</Typography>
                  {loadingPolicy ? (
                    <Box display="flex" alignItems="center">
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography>Loading insurance information...</Typography>
                    </Box>
                  ) : insurancePolicy ? (
                    <>
                      <Typography>
                        <strong>Policy ID:</strong> {insurancePolicy.policyId}
                      </Typography>
                      <Typography>
                        <strong>Coverage Amount:</strong> ${insurancePolicy.coverage?.toFixed(2) || "N/A"}
                      </Typography>
                      <Typography>
                        <strong>Status:</strong> {insurancePolicy.status}
                      </Typography>
                      <Typography>
                        <strong>Valid Until:</strong> {insurancePolicy.endDate ? formatDate(insurancePolicy.endDate) : "N/A"}
                      </Typography>
                    </>
                  ) : (
                    <Alert severity="warning">
                      No active insurance policy found. You must have an active policy to file a claim.
                    </Alert>
                  )}
                </Box> */}
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  Filing this claim will submit it to the insurance agent for review. 
                  The claim amount will be processed if all validation requirements are met.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setClaimDialog(false)} 
            disabled={filingClaim}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClaimSubmit} 
            variant="contained" 
            color="primary"
            disabled={filingClaim || loadingPolicy || !(selectedComplaint && getValidationStatus()?.isValid)}
          >
            {filingClaim ? <CircularProgress size={20} /> : 'File Claim'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplaintsTable;