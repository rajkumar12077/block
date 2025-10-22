import React, { useState, useEffect } from 'react';
import { 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Typography, Box, Card, CardContent, Alert, Chip, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper, MenuItem
} from '@mui/material';
import { 
  Security, AccountBalance, Payment
} from '@mui/icons-material';
import axios from '../api';
import InsuranceClaimsTable from '../components/InsuranceClaimsTable';

const DashboardInsurance: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Insurance dashboard specific state
  const [dashboardData, setDashboardData] = useState<any>({
    policies: [],
    claims: [],
    insurances: [],
    stats: {}
  });
  const [userBalance, setUserBalance] = useState<any>({ balance: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filedComplaints, setFiledComplaints] = useState<any[]>([]); // NEW: Filed complaints from subscribers
  const [complaintSearchQuery, setComplaintSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardSuccess, setDashboardSuccess] = useState('');
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Policy creation state
  const [policyDialog, setPolicyDialog] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    policyId: '',
    name: '',
    dailyRate: 0,
    premiumDailyRate: 0,
    coverage: 0,
    premiumCoverage: 0,
    maxDurationMonths: '12',
    minDurationDays: '1',
    type: 'general',
    description: '',
    coverageItems: [],
    terms: ''
  });
  
  // Fund management state
  const [fundDialog, setFundDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  // Claims processing state
  const [claimProcessDialog, setClaimProcessDialog] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [claimStatus, setClaimStatus] = useState('');
  const [claimComments, setClaimComments] = useState('');

  useEffect(() => {
    fetchDashboardData();
    
    // Set up periodic refresh for balance and transactions
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);
  
  // Get user ID from token or backend when component mounts
  useEffect(() => {
    async function getUserProfile() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const profileResponse = await axios.get('/user/profile', { 
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (profileResponse.data && profileResponse.data._id) {
          setUserId(profileResponse.data._id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
    
    getUserProfile();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setDashboardError('');
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Fetching insurance dashboard data...');
      console.log('Token exists:', !!token);

      // First test if backend is accessible
      try {
        const healthRes = await axios.get('/health');
        console.log('✅ Backend health check:', healthRes.data);
      } catch (healthError) {
        console.error('❌ Backend not accessible:', healthError);
        setDashboardError('Backend server is not accessible. Please check if it\'s running on localhost:3000');
        return;
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const requests = [
        axios.get('/insurance/dashboard-data', { headers }),
        axios.get('/user/balance', { headers })
      ];

      // Try to fetch transactions (might not exist yet)
      try {
        requests.push(
          axios.get('/accounts/transactions', { 
            headers: { Authorization: `Bearer ${token}` } 
          })
        );
      } catch (error) {
        console.log('Transactions endpoint not available');
      }

      // Try each request individually for better error handling
      let dashboardRes: any = null;
      let balanceRes: any = null;

      try {
        console.log('📊 Fetching dashboard data...');
        dashboardRes = await axios.get('/insurance/dashboard-data', { headers });
        console.log('✅ Dashboard response:', dashboardRes.data);
      } catch (dashError: any) {
        console.error('❌ Dashboard error:', dashError?.message || dashError);
        setDashboardError(`Failed to load dashboard data: ${dashError?.response?.status || 'Network Error'} - ${dashError?.message || 'Unknown error'}`);
      }

      try {
        console.log('💰 Fetching balance data...');
        balanceRes = await axios.get('/user/balance', { headers });
        console.log('✅ Balance response:', balanceRes.data);
      } catch (balanceError: any) {
        console.error('❌ Balance error:', balanceError?.message || balanceError);
        const balanceErrorMsg = `Failed to load balance: ${balanceError?.response?.status || 'Network Error'} - ${balanceError?.message || 'Unknown error'}`;
        setDashboardError(prev => prev ? prev + '\n' + balanceErrorMsg : balanceErrorMsg);
      }

      setDashboardData(dashboardRes?.data || {
        policies: [],
        claims: [],
        insurances: [],
        stats: {}
      });
      setUserBalance(balanceRes?.data || { balance: 0 });
      
      // Fetch transactions
      try {
        console.log('📜 Fetching transactions...');
        const transactionsRes = await axios.get('/accounts/transactions', { headers });
        console.log('✅ Transactions response:', transactionsRes.data);
        setTransactions(transactionsRes.data || []);
      } catch (transError: any) {
        console.error('❌ Transactions error:', transError?.message || transError);
        setTransactions([]);
        const transErrorMsg = `Failed to load transactions: ${transError?.response?.status || 'Network Error'} - ${transError?.message || 'Unknown error'}`;
        setDashboardError(prev => prev ? prev + '\n' + transErrorMsg : transErrorMsg);
      }
      
      // NEW: Fetch filed complaints from subscribers
      try {
        console.log('📝 Fetching filed complaints from subscribers...');
        const complaintsRes = await axios.get('/order/complaints/insurance-agent', { headers });
        console.log('✅ Filed complaints response:', complaintsRes.data);
        setFiledComplaints(complaintsRes.data || []);
      } catch (complError: any) {
        console.error('❌ Filed complaints error:', complError?.message || complError);
        setFiledComplaints([]);
        // Don't show error for this, it's optional
      }
      
      setDashboardSuccess('Dashboard data loaded successfully');
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardError('Failed to load dashboard data: ' + (error?.response?.data?.message || error.message));
      
      // Set default data on error
      setDashboardData({
        policies: [],
        claims: [],
        insurances: [],
        stats: {}
      });
      setUserBalance({ balance: 0 });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFund = async () => {
    setDashboardError('');
    setDashboardSuccess('');
    
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) {
      setDashboardError('Please enter a valid amount');
      return;
    }

    if (amount > 10000) {
      setDashboardError('Amount cannot exceed ₹10,000 per transaction');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/accounts/my-insurance-fund', 
        { amount }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDashboardSuccess(`Successfully added ₹${amount} to your insurance fund!`);
      setFundAmount('');
      setFundDialog(false);
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error: any) {
      setDashboardError(error?.response?.data?.message || 'Failed to add fund');
    }
  };

  const handleCreatePolicy = async () => {
    setDashboardError('');
    setDashboardSuccess('');
    
    if (!newPolicy.name?.trim() || !newPolicy.dailyRate || !newPolicy.premiumDailyRate || !newPolicy.coverage || !newPolicy.premiumCoverage || !newPolicy.description?.trim() || !newPolicy.policyId?.trim()) {
      setDashboardError('All fields are required (name, daily rates, coverage amounts, description, policy ID)');
      return;
    }

    if (Number(newPolicy.dailyRate) <= 0) {
      setDashboardError('Normal daily rate must be greater than 0');
      return;
    }

    if (Number(newPolicy.premiumDailyRate) <= 0) {
      setDashboardError('Premium daily rate must be greater than 0');
      return;
    }

    if (Number(newPolicy.premiumDailyRate) <= Number(newPolicy.dailyRate)) {
      setDashboardError('Premium daily rate must be higher than normal daily rate');
      return;
    }

    if (Number(newPolicy.maxDurationMonths) < 1 || Number(newPolicy.maxDurationMonths) > 24) {
      setDashboardError('Maximum duration must be between 1 and 24 months');
      return;
    }

    if (Number(newPolicy.minDurationDays) < 1) {
      setDashboardError('Minimum duration must be at least 1 day');
      return;
    }

    try {
      // Double check all premium-related values are positive numbers
      const dailyRate = Number(newPolicy.dailyRate) || 0;
      const premiumDailyRate = Number(newPolicy.premiumDailyRate) || 0;
      const coverage = Number(newPolicy.coverage) || 0;
      const premiumCoverage = Number(newPolicy.premiumCoverage) || 0;
      
      if (dailyRate <= 0 || premiumDailyRate <= 0 || coverage <= 0 || premiumCoverage <= 0) {
        setDashboardError('All rate and coverage amounts must be positive numbers');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      console.log('Creating policy with premium fields:', {
        premiumDailyRate,
        premiumCoverage,
        premiumMonthlyPremium: premiumDailyRate * 30
      });
      
      await axios.post('/insurance/create-policy', {
        policyId: newPolicy.policyId,
        name: newPolicy.name,
        description: newPolicy.description,
        type: newPolicy.type,
        terms: newPolicy.terms || '',
        dailyRate: dailyRate,
        premiumDailyRate: premiumDailyRate,
        monthlyPremium: dailyRate * 30, // Calculate from daily rate
        premiumMonthlyPremium: premiumDailyRate * 30, // Calculate from premium daily rate
        durationMonths: 12, // Default duration
        coverage: coverage,
        premiumCoverage: premiumCoverage,
        maxDurationMonths: Number(newPolicy.maxDurationMonths),
        minDurationDays: Number(newPolicy.minDurationDays),
        coverageItems: newPolicy.coverageItems || [],
        status: 'active'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDashboardSuccess('Policy created successfully!');
      setNewPolicy({
        policyId: '',
        name: '',
        dailyRate: 0,
        premiumDailyRate: 0,
        coverage: 0,
        premiumCoverage: 0,
        maxDurationMonths: '12',
        minDurationDays: '1',
        type: 'general',
        description: '',
        coverageItems: [],
        terms: ''
      });
      setPolicyDialog(false);
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Policy creation error:', error);
      console.error('Error response:', error?.response);
      console.error('Error status:', error?.response?.status);
      console.error('Error data:', error?.response?.data);
      
      let errorMessage = 'Failed to create policy';
      if (error?.response?.status === 403) {
        errorMessage = 'Access forbidden. You may not have permission to create policies. Please check your user role.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setDashboardError(errorMessage);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    setDashboardError('');
    setDashboardSuccess('');
    
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }

    console.log('🗑️ Deleting policy:', policyId);
    setDeletingPolicy(policyId);

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/insurance/delete-policy/${policyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDashboardSuccess('Policy deleted successfully!');
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Policy deletion error:', error);
      
      let errorMessage = 'Failed to delete policy';
      if (error?.response?.status === 403) {
        errorMessage = 'Access forbidden. Only insurance agents and administrators can delete policies.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.message || 'Cannot delete policy - it may have active subscriptions.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Policy not found. It may have already been deleted.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setDashboardError(`Delete failed: ${errorMessage}`);
    } finally {
      setDeletingPolicy(null);
    }
  };

  const handleProcessClaim = async () => {
    setDashboardError('');
    setDashboardSuccess('');
    
    // For complaint refund, we don't need a status
    if (!selectedClaim) {
      setDashboardError('No item selected to process');
      return;
    }
    
    // For regular claim processing, we need a status
    if (!selectedClaim.complaintId && !claimStatus) {
      setDashboardError('Please select a status for the claim');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (selectedClaim.complaintId) {
        // Process complaint refund
        console.log(`Processing refund for complaint: ${selectedClaim.complaintId}`);
        
        try {
          // Add detailed logging to diagnose the issue
          console.log(`Calling API: POST /api/order/complaint/${selectedClaim.complaintId}/process-refund`);
          console.log(`With data:`, { comments: claimComments });
          
          // Use the configured axios instance which has the /api prefix in baseURL
          const response = await axios({
            method: 'post',
            url: `/order/complaint/${selectedClaim.complaintId}/process-refund`,
            data: { comments: claimComments }
          });
          
          console.log(`API response:`, response.data);
          setDashboardSuccess(`Complaint refund processed successfully!`);
        } catch (err: any) {
          console.error('API Error:', err);
          console.error('Error response:', err.response?.data);
          throw err; // Re-throw to be caught by the outer catch block
        }
      } else {
        // Process regular insurance claim
        console.log(`Processing claim: ${selectedClaim.claimId} with status: ${claimStatus}`);
        await axios.post('/insurance/process-claim', {
          claimId: selectedClaim.claimId,
          status: claimStatus,
          comments: claimComments
        });
        
        setDashboardSuccess(`Claim ${claimStatus} successfully!`);
      }
      
      setClaimProcessDialog(false);
      setSelectedClaim(null);
      setClaimStatus('');
      setClaimComments('');
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error processing claim/complaint:', error);
      console.error('Response data:', error?.response?.data);
      
      // Enhanced error reporting
      const errorMessage = error?.response?.data?.message || 
                           error?.message || 
                           'Failed to process claim/complaint';
      
      console.error('Error details:', {
        message: errorMessage,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.response?.config?.url,
        method: error?.response?.config?.method
      });
      
      setDashboardError(errorMessage);
    }
  };

  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      
      // Test 1: No authentication endpoint
      const testRes = await axios.get('/insurance/test-connection');
      console.log('✅ Test connection successful:', testRes.data);
      
      // Test 2: Policy creation endpoint (no auth)
      const testPolicyRes = await axios.post('/insurance/test-policy-create', {
        test: 'data'
      });
      console.log('✅ Test policy create successful:', testPolicyRes.data);
      
      // Test 3: With authentication
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (token) {
        const authRes = await axios.post('/insurance/create-policy', {
          policyId: 'TEST-001',
          name: 'Test Policy',
          dailyRate: 1,
          coverage: 100,
          maxDurationMonths: 1,
          minDurationDays: 1,
          type: 'general',
          description: 'Test policy',
          coverageItems: [],
          terms: 'Test terms'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Authenticated create policy successful:', authRes.data);
        setDashboardSuccess('All connection tests passed! Policy creation should work now.');
      } else {
        setDashboardError('No authentication token found. Please log in again.');
      }
      
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
      
      if (error?.response?.status === 403) {
        setDashboardError('Connection test failed: Access forbidden (403). Role restriction issue.');
      } else if (error?.response?.status === 401) {
        setDashboardError('Connection test failed: Authentication required (401). Please log in again.');
      } else {
        setDashboardError(`Connection test failed: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
      }
    }
  };

  // Function to toggle complaint importance
  const toggleComplaintImportance = async (complaint: any) => {
    if (updatingComplaintId) return; // Prevent multiple clicks
    
    try {
      setUpdatingComplaintId(complaint.complaintId);
      
      // Optimistic update for better UX
      const updatedComplaints = filedComplaints.map(c => 
        c.complaintId === complaint.complaintId 
          ? {...c, isImportant: !c.isImportant}
          : c
      );
      setFiledComplaints(updatedComplaints);
      
      // Call API to toggle importance
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/order/complaint/${complaint.complaintId}/toggle-important`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // If API fails, revert the change
      if (!response.data.success) {
        const revertedComplaints = filedComplaints.map(c => 
          c.complaintId === complaint.complaintId ? complaint : c
        );
        setFiledComplaints(revertedComplaints);
      }
      
      setDashboardSuccess(`Complaint ${complaint.complaintId} ${response.data.isImportant ? 'marked' : 'unmarked'} as important`);
      
    } catch (error) {
      console.error('Error toggling complaint importance:', error);
      
      // Revert optimistic update on error
      const revertedComplaints = filedComplaints.map(c => 
        c.complaintId === complaint.complaintId ? complaint : c
      );
      setFiledComplaints(revertedComplaints);
      
      setDashboardError('Failed to update complaint importance');
    } finally {
      setUpdatingComplaintId(null);
    }
  };
  
  // Get color for status chips
  const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'resolved' || statusLower === 'processed' || statusLower === 'refunded') {
      return 'success';
    } else if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'declined') {
      return 'error';
    } else if (statusLower === 'pending' || statusLower === 'waiting' || statusLower === 'processing') {
      return 'warning';
    } else if (statusLower === 'filed' || statusLower === 'submitted' || statusLower === 'received') {
      return 'info';
    } else {
      return 'default';
    }
  };

  // This function is used in InsuranceClaimsTable component via props
  const openClaimProcessDialog = (claim: any) => {
    setSelectedClaim(claim);
    setClaimStatus(claim.status || '');
    setClaimComments('');
    setClaimProcessDialog(true);
  };

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="h5" gutterBottom>Insurance Agent Dashboard</Typography>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="info" 
            sx={{ mr: 2 }} 
            startIcon={<AccountBalance />}
            onClick={() => setFundDialog(true)}
          >
            Add Fund (₹{userBalance?.balance || 0})
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            sx={{ mr: 2 }} 
            startIcon={<Security />}
            onClick={() => setPolicyDialog(true)}
          >
            Create Policy
          </Button>
          <Button 
            variant="outlined" 
            color="info" 
            sx={{ mr: 2 }} 
            onClick={testBackendConnection}
          >
            Test Connection
          </Button>
          <Button 
            variant="outlined" 
            color="success" 
            sx={{ mr: 2 }} 
            onClick={() => fetchDashboardData()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={() => setOpen(true)}>
            Change Password
          </Button>
          <Button variant="outlined" color="secondary" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {dashboardSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {dashboardSuccess}
        </Alert>
      )}
      {dashboardError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dashboardError}
        </Alert>
      )}

      {/* Account Balance Card */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Card sx={{ flex: '1 1 300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
              Account Balance
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ mb: 2 }}>
              ₹{userBalance?.balance || 0}
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<Payment />}
              onClick={() => setFundDialog(true)}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>

        {/* Dashboard Statistics */}
        <Card sx={{ flex: '2 1 600px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Dashboard Overview</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main">{dashboardData?.stats?.totalPolicies || 0}</Typography>
                <Typography variant="caption">Total Policies</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="success.main">{dashboardData?.stats?.activePolicies || 0}</Typography>
                <Typography variant="caption">Active Policies</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="warning.main">{dashboardData?.stats?.totalClaims || 0}</Typography>
                <Typography variant="caption">Total Claims</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="error.main">{dashboardData?.stats?.pendingClaims || 0}</Typography>
                <Typography variant="caption">Pending Claims</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Account Transactions Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Recent Account Transactions</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length > 0 ? (
                // Filter out any potential duplicates by transaction ID
                [...new Map(transactions.map(item => 
                  [item.id || item.transactionId, item])).values()]
                .slice(0, 10).map((transaction: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.type} 
                        color={transaction.type === 'credit' ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color={transaction.amount > 0 ? 'success.main' : 'error.main'}>
                        {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Typography color="primary.main" fontWeight="bold">
                        ₹{(transaction.balance || userBalance.balance).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Filed Complaints from Subscribers */}
      
      
      {/* Filed Complaints Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Filed Complaints from Subscribers ({filedComplaints.length})
          </Typography>
          
          {/* Search Field */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Search by Complaint ID"
              variant="outlined"
              value={complaintSearchQuery}
              onChange={(e) => setComplaintSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Box component="span" sx={{ color: 'action.active', mr: 1, my: 0.5 }}>
                    🔍
                  </Box>
                ),
                endAdornment: complaintSearchQuery ? (
                  <Box 
                    component="span" 
                    sx={{ color: 'action.active', cursor: 'pointer', my: 0.5 }}
                    onClick={() => setComplaintSearchQuery('')}
                  >
                    ❌
                  </Box>
                ) : null,
              }}
              sx={{ width: 250 }}
            />
          </Box>
        </Box>
        
        {/* Filter complaints based on search query */}
        {(() => {
          const filteredComplaints = filedComplaints.filter(complaint => 
            complaint.complaintId.toLowerCase().includes(complaintSearchQuery.toLowerCase())
          );
          
          return filteredComplaints.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {filedComplaints.length === 0 ? 
                "No filed complaints to review." : 
                `No complaints found matching "${complaintSearchQuery}".`
              }
            </Alert>
          ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Complaint ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Date Filed</TableCell>
                  <TableCell>Action Date</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Claim Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredComplaints.map((complaint: any) => (
                  <TableRow 
                    key={complaint._id || complaint.complaintId}
                    sx={{
                      backgroundColor: complaint.isImportant ? 'rgba(255, 215, 0, 0.1)' : 'inherit',
                      '&:hover': {
                        backgroundColor: complaint.isImportant ? 'rgba(255, 215, 0, 0.2)' : 'action.hover',
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          component="span" 
                          sx={{ 
                            cursor: 'pointer',
                            color: complaint.isImportant ? 'gold' : 'text.secondary',
                            mr: 1,
                            '&:hover': { opacity: 0.8 }
                          }}
                          onClick={() => toggleComplaintImportance(complaint)}
                          title={complaint.isImportant ? "Unmark as important" : "Mark as important"}
                        >
                          {complaint.isImportant ? '★' : '☆'}
                        </Box>
                        {complaint.complaintId}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {complaint.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {complaint.quantity} × ₹{complaint.price}
                      </Typography>
                    </TableCell>
                    <TableCell>{complaint.orderId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{complaint.sellerName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {complaint.sellerEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{complaint.buyerName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {complaint.buyerEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(complaint.complaintDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {complaint.claimDate ? new Date(complaint.claimDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{complaint.complaintReason}</TableCell>
                    <TableCell>
                      <Chip 
                        label={complaint.status} 
                        color={
                          complaint.status === 'filed' ? 'info' :
                          complaint.status === 'pending' ? 'warning' :
                          complaint.status === 'resolved' ? 'success' :
                          complaint.status === 'rejected' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {complaint.claimId ? (
                        <Chip
                          label={complaint.claimStatus || "Pending"}
                          color={getStatusColor(complaint.claimStatus || "pending")}
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="No Claim Filed"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => openClaimProcessDialog(complaint)}
                        disabled={complaint.status === 'refunded'}
                      >
                        {complaint.status === 'refunded' ? 'Refunded' : 'Process'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )
        })()}
      </Box>

      {/* Available Policies Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Available Insurance Policies</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Policy ID</TableCell>
                <TableCell>Policy Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Normal Daily Rate</TableCell>
                <TableCell>Premium Daily Rate</TableCell>
                <TableCell>Coverage (Normal)</TableCell>
                <TableCell>Coverage (Premium)</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData?.policies && dashboardData.policies.length > 0 ? (
                dashboardData.policies.map((policy: any) => (
                  <TableRow key={policy._id || policy.policyId}>
                    <TableCell>{policy._id || policy.policyId}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {policy.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={policy.type || 'general'} 
                        color={
                          policy.type === 'crop' ? 'success' : 
                          policy.type === 'livestock' ? 'warning' : 
                          policy.type === 'equipment' ? 'info' : 'default'
                        } 
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color="info.main" fontWeight="bold">
                        ₹{policy.dailyRate || 0}/day
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="warning.main" fontWeight="bold">
                        ₹{policy.premiumDailyRate || 0}/day
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="success.main" fontWeight="bold">
                        ₹{policy.coverage?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="success.dark" fontWeight="bold">
                        ₹{policy.premiumCoverage?.toLocaleString() || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {policy.description || 'No description available'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={policy.status?.toUpperCase() || 'ACTIVE'} 
                        color={
                          policy.status === 'active' ? 'success' :
                          policy.status === 'inactive' ? 'warning' :
                          policy.status === 'discontinued' ? 'error' : 'success'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeletePolicy(policy._id || policy.policyId)}
                        sx={{ minWidth: 'auto', px: 1 }}
                        disabled={deletingPolicy === (policy._id || policy.policyId)}
                      >
                        {deletingPolicy === (policy._id || policy.policyId) ? 'Deleting...' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">No policies available</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Existing Policies with User Details */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Customer Insurance Subscriptions</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Email</TableCell>
                <TableCell>Customer Role</TableCell>
                <TableCell>Policy ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Coverage</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Total Paid</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData?.insurances && dashboardData.insurances.length > 0 ? (
                dashboardData.insurances.map((insurance: any) => (
                  <TableRow key={insurance._id}>
                    <TableCell>{insurance.userEmail || insurance.userId?.email || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={insurance.userId?.role?.toUpperCase() || 'USER'} 
                        color="info" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{insurance.policyId}</TableCell>
                    <TableCell>
                      <Chip 
                        label={insurance.status?.toUpperCase() || 'UNKNOWN'} 
                        color={
                          insurance.status === 'active' ? 'success' :
                          insurance.status === 'cancelled' ? 'warning' :
                          insurance.status === 'expired' ? 'error' : 'default'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>₹{insurance.premium || 0}</TableCell>
                    <TableCell>₹{insurance.coverage || 0}</TableCell>
                    <TableCell>{insurance.startDate ? new Date(insurance.startDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>{insurance.endDate ? new Date(insurance.endDate).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>₹{insurance.totalPremiumsPaid || insurance.premium || 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">No customer subscriptions found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Loading dashboard data...</Typography>
        </Box>
      )}

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

      {/* Add Fund Dialog */}
      <Dialog open={fundDialog} onClose={() => setFundDialog(false)}>
        <DialogTitle>Add Insurance Fund</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2">
              Current Balance: <strong>₹{userBalance?.balance || 0}</strong>
            </Typography>
            <TextField
              label="Amount to Add (₹)"
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              fullWidth
              required
            />
            <Typography variant="caption" color="text.secondary">
              Maximum amount per transaction: ₹10,000
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFundDialog(false)}>Cancel</Button>
          <Button onClick={handleAddFund} variant="contained" color="primary">
            Add Fund
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Policy Dialog */}
      <Dialog open={policyDialog} onClose={() => setPolicyDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Insurance Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Policy ID"
                value={newPolicy.policyId}
                onChange={(e) => setNewPolicy({...newPolicy, policyId: e.target.value})}
                fullWidth
                required
                placeholder="POL001"
              />
              <TextField
                select
                label="Policy Type"
                value={newPolicy.type}
                onChange={(e) => setNewPolicy({...newPolicy, type: e.target.value})}
                fullWidth
                required
              >
                <MenuItem value="crop">Crop Insurance</MenuItem>
                <MenuItem value="livestock">Livestock Protection</MenuItem>
                <MenuItem value="equipment">Equipment Coverage</MenuItem>
                <MenuItem value="general">General Agricultural</MenuItem>
              </TextField>
            </Box>
            
            <TextField
              label="Policy Name"
              value={newPolicy.name}
              onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})}
              fullWidth
              required
              placeholder="Premium Agricultural Coverage"
            />
            
            {/* Normal Insurance Rates */}
            <Typography variant="h6" color="primary" sx={{ mt: 2 }}>Normal Insurance Rates</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Normal Daily Rate (₹)"
                type="number"
                value={newPolicy.dailyRate}
                onChange={(e) => setNewPolicy({...newPolicy, dailyRate: Number(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 0.01, step: 0.01 }}
                helperText="Standard daily rate for normal coverage"
              />
              <TextField
                label="Normal Coverage Amount (₹)"
                type="number"
                value={newPolicy.coverage}
                onChange={(e) => setNewPolicy({...newPolicy, coverage: Number(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                helperText="Maximum coverage for normal insurance"
              />
            </Box>

            {/* Premium Insurance Rates */}
            <Typography variant="h6" color="warning.main" sx={{ mt: 2 }}>Premium Insurance Rates (Enhanced Coverage)</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Premium Daily Rate (₹)"
                type="number"
                value={newPolicy.premiumDailyRate}
                onChange={(e) => setNewPolicy({...newPolicy, premiumDailyRate: Number(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 0.01, step: 0.01 }}
                helperText="Higher daily rate for premium coverage"
              />
              <TextField
                label="Premium Coverage Amount (₹)"
                type="number"
                value={newPolicy.premiumCoverage}
                onChange={(e) => setNewPolicy({...newPolicy, premiumCoverage: Number(e.target.value) || 0})}
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                helperText="Higher maximum coverage for premium insurance"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Minimum Days"
                type="number"
                value={newPolicy.minDurationDays}
                onChange={(e) => setNewPolicy({...newPolicy, minDurationDays: e.target.value})}
                fullWidth
                required
                inputProps={{ min: 1, max: 365 }}
                helperText="Minimum coverage period"
              />
              <TextField
                label="Maximum Months"
                type="number"
                value={newPolicy.maxDurationMonths}
                onChange={(e) => setNewPolicy({...newPolicy, maxDurationMonths: e.target.value})}
                fullWidth
                required
                inputProps={{ min: 1, max: 24 }}
                helperText="Maximum coverage period"
              />
            </Box>
            
            <TextField
              label="Policy Description"
              multiline
              rows={3}
              value={newPolicy.description}
              onChange={(e) => setNewPolicy({...newPolicy, description: e.target.value})}
              fullWidth
              required
              placeholder="Describe the policy coverage, what's included, and main benefits..."
            />
            
            <TextField
              label="Terms & Conditions"
              multiline
              rows={2}
              value={newPolicy.terms}
              onChange={(e) => setNewPolicy({...newPolicy, terms: e.target.value})}
              fullWidth
              placeholder="Policy terms, deductibles, exclusions, etc..."
            />
            
            {/* Premium Calculator Preview */}
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'white' }}>
              <Typography variant="h6">Insurance Rate Calculator Preview</Typography>
              <Typography variant="body2">
                Normal Rate: ₹{newPolicy.dailyRate || 0}/day | Premium Rate: ₹{newPolicy.premiumDailyRate || 0}/day
              </Typography>
              <Typography variant="body2">
                Monthly Normal: ₹{newPolicy.dailyRate || 0} × 30 = ₹{(Number(newPolicy.dailyRate) * 30) || 0}
              </Typography>
              <Typography variant="body2">
                Monthly Premium: ₹{newPolicy.premiumDailyRate || 0} × 30 = ₹{(Number(newPolicy.premiumDailyRate) * 30) || 0}
              </Typography>
              <Typography variant="body2">
                Coverage Range: {newPolicy.minDurationDays || 1} days to {newPolicy.maxDurationMonths || 12} months
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePolicy} variant="contained" color="primary">
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Claim/Complaint Dialog */}
      <Dialog open={claimProcessDialog} onClose={() => setClaimProcessDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedClaim?.complaintId ? 'Process Complaint Refund' : 'Process Insurance Claim'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {selectedClaim && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2">
                  {selectedClaim?.complaintId ? 'Complaint Details:' : 'Claim Details:'}
                </Typography>
                
                {selectedClaim?.complaintId ? (
                  // Complaint details
                  <>
                    <Typography variant="body2">Complaint ID: {selectedClaim.complaintId}</Typography>
                    <Typography variant="body2">Order ID: {selectedClaim.orderId}</Typography>
                    <Typography variant="body2">Product: {selectedClaim.productName}</Typography>
                    <Typography variant="body2">Amount: ₹{(selectedClaim.orderAmount || (selectedClaim.price * selectedClaim.quantity)).toFixed(2)}</Typography>
                    <Typography variant="body2">Status: {selectedClaim.status}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'warning.main' }}>
                      <b>Note:</b> Refund will be processed from your insurance fund to the buyer's account.
                    </Typography>
                  </>
                ) : (
                  // Regular claim details
                  <>
                    <Typography variant="body2">Claim ID: {selectedClaim.claimId || selectedClaim._id}</Typography>
                    <Typography variant="body2">Amount: ₹{selectedClaim.totalClaimAmount || selectedClaim.amount || 0}</Typography>
                    <Typography variant="body2">Type: {selectedClaim.claimType}</Typography>
                    <Typography variant="body2">Current Status: {selectedClaim.status}</Typography>
                  </>
                )}
              </Box>
            )}
            
            {!selectedClaim?.complaintId && (
              <TextField
                select
                label="New Status"
                value={claimStatus}
                onChange={(e) => setClaimStatus(e.target.value)}
                fullWidth
                required
              >
                <MenuItem value="under_review">Under Review</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </TextField>
            )}
            
            <TextField
              label="Comments (Optional)"
              multiline
              rows={3}
              value={claimComments}
              onChange={(e) => setClaimComments(e.target.value)}
              fullWidth
              placeholder={selectedClaim?.complaintId ? 
                "Add any comments about this refund..." : 
                "Add any comments about this claim processing..."}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimProcessDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleProcessClaim} 
            variant="contained" 
            color={selectedClaim?.complaintId ? "success" : "primary"}
          >
            {selectedClaim?.complaintId ? 'Process Refund' : 'Update Claim'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardInsurance;
