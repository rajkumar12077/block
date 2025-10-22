import React, { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Box, Card, CardContent, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, MenuItem } from '@mui/material';
import { Security, Payment, Assignment, Refresh } from '@mui/icons-material';
import axios from '../api';
import OrderHistoryTable from '../components/OrderHistoryTable';
import BalanceWidget from '../components/BalanceWidget';
import ComplaintsTable from '../components/ComplaintsTable';

// Error Boundary Class Component
class ErrorBoundary extends Component<{children: ReactNode, fallback: ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error("Caught error in ErrorBoundary:", error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getTransactionTypeLabel = (type: string | undefined) => {
  // Return default value if type is undefined or null
  if (!type) {
    return 'Transaction';
  }
  
  const types: Record<string, string> = {
    // Product & Order transactions
    'product_purchase': 'Product Purchase',
    'sale_credit': 'Sale Received',
    'order_refund': 'Order Refund',
    
    // Balance & Fund transactions
    'balance_add': 'Funds Added',
    'fund_addition': 'Funds Added',
    
    // Insurance transactions
    'premium_payment': 'Insurance Premium',
    'premium_received': 'Premium Received',
    'claim_payout': 'Insurance Claim',
    'policy_refund': 'Policy Refund',
    'insurance_refund': 'Insurance Refund',
    'subscription_fee': 'Subscription Fee',
    
    // Generic fallbacks
    'credit': 'Money In',
    'debit': 'Money Out',
    'transaction': 'Transaction'
  };
  
  // If type is not found, create a readable label from the type string
  if (!types[type]) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return types[type];
};

// Helper function to determine if a transaction is a debit type
const isDebitTransaction = (transaction: any) => {
  if (!transaction) return false;
  
  const transactionType = transaction?.type || transaction?.transactionType || '';
  
  // List of all transaction types that should be considered as debits
  const debitTypes = [
    'debit',
    'premium_payment',
    'subscription_fee',
    'product_purchase',
    'fees_paid',
    'withdrawal',
    'refund_issued'
  ];
  
  return debitTypes.includes(transactionType);
};

// Calculate the running balance for sellers (same logic as buyers)
// This function is used in the transaction history table rendering
const calculateBalanceAfterTransaction = (transactions: any[], currentIndex: number, currentBalance: number) => {
  // Start with current balance (most recent balance)
  let balance = currentBalance || 0;
  
  try {
    // Ensure transactions array is valid
    if (!transactions || !Array.isArray(transactions) || currentIndex < 0) {
      return balance;
    }
    
    // Since transactions are sorted newest first, we need to work backwards
    // Subtract transactions that happened AFTER this transaction to get the balance at this point
    for (let i = 0; i < currentIndex; i++) {
      const tx = transactions[i];
      // Ensure transaction and amount exist before using them
      if (tx && typeof tx.amount === 'number') {
        balance -= tx.amount; // Remove future transactions to get past balance
      }
    }
  } catch (error) {
    console.error('Error calculating balance after transaction:', error);
    return currentBalance || 0;
  }
  
  return balance;
};

const DashboardSeller: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productDialog, setProductDialog] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    description: '',
    quantity: '',
    price: '',
    category: '',
    image: '',
  });
  
  // Removed unused selectedImage state
const [categories, setCategories] = useState<string[]>([]);
  const [addCategoryMode, setAddCategoryMode] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // Insurance related state
  const [insurance, setInsurance] = useState<any>(null);
  const [insuranceDialog, setInsuranceDialog] = useState(false);
  const [claimDialog, setClaimDialog] = useState(false);
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('normal'); // 'normal' or 'premium'
  const [insuranceStartDate, setInsuranceStartDate] = useState('');
  const [insuranceEndDate, setInsuranceEndDate] = useState('');
  const [calculatedPremium, setCalculatedPremium] = useState(0);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [addingBalance, setAddingBalance] = useState(false);
  const [claimData, setClaimData] = useState({
    productId: '',
    productName: '',
    claimType: '',
    description: '',
    quantityAffected: '',
    pricePerUnit: '',
    incidentDate: '',
    orderId: '',
    complaintId: '',
    quantity: '',
    price: '',
    buyerId: '',
    buyerName: '',
    buyerEmail: '',
    orderDate: '',
    dispatchDate: '',
    complaintDate: ''
  });
  const [insuranceError, setInsuranceError] = useState('');
  const [insuranceSuccess, setInsuranceSuccess] = useState('');
  const [cancelConfirmDialog, setCancelConfirmDialog] = useState(false);
  const [cancellingPolicy, setCancellingPolicy] = useState(false);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [insuranceAgents, setInsuranceAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentPolicies, setAgentPolicies] = useState<any[]>([]);
  const [loadingAgentPolicies, setLoadingAgentPolicies] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Calculate prorated refund details
  const calculateRefundDetails = () => {
    if (!insurance || !insurance.startDate || !insurance.endDate) {
      return null;
    }

    const startDate = new Date(insurance.startDate);
    const endDate = new Date(insurance.endDate);
    const currentDate = new Date();

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const usedDays = Math.max(0, Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - usedDays);

    const dailyRate = (insurance.premium || 0) / totalDays;
    const refundAmount = remainingDays * dailyRate;

    return {
      totalDays,
      usedDays,
      remainingDays,
      dailyRate,
      refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
      premiumPaid: insurance.premium || 0
    };
  };

  // Fetch policies for a specific agent
  const fetchAgentPolicies = async (agentId: string) => {
    if (!agentId) {
      setAgentPolicies([]);
      return;
    }

    setLoadingAgentPolicies(true);
    try {
      const token = localStorage.getItem('token');
      console.log(`🔍 Fetching policies for agent ID: ${agentId}`);
      
      const response = await axios.get(`/insurance/policies-by-agent/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`📋 Full response for agent ${agentId}:`, response.data);
      console.log(`📊 Policies found:`, response.data.policies);
      console.log(`📈 Number of policies:`, response.data.policies?.length || 0);
      
      const policies = response.data.policies || [];
      setAgentPolicies(policies);
      
      if (policies.length === 0) {
        console.warn(`⚠️ No policies found for agent ${agentId}`);
        setInsuranceError('No policies available for the selected agent. The agent may not have created any policies yet.');
      } else {
        setInsuranceError(''); // Clear any previous error
      }
      
      // Reset selected policy when agent changes
      setSelectedPolicyId('');
      
    } catch (error: any) {
      console.error('❌ Failed to fetch agent policies:', error);
      console.error('❌ Error details:', error.response?.data);
      setAgentPolicies([]);
      setInsuranceError(`Failed to fetch policies: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoadingAgentPolicies(false);
    }
  };

  // Debug function to test agents endpoint specifically
  const debugAgentsEndpoint = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No auth token found');
        alert('No authentication token found. Please log in again.');
        return;
      }

      console.log('🔍 Testing backend connectivity and agents endpoint...');
      console.log('Token exists:', !!token);
      console.log('Token preview:', token.substring(0, 20) + '...');

      // First test basic connectivity
      try {
        console.log('🌐 Testing basic connectivity with /insurance/test-connection...');
        const testResponse = await axios.get('/insurance/test-connection', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });
        console.log('✅ Backend is reachable:', testResponse.data);
      } catch (testError: any) {
        console.error('❌ Backend not reachable:', testError);
        if (testError.code === 'ECONNREFUSED' || testError.message.includes('Network Error')) {
          alert('Backend server is not running. Please start the backend server.');
          return;
        }
      }

      // Test agents endpoint
      console.log('🏢 Testing /insurance/agents endpoint...');
      const response = await axios.get('/insurance/agents', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Agents endpoint response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      console.log('Agents array:', response.data?.agents);

      if (response.data?.agents) {
        setInsuranceAgents(response.data.agents);
        console.log('✅ Successfully set insurance agents:', response.data.agents.length);
        alert(`Successfully loaded ${response.data.agents.length} insurance agents!`);
      } else {
        console.warn('⚠️  No agents found in response');
        alert('No insurance agents found in database. Check backend logs.');
      }

    } catch (error: any) {
      console.error('❌ Agents endpoint failed:', error);
      
      let errorMsg = 'Unknown error';
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMsg = 'Cannot connect to backend server. Is it running on port 3000?';
      } else if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        errorMsg = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown'}`;
        
        if (error.response.status === 401) {
          errorMsg += ' (Authentication failed - try logging in again)';
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMsg = 'Request sent but no response received from server';
      } else {
        console.error('Request setup error:', error.message);
        errorMsg = `Request setup error: ${error.message}`;
      }
      
      alert(`Debug failed: ${errorMsg}`);
    }
  };

  // Debug function to test logistics providers endpoint
  const debugLogisticsEndpoint = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No auth token found');
        alert('No authentication token found. Please log in again.');
        return;
      }

      console.log('🚛 Testing logistics providers endpoint...');

      // First test the debug endpoint
      try {
        console.log('🔍 Testing debug logistics endpoint...');
        const debugResponse = await axios.get('/user/debug-logistics', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        console.log('🔍 Debug logistics response:', debugResponse.data);
        
        const { totalUsers, logisticsUsers, roleBreakdown, logisticsUsersList } = debugResponse.data;
        console.log(`📊 Total users: ${totalUsers}, Logistics users: ${logisticsUsers}`);
        console.log('📊 Role breakdown:', roleBreakdown);
        console.log('📊 Logistics users list:', logisticsUsersList);
        
        alert(`Debug Results:\nTotal users: ${totalUsers}\nLogistics users: ${logisticsUsers}\nRoles: ${Object.keys(roleBreakdown).join(', ')}`);
        
        if (logisticsUsers === 0) {
          console.log('🚛 No logistics users found, attempting to create them...');
          
          const createResponse = await axios.post('/user/create-logistics-users', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('🚛 Create logistics users response:', createResponse.data);
          alert(`Created ${createResponse.data.created} logistics users`);
        }
        
      } catch (debugError: any) {
        console.error('❌ Debug endpoint failed:', debugError);
        alert(`Debug endpoint failed: ${debugError.response?.data?.message || debugError.message}`);
      }

      // Now test the main logistics providers endpoint
      console.log('📦 Testing main logistics providers endpoint...');
      const response = await axios.get('/user/logistics-providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📦 Logistics providers response:', response.data);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const providers = response.data;
        console.log(`✅ Successfully loaded ${providers.length} logistics providers`);
        
        providers.forEach((provider, index) => {
          console.log(`Provider ${index + 1}: ${provider.name} - ${provider.address}`);
        });
        
        alert(`Successfully loaded ${providers.length} logistics providers!\n\nProviders:\n${providers.map(p => `${p.name} - ${p.address}`).join('\n')}`);
      } else {
        console.warn('⚠️ No logistics providers found');
        alert('No logistics providers found in response');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to test logistics providers endpoint:', error);
      
      let errorMessage = 'Unknown error';
      if (error.response) {
        errorMessage = `${error.response.status}: ${error.response.data?.message || 'Server error'}`;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }
      
      alert(`Failed to test logistics providers endpoint: ${errorMessage}`);
    }
  };

  // Initialize state with default values
  const [isLoading, setIsLoading] = useState(true);
  const [didInitialize, setDidInitialize] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Initialize default values for critical state to prevent white screen
  useEffect(() => {
    // Always initialize with safe defaults to prevent white screen
    setUserProducts([]);
    setUserBalance({ balance: 0, transactions: [] });
    setTransactions([]);
    setInsuranceAgents([]);
    setAvailablePolicies([]);
    setClaims([]);
    setAgentPolicies([]);
    setDidInitialize(true);
  }, []);
  
  // Separate effect for data fetching to ensure defaults are set first
  useEffect(() => {
    if (!didInitialize) return;
    
    const loadData = async () => {
      setIsLoading(true);
      setApiError(null);
      
      try {
        await fetchInsuranceData();
        await fetchPendingOrdersCount();
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setApiError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [didInitialize]);

  // Periodic refresh to ensure insurance status is always up to date
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      console.log('🔄 Performing periodic insurance status refresh...');
      try {
        await fetchInsuranceData(true); // preserve any success/error messages
      } catch (error) {
        console.error('Periodic refresh failed:', error);
      }
    }, 2 * 60 * 1000); // Refresh every 2 minutes

    return () => clearInterval(refreshInterval);
  }, []);
  
  useEffect(() => {
    try {
      
      // Add debug functions to window for manual testing
      (window as any).debugInsuranceAgents = debugAgentsEndpoint;
      (window as any).debugLogisticsProviders = debugLogisticsEndpoint;
      (window as any).forceUpdateExpiredPolicies = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('/insurance/force-update-expired', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('🔄 Force update expired policies result:', response.data);
          // Refresh insurance data after force update
          await fetchInsuranceData(true);
          return response.data;
        } catch (error) {
          console.error('❌ Force update expired policies failed:', error);
          throw error;
        }
      };
      (window as any).testInsuranceFetch = async () => {
        try {
          const token = localStorage.getItem('token');
          const timestamp = Date.now();
          const response = await axios.get(`/insurance/my-insurance?t=${timestamp}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('🔍 Direct insurance fetch result:', response.data);
          console.log('🔍 Insurance status:', response.data?.status);
          console.log('🔍 Insurance ID:', response.data?._id);
          console.log('🔍 Created at:', response.data?.createdAt);
          return response.data;
        } catch (error) {
          console.error('❌ Direct insurance fetch failed:', error);
          throw error;
        }
      };
      (window as any).debugAllUserInsurances = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('/insurance/debug-user-insurances', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('🔍 DEBUG: All user insurances:', response.data);
          console.log('🔍 DEBUG: Latest should be:', response.data.latestInsurance);
          console.log('🔍 DEBUG: Total count:', response.data.totalCount);
          response.data.allInsurances?.forEach((ins: any, index: number) => {
            console.log(`  ${index + 1}. ID: ${ins._id}, Status: ${ins.status}, Created: ${ins.createdAt}, Premium: ${ins.premium}`);
          });
          return response.data;
        } catch (error) {
          console.error('❌ Debug all user insurances failed:', error);
          throw error;
        }
      };
      (window as any).debugAllUsers = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('/insurance/debug-users', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('🔍 All users debug:', response.data);
          console.log('📋 User roles breakdown:', response.data.users.reduce((acc: any, user: any) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {}));
          console.log('🏢 Insurance agents found:', response.data.insuranceAgents);
          return response.data;
        } catch (error) {
          console.error('Debug users failed:', error);
          throw error;
        }
      };
    } catch (error) {
      console.error('Error in initial data fetching:', error);
      setInsuranceError('Failed to initialize dashboard. Try refreshing the page.');
    }
    
    (window as any).debugAllPolicies = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/insurance/debug-all-policies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('🔍 All policies debug:', response.data);
        console.log('📊 Total policies found:', response.data.totalPolicies);
        console.log('📋 Policies by creator:', response.data.policies.reduce((acc: any, policy: any) => {
          const creator = policy.createdBy || 'unknown';
          acc[creator] = (acc[creator] || 0) + 1;
          return acc;
        }, {}));
        return response.data;
      } catch (error) {
        console.error('Debug all policies failed:', error);
        throw error;
      }
    };
    
    (window as any).debugAgentPolicies = async (agentId: string) => {
      if (!agentId) {
        console.error('❌ Please provide an agent ID');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/insurance/policies-by-agent/${agentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🔍 Policies for agent ${agentId}:`, response.data);
        return response.data;
      } catch (error) {
        console.error(`Debug agent policies failed for ${agentId}:`, error);
        throw error;
      }
    };
    
    // Add seller transaction debugging
    (window as any).testSellerTransactions = () => {
      console.log('🧪 Testing SELLER transaction history...');
      console.log('Current balance:', userBalance?.balance);
      console.log('Transactions count:', transactions.length);
      
      if (transactions.length > 0) {
        console.log('\n📊 SELLER TRANSACTION HISTORY:');
        transactions.forEach((tx, index) => {
          const calculatedBalance = calculateBalanceAfterTransaction(transactions, index, userBalance?.balance || 0);
          const txType = tx.amount > 0 ? '💚 CREDIT' : '🔴 DEBIT';
          console.log(`${index + 1}. ${txType} ${tx.type}:`, {
            date: new Date(tx.createdAt).toLocaleString(),
            description: tx.description,
            amount: `${tx.amount > 0 ? '+' : ''}₹${tx.amount}`,
            calculatedBalance: `₹${calculatedBalance}`,
            orderId: tx.relatedId || 'N/A'
          });
        });
        
        console.log('\n🔍 SELLER TRANSACTION BREAKDOWN:');
        const saleTransactions = transactions.filter(tx => tx.type === 'sale_credit');
        const refundTransactions = transactions.filter(tx => tx.type === 'order_refund');
        console.log(`- Sale transactions (should remain visible): ${saleTransactions.length}`);
        console.log(`- Refund transactions (should show debits): ${refundTransactions.length}`);
        
        refundTransactions.forEach(refund => {
          const matchingSale = saleTransactions.find(sale => 
            sale.relatedId === refund.relatedId ||
            (refund.description && sale.description && 
             refund.description.includes(sale.description.split(' ')[2]) // product name
            )
          );
          console.log(`Refund for ${refund.relatedId}:`, {
            refundAmount: refund.amount,
            hasMatchingSale: !!matchingSale,
            saleAmount: matchingSale?.amount || 'Not found'
          });
        });
      }
    };

    console.log('🔧 Debug functions available:');
    console.log('  - window.debugInsuranceAgents() - Test agents endpoint');
    console.log('  - window.debugAllUsers() - List all users and roles');
    console.log('  - window.debugAllPolicies() - List all policies in database');
    console.log('  - window.debugAgentPolicies(agentId) - List policies for specific agent');
    console.log('  - window.testSellerTransactions() - Test seller transaction visibility');
    console.log('  - window.forceUpdateExpiredPolicies() - Force update expired policies and refresh');
    console.log('  - window.testInsuranceFetch() - Test direct insurance API call');
    console.log('  - window.debugAllUserInsurances() - Show ALL insurances for current user with sorting');
  }, []);

  const fetchInsuranceInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found');
        return;
      }

      console.log('Fetching insurance information after policy change...');
      const policiesRes = await axios.get('/insurance/policies', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      console.log('Latest policy data:', policiesRes.data);
      
      // Update insurance state with active policy
      if (policiesRes.data && Array.isArray(policiesRes.data)) {
        const activePolicies = policiesRes.data.filter((policy: any) => policy.status === 'active');
        if (activePolicies.length > 0) {
          setInsurance(activePolicies[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching insurance info:', err);
    }
  };

  const fetchPendingOrdersCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/order/seller-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pendingOrders = response.data.filter((order: any) => order.status === 'pending');
        setPendingOrdersCount(pendingOrders.length);
      }
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
      setPendingOrdersCount(0);
    }
  };
  
  const fetchInsuranceData = async (preserveMessages: boolean = false) => {
    if (!preserveMessages) {
      setInsuranceError('');
      setInsuranceSuccess('');
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setInsuranceError('Authentication token not found');
        return;
      }

      console.log('Fetching seller insurance data...');

      // Initialize default values for critical state
      if (userProducts === undefined) setUserProducts([]);
      if (userBalance === null) setUserBalance({ balance: 0, transactions: [] });
      if (transactions === undefined) setTransactions([]);
      if (insuranceAgents === undefined) setInsuranceAgents([]);
      
      // Try to fetch products first
      try {
        const productsRes = await axios.get('/product/my-products', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setUserProducts(productsRes.data || []);
      } catch (err) {
        console.warn('No products found or error fetching products');
        setUserProducts([]);
      }

      // Fetch balance, transactions, and policies
      try {
        console.log('Fetching balance, policies, transactions, and agents...');
        const [balanceRes, policiesRes, transactionsRes, agentsRes] = await Promise.all([
          axios.get('/user/balance', { headers: { Authorization: `Bearer ${token}` } })
            .catch(err => { console.error('Balance fetch failed:', err.response?.data || err.message); throw err; }),
          axios.get('/insurance/policies', { headers: { Authorization: `Bearer ${token}` } })
            .catch(err => { console.error('Policies fetch failed:', err.response?.data || err.message); throw err; }),
          axios.get('/accounts/transactions', { headers: { Authorization: `Bearer ${token}` } })
            .catch(err => { console.error('Transactions fetch failed:', err.response?.data || err.message); throw err; }),
          axios.get('/insurance/agents', { headers: { Authorization: `Bearer ${token}` } })
            .catch(err => { console.error('Agents fetch failed:', err.response?.data || err.message); throw err; })
        ]);
        
        console.log('Balance response:', balanceRes.data);
        console.log('Policies response:', policiesRes.data);
        console.log('Transactions response:', transactionsRes.data);
        console.log('Agents response:', agentsRes.data);
        console.log('Transactions count:', transactionsRes.data?.length || 0);
        
        // Process balance with proper type conversion
        const balance = typeof balanceRes.data?.balance === 'string' 
          ? parseFloat(balanceRes.data.balance) 
          : balanceRes.data?.balance || 0;
        
        setUserBalance({ 
          balance: balance,
          transactions: transactionsRes.data || []
        });
        
        // Sort and process transactions (newest first) with proper amount parsing
        const sortedTransactions = (transactionsRes.data || [])
          .map((tx: any) => ({
            ...tx,
            amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
          }))
          .sort((a: any, b: any) => 
            new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
          );
        
        setTransactions(sortedTransactions);
        console.log('💰 Seller transactions processed:', sortedTransactions.length, 'items');
        console.log('💰 Sample amounts:', sortedTransactions.slice(0, 3).map((tx: any) => ({ 
          desc: tx.description, 
          amount: tx.amount, 
          type: typeof tx.amount 
        })));
        
        setInsuranceAgents(agentsRes.data?.agents || []);
        
        console.log('Updated userBalance and transactions:', transactionsRes.data?.length || 0, 'items');
        console.log('Insurance agents loaded:', agentsRes.data?.agents?.length || 0, 'agents');
        if (agentsRes.data?.agents?.length > 0) {
          console.log('Agents details:', agentsRes.data.agents.map((a: { name: string; email: string }) => `${a.name} (${a.email})`));
        } else {
          console.warn('No insurance agents found in response:', agentsRes.data);
        }
        setAvailablePolicies(policiesRes.data || []);
        
        if (policiesRes.data && policiesRes.data.length === 0) {
          setInsuranceError('No insurance policies available. Please contact administrator.');
        }
      } catch (err: any) {
        console.error('Error fetching balance/policies/transactions:', err);
        
        // Try to fetch each endpoint individually to see which one is failing
        try {
          const balanceRes = await axios.get('/user/balance', { headers: { Authorization: `Bearer ${token}` } });
          setUserBalance({ balance: balanceRes.data?.balance || 0, transactions: [] });
          console.log('Balance fetch successful individually');
        } catch (balanceErr) {
          console.error('Balance endpoint failed:', balanceErr);
        }
        
        try {
          const policiesRes = await axios.get('/insurance/policies', { headers: { Authorization: `Bearer ${token}` } });
          setAvailablePolicies(policiesRes.data || []);
          console.log('Policies fetch successful individually');
        } catch (policiesErr) {
          console.error('Policies endpoint failed:', policiesErr);
        }
        
        try {
          const transactionsRes = await axios.get('/accounts/transactions', { headers: { Authorization: `Bearer ${token}` } });
          
          // Process transactions with sorting and type conversion
          const sortedTransactions = (transactionsRes.data || [])
            .map((tx: any) => ({
              ...tx,
              amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
            }))
            .sort((a: any, b: any) => 
              new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
            );
          
          setTransactions(sortedTransactions);
          console.log('Transactions fetch successful individually');
        } catch (transactionsErr) {
          console.error('Transactions endpoint failed:', transactionsErr);
        }
        
        try {
          const agentsRes = await axios.get('/insurance/agents', { headers: { Authorization: `Bearer ${token}` } });
          setInsuranceAgents(agentsRes.data?.agents || []);
          console.log('Agents fetch successful individually');
          console.log('Agents data:', agentsRes.data);
          console.log('Number of agents found:', agentsRes.data?.agents?.length || 0);
        } catch (agentsErr) {
          console.error('Agents endpoint failed:', agentsErr);
          console.log('🔧 Trying debug agents endpoint...');
          await debugAgentsEndpoint();
        }
        
        setInsuranceError('Some data failed to load. Check console for details.');
      }

      // Try to fetch insurance and claims (these might not exist for new sellers)
      try {
        // Add timestamp to prevent caching of insurance data
        const timestamp = Date.now();
        const [insuranceRes, claimsRes] = await Promise.all([
          axios.get(`/insurance/my-insurance?t=${timestamp}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/insurance/my-claims', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        console.log('Insurance response:', insuranceRes.data);
        console.log('Insurance status:', insuranceRes.data?.status);
        console.log('Claims response:', claimsRes.data);
        
        // Check if insurance has expired and update status if needed
        if (insuranceRes.data && insuranceRes.data.status === 'active' && insuranceRes.data.endDate) {
          const currentDate = new Date();
          const endDate = new Date(insuranceRes.data.endDate);
          
          console.log('Checking insurance expiry:', {
            currentDate: currentDate.toISOString(),
            endDate: endDate.toISOString(),
            hasExpired: endDate < currentDate
          });
          
          if (endDate < currentDate) {
            console.log('Insurance policy has expired, updating status...');
            try {
              // Try multiple approaches to update the expired status
              let updateSuccess = false;
              
              // First try the new expire-policy endpoint
              try {
                const expiredResponse = await axios.post('/insurance/expire-policy', {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Expire policy response:', expiredResponse.data);
                updateSuccess = true;
              } catch (expireError) {
                console.warn('Expire policy endpoint not available, trying alternative approach');
                
                // Alternative: Try to cancel and immediately mark as expired
                try {
                  const updateResponse = await axios.put('/insurance/my-insurance', 
                    { status: 'expired' }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  console.log('Alternative update response:', updateResponse.data);
                  updateSuccess = true;
                } catch (altError) {
                  console.error('Alternative update failed:', altError);
                }
              }
              
              if (updateSuccess) {
                console.log('Insurance status updated to expired in database, refetching latest data...');
                // Refetch the latest insurance data from server to get updated status
                try {
                  const refreshTimestamp = Date.now();
                  const refreshedInsuranceRes = await axios.get(`/insurance/my-insurance?t=${refreshTimestamp}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  console.log('Refreshed insurance data:', refreshedInsuranceRes.data);
                  insuranceRes.data = refreshedInsuranceRes.data; // Use latest data from server
                } catch (refreshError) {
                  console.error('Failed to refetch insurance data:', refreshError);
                  // Fallback to local status update if refetch fails
                  insuranceRes.data.status = 'expired';
                }
              } else {
                // Even if all API calls fail, update local state to show expired
                insuranceRes.data.status = 'expired';
                console.log('Updated local insurance status to expired (fallback only)');
              }
            } catch (expiredError) {
              console.error('Failed to update expired insurance status:', expiredError);
              // Even if the API call fails, update local state to show expired
              insuranceRes.data.status = 'expired';
              console.log('Updated local insurance status to expired (fallback)');
            }
          }
        }
        
        setInsurance(insuranceRes.data);
        setClaims(claimsRes.data || []);
      } catch (error) {
        // This is normal for sellers without insurance
        console.log('No existing insurance/claims found (normal for new sellers):', error);
        console.log('Setting insurance to null - Subscribe button should show');
        setInsurance(null);
        setClaims([]);
      }

      if (!preserveMessages) {
        setInsuranceSuccess('Dashboard data loaded successfully');
      }
    } catch (error: any) {
      console.error('Failed to fetch insurance data:', error);
      setInsuranceError('Failed to load dashboard data: ' + (error?.response?.data?.message || error.message));
    }
  };

  const calculatePremium = () => {
    if (selectedPolicyId && insuranceStartDate && insuranceEndDate) {
      const selectedPolicy = availablePolicies.find(p => p._id === selectedPolicyId);
      if (selectedPolicy) {
        // Use the later of: user-selected start date or current time (payment time)
        const userStartDate = new Date(insuranceStartDate);
        const currentTime = new Date();
        const actualStartDate = userStartDate > currentTime ? userStartDate : currentTime;
        const endDate = new Date(insuranceEndDate);
        const timeDiff = endDate.getTime() - actualStartDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff > 0) {
          // Use appropriate rate based on insurance type
          const dailyRate = selectedInsuranceType === 'premium' 
            ? (selectedPolicy.premiumDailyRate || selectedPolicy.dailyRate * 1.5) // fallback to 1.5x if not set
            : selectedPolicy.dailyRate;
            
          const premium = dailyRate * daysDiff;
          setCalculatedPremium(premium);
          return premium;
        }
      }
    }
    setCalculatedPremium(0);
    return 0;
  };

  // Calculate premium when dates, policy, or insurance type changes
  useEffect(() => {
    calculatePremium();
  }, [selectedPolicyId, insuranceStartDate, insuranceEndDate, availablePolicies, selectedInsuranceType]);

  const handleSubscribeInsurance = async () => {
    setInsuranceError('');
    setInsuranceSuccess('');
    
    if (!selectedPolicyId) {
      setInsuranceError('Please select an insurance policy');
      return;
    }

    if (!selectedAgentId) {
      setInsuranceError('Please select an insurance agent');
      return;
    }

    if (!insuranceStartDate || !insuranceEndDate) {
      setInsuranceError('Please select both start and end dates for your insurance coverage');
      return;
    }

    const userStartDate = new Date(insuranceStartDate);
    const endDate = new Date(insuranceEndDate);
    
    if (endDate <= userStartDate) {
      setInsuranceError('End date must be after start date');
      return;
    }

    if (userStartDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      setInsuranceError('Start date cannot be in the past');
      return;
    }

    // Use the later of user-selected start date or payment time as actual start date
    const paymentTime = new Date();
    const actualStartDate = userStartDate > paymentTime ? userStartDate : paymentTime;

    // Ensure end date is at least 1 day in the future
    const minEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (endDate < minEndDate) {
      setInsuranceError('End date must be at least 1 day in the future');
      return;
    }

    // Check if user has sufficient balance
    if (!userBalance || userBalance.balance <= 0) {
      setInsuranceError('Insufficient balance. Please add funds to your account first.');
      return;
    }

    const selectedPolicy = availablePolicies.find(p => p._id === selectedPolicyId);
    if (!selectedPolicy) {
      setInsuranceError('Selected policy not found');
      return;
    }

    const premium = calculatePremium();
    if (userBalance.balance < premium) {
      setInsuranceError(`Insufficient balance. You need ₹${premium} but only have ₹${userBalance.balance}`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      console.log('Subscribing to policy:', {
        policyId: selectedPolicyId,
        policyName: selectedPolicy.name,
        dailyRate: selectedPolicy.dailyRate,
        startDate: actualStartDate.toISOString(), // Actual start date
        endDate: endDate.toISOString(),
        calculatedPremium: premium,
        userBalance: userBalance.balance
      });
      
      const response = await axios.post('/insurance/subscribe-policy', {
        policyId: selectedPolicyId,
        startDate: actualStartDate.toISOString(), // Send actual start date
        endDate: insuranceEndDate,
        agentId: selectedAgentId,
        insuranceType: selectedInsuranceType // 'normal' or 'premium'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Subscription response:', response.data);
      
      const daysDiff = Math.ceil((endDate.getTime() - actualStartDate.getTime()) / (1000 * 3600 * 24));
      const startDateFormatted = actualStartDate.toLocaleDateString();
      const endDateFormatted = endDate.toLocaleDateString();
      setInsuranceSuccess(`Successfully subscribed to ${selectedPolicy.name}! Coverage period: ${startDateFormatted} to ${endDateFormatted} (${daysDiff} days). Total premium: ₹${premium}`);
      
      // Close dialog and reset form
      setInsuranceDialog(false);
      setSelectedPolicyId('');
      setInsuranceStartDate('');
      setInsuranceEndDate('');
      setCalculatedPremium(0);
      
      // Trigger BalanceWidget refresh for immediate update
      setBalanceRefreshTrigger(Date.now());
      
      // Refresh all data to show updated balance and insurance info
      await fetchInsuranceData();
    } catch (error: any) {
      console.error('Subscription error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to subscribe to insurance';
      setInsuranceError(`Subscription failed: ${errorMessage}`);
    }
  };

  const handleAddBalance = async () => {
    setInsuranceError('');
    setInsuranceSuccess('');
    setAddingBalance(true);
    
    const amount = Number(balanceAmount);
    if (!amount || amount <= 0) {
      setInsuranceError('Please enter a valid amount greater than 0');
      setAddingBalance(false);
      return;
    }

    if (amount > 10000) {
      setInsuranceError('Maximum amount per transaction is ₹10,000');
      setAddingBalance(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      console.log('Adding balance:', { amount });
      
      const response = await axios.post('/user/add-balance', {
        amount: amount,
        description: `Balance top-up by seller - ₹${amount}`
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Balance addition response:', response.data);
      
      // Update balance immediately from response - FORCE IMMEDIATE UPDATE
      const newBalance = response.data?.newBalance || 0;
      
      // Force immediate state update
      console.log('🔄 Updating balance from', userBalance?.balance, 'to', newBalance);
      
      setUserBalance({
        balance: newBalance,
        transactions: transactions || []
      });
      
      console.log('✅ Balance state updated to:', newBalance);
      
      setInsuranceSuccess(`✅ Successfully added ₹${amount.toFixed(2)} to your balance! New balance: ₹${newBalance.toFixed(2)}`);
      setBalanceDialog(false);
      setBalanceAmount('');
      setAddingBalance(false);
      
      // Force re-render by triggering a state change
      setTimeout(() => {
        setUserBalance((prev: any) => ({
          ...prev,
          balance: newBalance,
          lastUpdate: Date.now() // Force re-render
        }));
        // Trigger BalanceWidget refresh
        setBalanceRefreshTrigger(Date.now());
      }, 100);
      
      // Refresh data in background without interfering with UI updates
      setTimeout(async () => {
        await fetchInsuranceData(true); // Preserve success message
      }, 1000); // Longer delay to ensure UI updates complete
    } catch (error: any) {
      console.error('Balance addition error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to add balance';
      setInsuranceError(`Balance addition failed: ${errorMessage}`);
    } finally {
      setAddingBalance(false);
    }
  };


  const handleSubmitClaim = async () => {
    setInsuranceError('');
    setInsuranceSuccess('');
    
    if (!claimData.productName || !claimData.claimType || !claimData.description || 
        !claimData.quantityAffected || !claimData.pricePerUnit || !claimData.incidentDate || !claimData.orderId) {
      setInsuranceError('All required fields must be filled');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Generate unique complaint ID
      const complaintId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Format data according to backend expectations
      const claimPayload = {
        complaintId,
        orderId: claimData.orderId,
        productName: claimData.productName,
        quantity: parseInt(claimData.quantityAffected) || 0,
        price: parseFloat(claimData.pricePerUnit) || 0,
        buyerId: claimData.buyerId || '',
        buyerName: claimData.buyerName || '',
        buyerEmail: claimData.buyerEmail || '',
        orderDate: new Date().toISOString(),
        dispatchDate: claimData.dispatchDate ? new Date(claimData.dispatchDate).toISOString() : new Date().toISOString(),
        complaintDate: new Date().toISOString(),
        description: claimData.description,
        claimType: claimData.claimType,
        incidentDate: claimData.incidentDate,
        forwardToAgent: true // Flag to forward directly to insurance agent
      };
      
      // Submit claim using the correct endpoint
      await axios.post('/insurance/claim', claimPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Success message - claim forwarded to agent without showing "claimed" status
      setInsuranceSuccess('Claim has been forwarded to your insurance agent for review!');
      
      setClaimDialog(false);
      setClaimData({
        productId: '',
        productName: '',
        claimType: '',
        description: '',
        quantityAffected: '',
        pricePerUnit: '',
        incidentDate: '',
        orderId: '',
        complaintId: '',
        quantity: '',
        price: '',
        buyerId: '',
        buyerName: '',
        buyerEmail: '',
        orderDate: '',
        dispatchDate: '',
        complaintDate: ''
      });
      
      // Refresh insurance data to show updated status
      fetchInsuranceData();
    } catch (error: any) {
      console.error('Claim submission error:', error);
      console.error('Response data:', error?.response?.data);
      
      // Get the most helpful error message possible
      let errorMessage = 'Failed to submit claim';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Show the error message
      setInsuranceError(errorMessage);
      
      // Log more details for debugging
      console.error('Claim payload:', claimPayload);
      
      // Try to fetch insurance data to see what's actually in the system
      try {
        const response = await axios.get('/insurance/my-insurance?t=' + Date.now(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current insurance data:', response.data);
      } catch (fetchError) {
        console.error('Failed to fetch insurance data after error:', fetchError);
      }
    }
  };

  const handleCancelPolicy = async () => {
    setInsuranceError('');
    setInsuranceSuccess('');
    setCancellingPolicy(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setInsuranceError('Authentication token not found');
        return;
      }

      console.log('=== CANCEL POLICY REQUEST ===');
      console.log('Token exists:', !!token);
      console.log('Making request to: /insurance/cancel-policy');
      
      const response = await axios.post('/insurance/cancel-policy', {}, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Cancellation successful:', response.data);
      
      // Use the detailed message from backend if available, otherwise fall back to simple message
      const detailedMessage = response.data.message || 
        `Policy cancelled successfully! Refund of ₹${response.data.refundAmount || 0} has been processed back to your account.`;
      
      setInsuranceSuccess(detailedMessage);
      setCancelConfirmDialog(false);
      
      // Trigger BalanceWidget refresh for immediate update
      setBalanceRefreshTrigger(Date.now());
      
      // Add small delay to ensure transactions are saved before refreshing
      setTimeout(async () => {
        await fetchInsuranceData(true); // preserve success message
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Policy cancellation error:', error);
      
      let errorMessage = 'Failed to cancel policy';
      let debugInfo = '';
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Network error - please check if the server is running';
        debugInfo = 'Connection failed - backend server may not be running on localhost:3000';
      } else if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        
        // Extract detailed error information
        const responseData = error.response.data;
        errorMessage = responseData?.message || 
                      responseData?.error || 
                      `Server error (${error.response.status})`;
                      
        // Add debug information for specific error types
        if (responseData?.message?.includes('Transaction validation failed')) {
          debugInfo = ' | Transaction validation error - this has been fixed, try again after restarting the backend';
        } else if (responseData?.message?.includes('No active insurance policy')) {
          debugInfo = ' | No active policy found to cancel';
        } else if (error.response.status === 401) {
          debugInfo = ' | Authentication error - please log in again';
        } else if (error.response.status === 500) {
          debugInfo = ' | Internal server error - check backend logs';
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'No response from server - please check if server is running';
        debugInfo = 'Request was sent but no response received';
      } else {
        console.error('Request setup error:', error.message);
        errorMessage = error.message;
        debugInfo = 'Error occurred before sending request';
      }
      
      setInsuranceError(`Policy cancellation failed: ${errorMessage}${debugInfo}`);
    } finally {
      setCancellingPolicy(false);
    }
  };

  // Removing unused function
  const handleChangePassword = async () => {
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axios.post('/user/change-password', { oldPassword, newPassword });
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to change password');
    }
  };

  const handleImageUpload = async (file: File) => {
    // Check file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setProductError('Image size must be less than 5MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setProduct({ ...product, image: reader.result as string });
        setProductError(''); // Clear any previous errors
      };
      reader.onerror = () => {
        setProductError('Failed to read image file');
      };
      // Removed setSelectedImage since selectedImage state is unused
    } catch (error) {
      setProductError('Failed to process image');
      console.error('Image upload error:', error);
    }
  };

  const handlePostProduct = async () => {
    setProductError('');
    setProductSuccess('');
    if (!product.name || !product.description || !product.quantity || !product.price || !product.category) {
      setProductError('All fields are required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post('/product', {
        ...product,
        quantity: Number(product.quantity),
        price: Number(product.price)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductSuccess('Product posted successfully');
      setProduct({ name: '', description: '', quantity: '', price: '', category: '', image: '' });
      // Removed setSelectedImage(null) since selectedImage state is unused
      setProductDialog(false);
    } catch (err: any) {
      setProductError(err?.response?.data?.message || 'Failed to post product');
    }
  };

  const handleAddCategory = async () => {
    const categoryName = newCategory.trim();
    if (!categoryName) {
      setProductError('Category name cannot be empty');
      return;
    }

    if (categories.includes(categoryName)) {
      setProductError('Category already exists');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setProductError('Authentication required');
        return;
      }

      await axios.post('/product/categories', { category: categoryName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh categories from the server
      const response = await axios.get('/product/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data || []);
      
      // Set the new category as the selected category
      setProduct({ ...product, category: categoryName });
      setAddCategoryMode(false);
      setNewCategory('');
      setProductSuccess('Category added successfully');
      setProductError(''); // Clear any previous errors
    } catch (err: any) {
      setProductError(err?.response?.data?.message || 'Failed to add category');
      setProductSuccess(''); // Clear any previous success messages
    }
  } 

  // Fetch categories from backend when product dialog opens
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        if (productDialog && token) {
          const response = await axios.get('/product/categories', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCategories(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setProductError('Failed to load categories');
      }
    };
    fetchCategories();
  }, [productDialog]);

  // Add seller info state
  const [sellerInfo, setSellerInfo] = useState<any>(null);

  // Fetch seller info when component mounts
  React.useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const user = JSON.parse(atob(token.split('.')[1]));
          const response = await axios.get(`/user/${user.sub}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSellerInfo(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch seller info:', error);
      }
    };
    fetchSellerInfo();
  }, []);

  // We're using the calculateBalanceAfterTransaction function declared earlier
    // Global error handler for the entire component
  const [renderError, setRenderError] = useState<Error | null>(null);
  
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global error caught in DashboardSeller:", event.error);
      setRenderError(event.error);
      event.preventDefault(); // Prevent white screen
    };
    
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
  // If there's a render error, show fallback UI
  if (renderError) {
    return (
      <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 2, m: 2 }}>
        <Typography variant="h5" color="error.dark" gutterBottom>
          Dashboard Error
        </Typography>
        <Typography variant="body1" gutterBottom>
          {renderError.message || 'Unknown error'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Refresh Page
        </Button>
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={onLogout}
          sx={{ mt: 2, ml: 2 }}
        >
          Logout
        </Button>
      </Box>
    );
  }

  try {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="h5" gutterBottom>Seller Dashboard</Typography>
          {sellerInfo && (
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography variant="subtitle1">Seller ID: {sellerInfo?._id || 'Loading...'}</Typography>
              <Typography variant="subtitle1">Email: {sellerInfo?.email || 'Loading...'}</Typography>
              <Typography variant="subtitle1">Role: {sellerInfo?.role || 'seller'}</Typography>
            </Box>
          )}
        
        {/* Success/Error Messages - Top Level */}
        {insuranceSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {insuranceSuccess}
          </Alert>
        )}
        {insuranceError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {insuranceError}
          </Alert>
        )}
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          alignItems: 'center',
          '& > *': { flexShrink: 0 }
        }}>
          <Button variant="contained" color="primary" onClick={() => setProductDialog(true)}>
            Post Product
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.href = '/products'}
          >
            My Products
          </Button>
          <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
            Change Password
          </Button>
          <Button 
            key={`balance-btn-${userBalance?.balance || 0}`}
            variant="contained" 
            color="info" 
            startIcon={<Payment />}
            onClick={() => setBalanceDialog(true)}
          >
            Add Balance (₹{Number(userBalance?.balance || 0).toFixed(2)})
          </Button>
          {(!insurance || insurance.status !== 'active') && (
            <>
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<Security />}
                onClick={() => setInsuranceDialog(true)}
              >
                Subscribe to Insurance
              </Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<Security />}
                onClick={async () => {
                  try {
                    // Show a simple dialog to choose policy type
                    const policyType = prompt(
                      'Choose policy type:\n1. Normal (₹10,000 coverage)\n2. Premium (₹25,000 coverage)\n3. Product Damage (₹15,000 coverage)',
                      '1'
                    );
                    
                    if (!policyType) return; // User cancelled
                    
                    let policyData = {};
                    
                    switch (policyType) {
                      case '1':
                        policyData = { policyType: 'normal', coverageAmount: 10000 };
                        break;
                      case '2':
                        policyData = { policyType: 'premium', coverageAmount: 25000 };
                        break;
                      case '3':
                        policyData = { policyType: 'product_damage', coverageAmount: 15000 };
                        break;
                      default:
                        policyData = { policyType: 'normal', coverageAmount: 10000 };
                    }
                    
                    setInsuranceError('');
                    setInsuranceSuccess('');
                    const token = localStorage.getItem('token');
                    const response = await axios.post('/api/order/create-test-policy', policyData, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    console.log('Test policy created:', response.data);
                    setInsuranceSuccess(`${response.data.message}`);
                    
                    // Refresh insurance data
                    fetchInsuranceInfo();
                  } catch (error: any) {
                    console.error('Failed to create test policy:', error);
                    setInsuranceError(error.response?.data?.message || 'Failed to create test policy');
                  }
                }}
              >
                Create Test Policy
              </Button>
              <Button
                variant="outlined"
                color="info"
                startIcon={<Security />}
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get('/api/order/check-insurance-status', {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    console.log('🔍 Insurance Status Check:', response.data);
                    
                    const status = response.data;
                    let message = `Insurance Status:\n`;
                    message += `Total Policies: ${status.totalPolicies}\n`;
                    message += `Active Policies: ${status.activePolicies}\n`;
                    message += `Has Valid Insurance: ${status.hasValidInsurance ? 'YES' : 'NO'}\n\n`;
                    
                    if (status.policies.length > 0) {
                      message += 'Policy Details:\n';
                      status.policies.forEach((policy: any, index: number) => {
                        message += `${index + 1}. ${policy.policyType} - ${policy.status}\n`;
                        message += `   Coverage: ₹${policy.coverageAmount}\n`;
                        message += `   Currently Active: ${policy.isCurrentlyActive ? 'YES' : 'NO'}\n`;
                        message += `   Period: ${policy.startDate} to ${policy.endDate}\n\n`;
                      });
                    }
                    
                    alert(message);
                  } catch (error: any) {
                    console.error('Failed to check insurance status:', error);
                    alert('Failed to check insurance status - check console');
                  }
                }}
              >
                Check Insurance Status
              </Button>
              <Button 
                variant="outlined" 
                color="info" 
                size="small"
                onClick={debugAgentsEndpoint}
              >
                Debug Agents
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                size="small"
                onClick={debugLogisticsEndpoint}
              >
                Debug Logistics
              </Button>
              <Button 
                variant="outlined" 
                color="warning" 
                size="small"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get('/insurance/debug-users', {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log('🔍 All users debug:', response.data);
                    console.log('📋 User roles breakdown:', response.data.users.reduce((acc: any, user: any) => {
                      acc[user.role] = (acc[user.role] || 0) + 1;
                      return acc;
                    }, {}));
                    console.log('🏢 Insurance agents found:', response.data.insuranceAgents);
                    alert(`Found ${response.data.users.length} users total, ${response.data.insuranceAgents.length} insurance agents`);
                  } catch (error) {
                    console.error('Debug users failed:', error);
                    alert('Debug users failed - check console');
                  }
                }}
              >
                Debug Users
              </Button>
            </>
          )}
          {insurance && insurance.status === 'active' && (
            <>
              {/* <Button 
                variant="contained" 
                color="warning" 
                startIcon={<Payment />}
                onClick={handlePayPremium}
              >
                Pay Premium
              </Button> */}
              {/* <Button 
                variant="contained" 
                color="error" 
                startIcon={<Assignment />}
                onClick={() => setClaimDialog(true)}
              >
                File Claim
              </Button> */}
              <Button 
                variant="outlined" 
                color="warning"
                onClick={() => setCancelConfirmDialog(true)}
              >
                Cancel Policy
              </Button>
            </>
          )}
          <Button variant="outlined" color="secondary" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* Insurance Status Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Insurance Status</Typography>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<Refresh />}
            onClick={async () => {
              try {
                console.log('🔄 Force updating expired policies before refresh...');
                const token = localStorage.getItem('token');
                if (token) {
                  await axios.post('/insurance/force-update-expired', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  console.log('✅ Force update completed, now refreshing data...');
                }
                await fetchInsuranceData(true);
              } catch (error) {
                console.error('❌ Error during refresh:', error);
                // Still try to refresh even if force update fails
                await fetchInsuranceData(true);
              }
            }}
            disabled={isLoading}
          >
            Refresh Status
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Insurance Coverage
                </Typography>
                {insurance ? (
                  <Box>
                    <Typography variant="body2">
                      Status: <Chip 
                        label={insurance.status.toUpperCase()} 
                        color={
                          insurance.status === 'active' ? 'success' :
                          insurance.status === 'cancelled' ? 'warning' :
                          insurance.status === 'expired' ? 'error' : 'default'
                        } 
                        size="small" 
                      />
                    </Typography>
                    <Typography variant="body2">
                      Insurance Type: <Chip 
                        label={(insurance.insuranceType || 'normal').toUpperCase()} 
                        color={insurance.insuranceType === 'premium' ? 'warning' : 'info'} 
                        size="small" 
                      />
                    </Typography>
                    <Typography variant="body2">Premium Paid: ₹{insurance.premium}</Typography>
                    <Typography variant="body2">
                      <strong>Active Coverage Amount:</strong> ₹{insurance.coverage?.toLocaleString() || 0}
                      {insurance.insuranceType === 'premium' && (
                        <span style={{ color: '#ff9800', marginLeft: '8px' }}>(Premium Coverage Active)</span>
                      )}
                      {insurance.insuranceType === 'normal' && (
                        <span style={{ color: '#2196f3', marginLeft: '8px' }}>(Normal Coverage Active)</span>
                      )}
                    </Typography>
                    {insurance.policyDetails && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Policy Details:</Typography>
                        {insurance.policyDetails.name && (
                          <Typography variant="body2">Policy Name: {insurance.policyDetails.name}</Typography>
                        )}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                          <Box sx={{ 
                            opacity: insurance.insuranceType === 'normal' ? 1 : 0.6,
                            border: insurance.insuranceType === 'normal' ? '2px solid #2196f3' : '1px solid #ddd',
                            borderRadius: 1,
                            p: 1
                          }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 'bold', 
                              color: insurance.insuranceType === 'normal' ? 'info.main' : 'text.secondary' 
                            }}>
                              Normal Rates {insurance.insuranceType === 'normal' && '(ACTIVE)'}
                            </Typography>
                            {insurance.policyDetails.dailyRate && (
                              <Typography variant="body2">Daily: ₹{insurance.policyDetails.dailyRate}</Typography>
                            )}
                            {insurance.policyDetails.monthlyPremium && (
                              <Typography variant="body2">Monthly: ₹{insurance.policyDetails.monthlyPremium}</Typography>
                            )}
                            {insurance.policyDetails.coverage && (
                              <Typography variant="body2">Coverage: ₹{insurance.policyDetails.coverage?.toLocaleString()}</Typography>
                            )}
                          </Box>
                          <Box sx={{ 
                            opacity: insurance.insuranceType === 'premium' ? 1 : 0.6,
                            border: insurance.insuranceType === 'premium' ? '2px solid #ff9800' : '1px solid #ddd',
                            borderRadius: 1,
                            p: 1
                          }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 'bold', 
                              color: insurance.insuranceType === 'premium' ? 'warning.main' : 'text.secondary' 
                            }}>
                              Premium Rates {insurance.insuranceType === 'premium' && '(ACTIVE)'}
                            </Typography>
                            {insurance.policyDetails.premiumDailyRate && (
                              <Typography variant="body2">Daily: ₹{insurance.policyDetails.premiumDailyRate}</Typography>
                            )}
                            {insurance.policyDetails.premiumMonthlyPremium && (
                              <Typography variant="body2">Monthly: ₹{insurance.policyDetails.premiumMonthlyPremium}</Typography>
                            )}
                            {insurance.policyDetails.premiumCoverage && (
                              <Typography variant="body2">Coverage: ₹{insurance.policyDetails.premiumCoverage?.toLocaleString()}</Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                    {insurance.startDate && insurance.endDate && (
                      <Typography variant="body2">
                        Policy Period: {new Date(insurance.startDate).toLocaleDateString('en-GB')} - {new Date(insurance.endDate).toLocaleDateString('en-GB')}
                      </Typography>
                    )}
                    <Typography variant="body2">Duration: {insurance.duration} days</Typography>
                    {insurance.status === 'active' && insurance.endDate && (
                      <Typography variant="body2">
                        Valid Until: {new Date(insurance.endDate).toLocaleDateString('en-GB')}
                      </Typography>
                    )}
                    {insurance.status === 'cancelled' && insurance.cancellationDate && (
                      <Typography variant="body2" color="warning.main">
                        Cancelled on: {new Date(insurance.cancellationDate).toLocaleDateString('en-GB')}
                        {insurance.refundAmount && ` (Refunded: ₹${insurance.refundAmount})`}
                      </Typography>
                    )}
                    {insurance.status === 'expired' && insurance.endDate && (
                      <Typography variant="body2" color="error.main">
                        Expired on: {new Date(insurance.endDate).toLocaleDateString('en-GB')} (No refund available)
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary">No active insurance policy</Typography>
                    <Typography variant="caption">Subscribe to protect your products from losses</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Claims Summary
                </Typography>
                <Typography variant="body2">Total Claims: {claims.length}</Typography>
                <Typography variant="body2">Pending: {claims.filter(c => c.status === 'pending').length}</Typography>
                <Typography variant="body2">Approved: {claims.filter(c => c.status === 'approved').length}</Typography>
                <Typography variant="body2">Paid: {claims.filter(c => c.status === 'paid').length}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Claims Table */}
      {/*claims.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>My Insurance Claims</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Claim ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.claimId}>
                    <TableCell>{claim.claimId}</TableCell>
                    <TableCell>{claim.productName}</TableCell>
                    <TableCell>{(claim.claimType || 'unknown').replace('_', ' ').toUpperCase()}</TableCell>
                    <TableCell>₹{claim.totalClaimAmount}</TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          claim.status === 'forwarded_to_agent' 
                            ? 'WITH INSURANCE AGENT' 
                            : (claim.status || 'unknown').toUpperCase().replace('_', ' ')
                        } 
                        color={getClaimStatusColor(claim.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(claim.submissionDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )*/}
      

      {/* Balance Widget */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Account Balance</Typography>
        {isLoading ? (
          <Card>
            <CardContent>
              <Typography variant="h4" color="text.secondary">Loading...</Typography>
            </CardContent>
          </Card>
        ) : (
          <ErrorBoundary fallback={
            <Card>
              <CardContent>
                <Typography variant="h4" color="primary">
                  ₹{userBalance?.balance?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Balance
                </Typography>
                <Typography color="error" sx={{ mt: 2 }}>
                  Unable to load complete balance widget. Basic balance shown above.
                </Typography>
              </CardContent>
            </Card>
          }>
            <BalanceWidget 
              externalBalance={userBalance?.balance} 
              refreshTrigger={balanceRefreshTrigger} 
            />
          </ErrorBoundary>
        )}
      </Box>
      
      {/* Transaction History Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Transaction History</Typography>
        <Card>
          <CardContent>
            {transactions && Array.isArray(transactions) && transactions.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction: any, index: number) => {
                      // Safely handle potential issues with transaction data
                      try {
                        // Debug transaction type classification for problematic entries
                        if (transaction?.type === 'product_purchase' && transaction?.amount > 0) {
                          console.log('Product purchase transaction detected:', {
                            id: transaction?.transactionId,
                            type: transaction?.type,
                            amount: transaction?.amount,
                            isDebit: isDebitTransaction(transaction)
                          });
                        }
                        return (
                          <TableRow key={transaction?.transactionId || index}>
                            <TableCell>
                              {new Date(transaction?.createdAt || transaction?.date || Date.now()).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={getTransactionTypeLabel(transaction?.type || transaction?.transactionType || 'transaction')} 
                                size="small"
                                color={
                                  (transaction?.amount > 0 && !isDebitTransaction(transaction)) ? 'success' : 
                                  (transaction?.amount < 0 || isDebitTransaction(transaction)) ? 'error' : 'default'
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{transaction?.description || 'Transaction'}</TableCell>
                            <TableCell align="right">
                              <Typography 
                                color={
                                  (transaction?.amount > 0 && !isDebitTransaction(transaction)) ? 'success.main' : 'error.main'
                                }
                                fontWeight="bold"
                              >
                                {/* Check if it's a debit transaction type even if amount is positive */}
                                {(transaction?.amount > 0 && !isDebitTransaction(transaction)) ? '+' : ''}
                                {formatCurrency(Math.abs(transaction?.amount || 0))}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography color="primary.main" fontWeight="bold">
                                {formatCurrency(calculateBalanceAfterTransaction(transactions, index, userBalance?.balance || 0))}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={transaction?.status || 'completed'} 
                                size="small"
                                color={transaction?.status === 'completed' ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      } catch (error) {
                        console.error('Error rendering transaction row:', error);
                        return null; // Skip rendering this row if there's an error
                      }
                    }).filter(Boolean)}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No transactions yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your balance additions, insurance payments, and refunds will appear here
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
      {/* Pending Orders Summary */}
      {pendingOrdersCount > 0 && (
        <Box sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assignment sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  {pendingOrdersCount} Order{pendingOrdersCount !== 1 ? 's' : ''} Pending Dispatch
                </Typography>
                <Typography variant="body2">
                  You have {pendingOrdersCount} order{pendingOrdersCount !== 1 ? 's' : ''} waiting to be dispatched to logistics providers.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading dashboard data...</Typography>
        </Box>
      ) : apiError ? (
        <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 1, mb: 3 }}>
          <Typography color="error">{apiError}</Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }} 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      ) : (
        <>
          {/* Order History Table - Safely rendered */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom></Typography>
            <ErrorBoundary fallback={
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography color="error">
                  Unable to load x. Please refresh the page.
                </Typography>
              </Box>
            }>
              <OrderHistoryTable onOrderDispatch={fetchPendingOrdersCount} />
            </ErrorBoundary>
          </Box>
          
          {/* Complaints Table - Safely rendered */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Complaints</Typography>
            <ErrorBoundary fallback={
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography color="error">
                  Unable to load complaints. Please refresh the page.
                </Typography>
              </Box>
            }>
              <ComplaintsTable />
            </ErrorBoundary>
          </Box>
        </>
      )}
      
      {/* Simple ErrorBoundary Function Component */}
      <Box sx={{ display: 'none' }}>
        {/* This is just to keep the component definition in the file without rendering it */}
      </Box>
      
      {/* Post Product Dialog */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)}>
        <DialogTitle>Post Product</DialogTitle>
        <DialogContent>
          <TextField
            label="Product Name"
            fullWidth
            margin="normal"
            value={product.name}
            onChange={e => setProduct({ ...product, name: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            value={product.description}
            onChange={e => setProduct({ ...product, description: e.target.value })}
          />
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            margin="normal"
            value={product.quantity}
            onChange={e => setProduct({ ...product, quantity: e.target.value })}
          />
          <TextField
            label="Price"
            type="number"
            fullWidth
            margin="normal"
            value={product.price}
            onChange={e => setProduct({ ...product, price: e.target.value })}
          />
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Product Image (Max size: 5MB)
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="product-image"
              type="file"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
            />
            <label htmlFor="product-image">
              <Button 
                variant="outlined" 
                component="span" 
                fullWidth
                sx={{ mb: 1 }}
              >
                {product.image ? 'Change Image' : 'Upload Product Image'}
              </Button>
            </label>
            <Typography variant="caption" color="textSecondary">
              Supported formats: JPG, PNG, GIF
            </Typography>
            {product.image && (
              <Box sx={{ mt: 2 }}>
                <img 
                  src={product.image} 
                  alt="Product preview" 
                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                />
              </Box>
            )}
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Select Category</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {categories.length > 0 ? (
                categories.map(cat => (
                  <Button
                    key={cat}
                    variant={product.category === cat ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setProduct({ ...product, category: cat })}
                    sx={{ mb: 1 }}
                  >
                    {cat}
                  </Button>
                ))
              ) : (
                <Typography color="textSecondary">No categories available. Add a new category below.</Typography>
              )}
            </Box>
            <Box sx={{ mt: 2 }}>
              {addCategoryMode ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    label="New Category"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    sx={{ flex: 1, mr: 1 }}
                    size="small"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        handleAddCategory();
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    onClick={handleAddCategory} 
                    variant="contained" 
                    color="primary" 
                    sx={{ mr: 1 }}
                    size="small"
                    disabled={!newCategory.trim()}
                  >
                    Add
                  </Button>
                  <Button 
                    onClick={() => { 
                      setAddCategoryMode(false); 
                      setNewCategory(''); 
                    }} 
                    variant="outlined"
                    size="small"
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Button
                  onClick={() => setAddCategoryMode(true)}
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<span>+</span>}
                >
                  Add New Category
                </Button>
              )}
            </Box>
            {product.category && (
              <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
                Selected category: {product.category}
              </Typography>
            )}
          </Box>
          {productError && <Typography color="error">{productError}</Typography>}
          {productSuccess && <Typography color="primary">{productSuccess}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>Cancel</Button>
          <Button onClick={handlePostProduct} variant="contained" color="primary">Post</Button>
        </DialogActions>
      </Dialog>
      {/* Change Password Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            label="Old Password"
            type="password"
            fullWidth
            margin="normal"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {error && <Typography color="error">{error}</Typography>}
          {success && <Typography color="primary">{success}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained" color="primary">Change</Button>
        </DialogActions>
      </Dialog>

      {/* Balance Top-up Dialog */}
      <Dialog open={balanceDialog} onClose={() => setBalanceDialog(false)}>
        <DialogTitle>Add Balance</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2">
              Current Balance: <strong>₹{Number(userBalance?.balance || 0).toFixed(2)}</strong>
            </Typography>
            <TextField
              label="Amount to Add ($)"
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBalanceDialog(false)} 
            disabled={addingBalance}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddBalance} 
            variant="contained" 
            color="primary"
            disabled={addingBalance}
          >
            {addingBalance ? 'Adding...' : 'Add Balance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Insurance Subscription Dialog */}
      <Dialog open={insuranceDialog} onClose={() => setInsuranceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Subscribe to Insurance Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2">
              Current Balance: <strong>₹{Number(userBalance?.balance || 0).toFixed(2)}</strong>
            </Typography>

            {/* Step 1: Select Insurance Agent */}
            <TextField
              select
              label="Step 1: Select Insurance Agent"
              value={selectedAgentId}
              onChange={(e) => {
                const agentId = e.target.value;
                setSelectedAgentId(agentId);
                fetchAgentPolicies(agentId);
              }}
              fullWidth
              required
              helperText="First, choose which insurance agent will handle your policy"
            >
              {insuranceAgents.length > 0 ? (
                insuranceAgents.map((agent) => (
                  <MenuItem key={agent._id} value={agent._id}>
                    {agent.name} ({agent.email}) - Balance: ₹{agent.balance || 0}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  No insurance agents available - Contact administrator
                </MenuItem>
              )}
            </TextField>

            {/* Step 2: Select Policy (only show after agent is selected) */}
            {selectedAgentId && (
              <TextField
                select
                label="Step 2: Select Insurance Policy"
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                fullWidth
                required
                disabled={loadingAgentPolicies}
                helperText={loadingAgentPolicies ? "Loading policies..." : "Select a policy from this agent"}
              >
                {loadingAgentPolicies ? (
                  <MenuItem value="" disabled>
                    Loading policies for selected agent...
                  </MenuItem>
                ) : agentPolicies.length > 0 ? (
                  agentPolicies.map((policy) => (
                    <MenuItem key={policy._id} value={policy._id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{policy.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Normal: ${policy.dailyRate || 0}/day (${(policy.coverage || 0).toLocaleString()} coverage) | 
                          Premium: ${policy.premiumDailyRate || 0}/day (${(policy.premiumCoverage || 0).toLocaleString()} coverage)
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    No policies available for this agent
                  </MenuItem>
                )}
              </TextField>
            )}

            {/* Step 3: Select Insurance Type */}
            {selectedPolicyId && (
              <TextField
                select
                label="Step 3: Select Insurance Type"
                value={selectedInsuranceType}
                onChange={(e) => setSelectedInsuranceType(e.target.value)}
                fullWidth
                required
                helperText="Choose between normal or premium insurance coverage"
              >
                <MenuItem value="normal">
                  Normal Insurance - Standard Rate
                </MenuItem>
                <MenuItem value="premium">
                  Premium Insurance - Enhanced Coverage (Higher Rate)
                </MenuItem>
              </TextField>
            )}

            {/* Coverage Period Info */}
            <Box sx={{ p: 2, bgcolor: 'info.main', color: 'white', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2">
                📅 Select your coverage start and end dates. Coverage will begin at the time of payment or your selected start date, whichever is later.
              </Typography>
            </Box>

            {/* Start Date Selection */}
            <TextField
              label="Coverage Start Date"
              type="date"
              value={insuranceStartDate}
              onChange={(e) => setInsuranceStartDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              helperText="Select when you want your insurance coverage to start"
              inputProps={{
                min: new Date().toISOString().split('T')[0] // Today minimum
              }}
            />

            {/* End Date Selection */}
            <TextField
              label="Coverage End Date"
              type="date"
              value={insuranceEndDate}
              onChange={(e) => setInsuranceEndDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              helperText="Select when you want your insurance coverage to end"
              inputProps={{
                min: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow minimum
              }}
            />

            {/* Policy Details and Premium Calculation */}
            {selectedPolicyId && selectedAgentId && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                {(() => {
                  const selectedPolicy = agentPolicies.find(p => p._id === selectedPolicyId);
                  if (selectedPolicy) {
                    let daysDiff = 0;
                    if (insuranceStartDate && insuranceEndDate) {
                      const userStartDate = new Date(insuranceStartDate);
                      const currentTime = new Date();
                      const actualStartDate = userStartDate > currentTime ? userStartDate : currentTime;
                      const endDate = new Date(insuranceEndDate);
                      daysDiff = Math.ceil((endDate.getTime() - actualStartDate.getTime()) / (1000 * 3600 * 24));
                    }
                    
                    const currentDailyRate = selectedInsuranceType === 'premium' 
                      ? (selectedPolicy.premiumDailyRate || selectedPolicy.dailyRate * 1.5)
                      : selectedPolicy.dailyRate;
                    
                    return (
                      <>
                        <Typography variant="h6" color="primary">{selectedPolicy.name}</Typography>
                        <Typography variant="body2">
                          <strong>Insurance Type:</strong> {selectedInsuranceType === 'premium' ? 'Premium Coverage' : 'Normal Coverage'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Your Selected Daily Rate ({selectedInsuranceType}):</strong> ${currentDailyRate || 0}
                          {selectedInsuranceType === 'premium' && (
                            <span style={{ color: '#ff9800', marginLeft: '8px' }}>(Enhanced Rate)</span>
                          )}
                        </Typography>
                        <Box sx={{ mt: 1, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                            Rate Comparison:
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Box sx={{ flex: 1, pr: 1 }}>
                              <Typography variant="caption" color="info.main">
                                Normal: ${selectedPolicy.dailyRate || 0}/day
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Coverage: ${(selectedPolicy.coverage || 0).toLocaleString()}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1, pl: 1 }}>
                              <Typography variant="caption" color="warning.main">
                                Premium: ${selectedPolicy.premiumDailyRate || 0}/day
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Coverage: ${(selectedPolicy.premiumCoverage || 0).toLocaleString()}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Typography variant="body2">
                          <strong>Coverage Amount:</strong> ${selectedInsuranceType === 'premium' 
                            ? (selectedPolicy.premiumCoverage || 0).toLocaleString() 
                            : (selectedPolicy.coverage || 0).toLocaleString()}
                          {selectedInsuranceType === 'premium' && (
                            <span style={{ color: '#ff9800', marginLeft: '8px' }}>(Enhanced Coverage)</span>
                          )}
                        </Typography>
                        <Typography variant="body2"><strong>Max Duration:</strong> {selectedPolicy.maxDurationMonths || 12} months</Typography>
                        <Typography variant="body2"><strong>Min Duration:</strong> {selectedPolicy.minDurationDays || 1} days</Typography>
                        {daysDiff > 0 && (
                          <>
                            <Typography variant="body2" color="info.main"><strong>Coverage Period:</strong> {daysDiff} days</Typography>
                            <Typography variant="h6" color="success.main">
                              <strong>Total Premium ({selectedInsuranceType}): ${calculatedPremium}</strong>
                            </Typography>
                          </>
                        )}
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Description:</strong> {selectedPolicy.description}</Typography>
                      </>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsuranceDialog(false)}>Cancel</Button>
          <Button onClick={handleSubscribeInsurance} variant="contained" color="primary">
            Subscribe
          </Button>
        </DialogActions>
      </Dialog>

      {/* Claim Submission Dialog */}
      <Dialog open={claimDialog} onClose={() => setClaimDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submit Insurance Claim</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Product"
              value={claimData.productId}
              onChange={(e) => setClaimData({...claimData, productId: e.target.value})}
              fullWidth
            >
              {userProducts.map((product) => (
                <MenuItem key={product._id} value={product._id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Claim Type"
              value={claimData.claimType}
              onChange={(e) => setClaimData({...claimData, claimType: e.target.value})}
              fullWidth
            >
              <MenuItem value="damage">Product Damage</MenuItem>
              <MenuItem value="spoilage">Spoilage</MenuItem>
              <MenuItem value="theft">Theft</MenuItem>
              <MenuItem value="logistics_delay">Logistics Delay</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              label="Order ID"
              value={claimData.orderId}
              onChange={(e) => setClaimData({...claimData, orderId: e.target.value})}
              fullWidth
              placeholder="Enter order ID related to this claim"
            />
            <TextField
              label="Product Name"
              value={claimData.productName}
              onChange={(e) => setClaimData({...claimData, productName: e.target.value})}
              fullWidth
              placeholder="Enter product name"
            />
            <TextField
              label="Quantity Affected"
              type="number"
              value={claimData.quantityAffected}
              onChange={(e) => setClaimData({...claimData, quantityAffected: e.target.value})}
              fullWidth
            />
            <TextField
              label="Price per Unit"
              type="number"
              inputProps={{ step: 0.01 }}
              value={claimData.pricePerUnit}
              onChange={(e) => setClaimData({...claimData, pricePerUnit: e.target.value})}
              fullWidth
            />
            <TextField
              label="Buyer Name"
              value={claimData.buyerName}
              onChange={(e) => setClaimData({...claimData, buyerName: e.target.value})}
              fullWidth
              placeholder="Enter buyer name (if applicable)"
            />
            <TextField
              label="Buyer Email"
              type="email"
              value={claimData.buyerEmail}
              onChange={(e) => setClaimData({...claimData, buyerEmail: e.target.value})}
              fullWidth
              placeholder="Enter buyer email (if applicable)"
            />
            <TextField
              label="Dispatch Date"
              type="date"
              value={claimData.dispatchDate}
              onChange={(e) => setClaimData({...claimData, dispatchDate: e.target.value})}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Incident Date"
              type="date"
              value={claimData.incidentDate}
              onChange={(e) => setClaimData({...claimData, incidentDate: e.target.value})}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              multiline
              rows={4}
              value={claimData.description}
              onChange={(e) => setClaimData({...claimData, description: e.target.value})}
              fullWidth
              placeholder="Please describe the issue in detail..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitClaim} variant="contained" color="primary">
            Submit Claim
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Policy Confirmation Dialog */}
      <Dialog open={cancelConfirmDialog} onClose={() => setCancelConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Insurance Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body1" color="warning.main" sx={{ fontWeight: 'bold' }}>
              ⚠️ Are you sure you want to cancel your insurance policy?
            </Typography>
            {insurance && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="h6">Policy ID: {insurance.policyId}</Typography>
                <Typography variant="body2"><strong>Premium Paid:</strong> ${insurance.premium}</Typography>
                <Typography variant="body2"><strong>Coverage Amount:</strong> ${insurance.coverage}</Typography>
                {insurance.startDate && insurance.endDate && (
                  <Typography variant="body2">
                    <strong>Policy Period:</strong> {new Date(insurance.startDate).toLocaleDateString('en-GB')} - {new Date(insurance.endDate).toLocaleDateString('en-GB')}
                  </Typography>
                )}
                <Typography variant="body2"><strong>Duration:</strong> {insurance.duration} days</Typography>
                <Typography variant="body2"><strong>Status:</strong> {insurance.status}</Typography>
              </Box>
            )}
            {(() => {
              const refundDetails = calculateRefundDetails();
              if (refundDetails) {
                return (
                  <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="h6" color="info.dark" sx={{ mb: 1 }}>
                      💰 Refund Calculation
                    </Typography>
                    <Typography variant="body2"><strong>Premium Paid:</strong> ₹{refundDetails.premiumPaid}</Typography>
                    <Typography variant="body2"><strong>Total Policy Days:</strong> {refundDetails.totalDays} days</Typography>
                    <Typography variant="body2"><strong>Used Days:</strong> {refundDetails.usedDays} days</Typography>
                    <Typography variant="body2"><strong>Remaining Days:</strong> {refundDetails.remainingDays} days</Typography>
                    <Typography variant="body2"><strong>Daily Rate Used:</strong> ₹{refundDetails.dailyRate.toFixed(2)}</Typography>
                    <Typography variant="body1" sx={{ mt: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                      <strong>Refund Amount: ₹{refundDetails.refundAmount}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                      You will only be charged for the days you used the insurance policy.
                    </Typography>
                  </Box>
                );
              }
              return (
                <Typography variant="body2" color="text.secondary">
                  <strong>Refund Policy:</strong> Refund amount will be calculated based on remaining policy days.
                </Typography>
              );
            })()}
            <Typography variant="body2" color="warning.main">
              <strong>Important:</strong> You cannot cancel if you have any pending or approved claims.
            </Typography>
            <Typography variant="body2" color="error.main">
              <strong>Note:</strong> After cancellation, you will lose all insurance coverage immediately. 
              You can subscribe to a new policy at any time.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelConfirmDialog(false)}
            disabled={cancellingPolicy}
          >
            Keep Policy
          </Button>
          <Button 
            onClick={handleCancelPolicy} 
            variant="contained" 
            color="warning"
            disabled={cancellingPolicy}
          >
            {cancellingPolicy ? 'Cancelling...' : 'Yes, Cancel Policy'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
  } catch (error) {
    console.error("Fatal render error:", error);
    return (
      <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 2, m: 2 }}>
        <Typography variant="h5" color="error.dark" gutterBottom>
          Dashboard Render Error
        </Typography>
        <Typography variant="body1" gutterBottom>
          {error instanceof Error ? error.message : 'Unknown error during rendering'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Refresh Page
        </Button>
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={onLogout}
          sx={{ mt: 2, ml: 2 }}
        >
          Logout
        </Button>
      </Box>
    );
  }
};

export default DashboardSeller;
