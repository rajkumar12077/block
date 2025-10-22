import React, { useState, useEffect } from 'react';
import { 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, 
  Box, Card, CardContent, Alert, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip 
} from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import axios from '../api';
import BuyerOrderHistoryTable from '../components/BuyerOrderHistoryTable';
import BuyerComplaintsTable from '../components/BuyerComplaintsTable';
import FileComplaintForm from '../components/FileComplaintForm';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const DashboardBuyer: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBalance, setUserBalance] = useState({ balance: 0 });
  const [fundDialog, setFundDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [complaintFormOpen, setComplaintFormOpen] = useState(false);

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/user/balance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const balance = typeof response.data.balance === 'string' 
          ? parseFloat(response.data.balance) 
          : response.data.balance;
        setUserBalance({ balance });
        console.log('💰 Fetched balance:', balance, '(type:', typeof balance, ')');
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        setTransactionsLoading(true);
        const response = await axios.get('/accounts/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Debug: Log transactions to see what's being received
        console.log('🔍 RAW Fetched transactions:', response.data);
        
        // Enhanced debugging - show what types of transactions we received
        const transactionBreakdown = (response.data || []).reduce((acc: any, tx: any) => {
          const type = tx.type || tx.transactionType || 'unknown';
          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
          acc[type] = acc[type] || { count: 0, amounts: [] };
          acc[type].count++;
          acc[type].amounts.push(amount);
          return acc;
        }, {});
        
        console.log('📊 TRANSACTION BREAKDOWN by type:', transactionBreakdown);
        
        // Check if we have any debit transactions
        const debitTransactions = (response.data || []).filter((tx: any) => {
          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
          return amount < 0;
        });
        
        const creditTransactions = (response.data || []).filter((tx: any) => {
          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
          return amount > 0;
        });
        
        console.log('💳 DEBIT transactions (should show purchases):', debitTransactions.length);
        console.log('💰 CREDIT transactions (should show refunds/funds):', creditTransactions.length);
        
        if (debitTransactions.length === 0) {
          console.warn('⚠️ NO DEBIT TRANSACTIONS FOUND! This might be the issue.');
        }
        
        debitTransactions.forEach((tx: any, index: number) => {
          console.log(`  ${index + 1}. DEBIT: ${tx.type || tx.transactionType} - ₹${tx.amount} - ${tx.description}`);
        });
        
        creditTransactions.forEach((tx: any, index: number) => {
          console.log(`  ${index + 1}. CREDIT: ${tx.type || tx.transactionType} - ₹${tx.amount} - ${tx.description}`);
        });
        
        // Sort transactions by date (newest first) to ensure correct balance calculation
        const sortedTransactions = (response.data || [])
          .map((tx: any) => ({
            ...tx,
            amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount
          }))
          .sort((a: any, b: any) => 
            new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
          );
        
        setTransactions(sortedTransactions);
        console.log('📝 Displaying', sortedTransactions.length, 'transactions');
        console.log('💰 Sample transaction amounts:', sortedTransactions.slice(0, 3).map((tx: any) => ({ desc: tx.description, amount: tx.amount, type: typeof tx.amount, originalType: tx.type || tx.transactionType })));
        
        console.log('🧪 TEST FUNCTIONS AVAILABLE:');
        console.log('  - window.testBackendTransactions() - Check what backend returns');
        console.log('  - window.testBalanceCalculation() - Test balance calculations');
        console.log('  - window.refreshTransactions() - Manually refresh transaction data');
      }
    } catch (error) {
      console.error('❌ Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
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
      'premium_refund_debit': 'Premium Refund',
      'subscription_fee': 'Subscription Fee',
      
      // Generic fallbacks
      'credit': 'Money In',
      'debit': 'Money Out',
      'transaction': 'Transaction'
    };
    
    // If type is not found, create a readable label from the type string
    if (!types[type] && type) {
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return types[type] || 'Transaction';
  };

  // Calculate the running balance up to and including this transaction
  const calculateBalanceAfterTransaction = (transactions: any[], currentIndex: number) => {
    // Start with current balance (most recent balance)
    let balance = userBalance.balance;
    
    // Since transactions are sorted newest first, we need to work backwards
    // Subtract transactions that happened AFTER this transaction to get the balance at this point
    for (let i = 0; i < currentIndex; i++) {
      const tx = transactions[i];
      balance -= tx.amount; // Remove future transactions to get past balance
    }
    
    console.log(`Balance calculation for transaction ${currentIndex}:`, {
      startingBalance: userBalance.balance,
      transactionAmount: transactions[currentIndex]?.amount,
      calculatedBalance: balance,
      transactionDesc: transactions[currentIndex]?.description
    });
    
    return balance;
  };



  // Add debug function to window for testing
  React.useEffect(() => {
    // Test function to check backend transactions directly
    (window as any).testBackendTransactions = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🧪 Testing backend transactions directly...');
        
        const response = await axios.get('/accounts/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('🔍 DIRECT backend response:', response.data);
        console.log('📊 Total transactions returned:', response.data?.length || 0);
        
        const breakdown = (response.data || []).reduce((acc: any, tx: any) => {
          acc[tx.type || 'unknown'] = (acc[tx.type || 'unknown'] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📈 Type breakdown:', breakdown);
        
        // Check for ALL specific transaction types
        const allTypes = {
          product_purchase: (response.data || []).filter((tx: any) => tx.type === 'product_purchase'),
          sale_credit: (response.data || []).filter((tx: any) => tx.type === 'sale_credit'),
          order_refund: (response.data || []).filter((tx: any) => tx.type === 'order_refund'),
          fund_addition: (response.data || []).filter((tx: any) => tx.type === 'fund_addition'),
          premium_payment: (response.data || []).filter((tx: any) => tx.type === 'premium_payment'),
          other: (response.data || []).filter((tx: any) => 
            !['product_purchase', 'sale_credit', 'order_refund', 'fund_addition', 'premium_payment'].includes(tx.type)
          )
        };
        
        console.log('� COMPLETE TRANSACTION TYPE ANALYSIS:');
        Object.entries(allTypes).forEach(([type, transactions]) => {
          if (transactions.length > 0) {
            console.log(`  ✅ ${type}: ${transactions.length} transactions`);
            transactions.forEach((tx: any, index: number) => {
              console.log(`    ${index + 1}. Amount: ₹${tx.amount}, Desc: ${tx.description?.substring(0, 50)}`);
            });
          } else {
            console.log(`  ❌ ${type}: 0 transactions`);
          }
        });
        
        if (allTypes.product_purchase.length > 0) {
          console.log('✅ Found product purchases:', allTypes.product_purchase.map((tx: any) => ({
            type: tx.type,
            amount: tx.amount,
            desc: tx.description
          })));
        } else {
          console.warn('⚠️ NO PRODUCT PURCHASE TRANSACTIONS FOUND!');
        }
        
      } catch (error) {
        console.error('❌ Backend test failed:', error);
      }
    };

    // Manual refresh function
    (window as any).refreshTransactions = () => {
      console.log('🔄 Manually refreshing transaction data...');
      fetchTransactions();
    };

    (window as any).testBalanceCalculation = () => {
      console.log('🧪 Testing balance calculation...');
      console.log('Current balance:', userBalance.balance);
      console.log('Transactions count:', transactions.length);
      
      if (transactions.length > 0) {
        console.log('\n📊 COMPLETE TRANSACTION HISTORY:');
        transactions.forEach((tx, index) => {
          const calculatedBalance = calculateBalanceAfterTransaction(transactions, index);
          const txType = tx.amount > 0 ? '💚 CREDIT' : '🔴 DEBIT';
          console.log(`${index + 1}. ${txType} ${tx.type}:`, {
            date: new Date(tx.createdAt).toLocaleString(),
            description: tx.description,
            amount: `${tx.amount > 0 ? '+' : ''}₹${tx.amount}`,
            calculatedBalance: `₹${calculatedBalance}`,
            orderId: tx.relatedId || 'N/A'
          });
        });
        
        console.log('\n🔍 VERIFYING CANCELLED ORDER VISIBILITY:');
        const purchaseTransactions = transactions.filter(tx => tx.type === 'product_purchase');
        const refundTransactions = transactions.filter(tx => tx.type === 'order_refund');
        console.log(`- Purchase transactions (should remain visible): ${purchaseTransactions.length}`);
        console.log(`- Refund transactions (should be visible): ${refundTransactions.length}`);
        
        refundTransactions.forEach(refund => {
          const matchingPurchase = purchaseTransactions.find(purchase => 
            purchase.relatedId === refund.relatedId || 
            (refund.description && purchase.description && 
             refund.description.includes(purchase.description.split(' ')[2]) // product name
            )
          );
          console.log(`Refund for ${refund.relatedId}:`, {
            refundAmount: refund.amount,
            hasMatchingPurchase: !!matchingPurchase,
            purchaseAmount: matchingPurchase?.amount || 'Not found'
          });
        });
      }
    };
    
    (window as any).debugBuyerTransactions = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🔍 Debug: Fetching buyer transactions...');
        
        // Get user info
        const userResponse = await axios.get('/user/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('👤 Current user:', userResponse.data);
        
        // Get balance
        const balanceResponse = await axios.get('/user/balance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('💰 Current balance:', balanceResponse.data);
        
        // Get transactions
        const transactionsResponse = await axios.get('/accounts/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('📝 Transactions:', transactionsResponse.data);
        
        return {
          user: userResponse.data,
          balance: balanceResponse.data,
          transactions: transactionsResponse.data
        };
      } catch (error) {
        console.error('❌ Debug failed:', error);
        throw error;
      }
    };
    
    console.log('🔧 Debug function available: window.debugBuyerTransactions()');
  }, []);

  // Set up an interval to refresh the balance and transactions periodically
  useEffect(() => {
    // Initial fetch
    fetchBalance();
    fetchTransactions();

    // Set up periodic refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchBalance();
      fetchTransactions();
    }, 10000);

    // Cleanup on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const handleAddFunds = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const amount = parseFloat(fundAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      await axios.post('/user/add-balance', 
        { amount, description: 'Manual balance top-up' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess(`Successfully added ${formatCurrency(amount)} to your account`);
      setFundAmount('');
      setFundDialog(false);
      fetchBalance(); // Refresh balance
      fetchTransactions(); // Refresh transactions
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add funds');
    } finally {
      setLoading(false);
    }
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
      <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Buyer Dashboard</Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setComplaintFormOpen(true)}
          >
            File a Complaint
          </Button>
        </Box>
        
        {/* Account Balance */}
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalance sx={{ mr: 1 }} />
                <Typography variant="h6">Account Balance</Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {transactions.length > 0 ? `Last updated: ${new Date().toLocaleTimeString()}` : 'No transactions'}
              </Typography>
            </Box>
            <Typography variant="h4">{formatCurrency(userBalance.balance)}</Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              Available for purchases
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => setFundDialog(true)}
            >
              Add Funds
            </Button>
          </CardContent>
        </Card>
        
        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={() => setOpen(true)}>
            Change Password
          </Button>
          <Button variant="outlined" color="secondary" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Box>
      
      {/* Purchase History Table */}
      <BuyerOrderHistoryTable />
      
      {/* Complaints Table */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <BuyerComplaintsTable />
      </Box>
      
      {/* Transaction Summary
      <Box sx={{ mt: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Transaction Summary</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{ minWidth: 150, bgcolor: 'success.light' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="success.contrastText">Money In</Typography>
              <Typography variant="h6" color="success.contrastText">
                ₹{transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 150, bgcolor: 'error.light' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="error.contrastText">Money Out</Typography>
              <Typography variant="h6" color="error.contrastText">
                ₹{Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 150, bgcolor: 'info.light' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="info.contrastText">Total Transactions</Typography>
              <Typography variant="h6" color="info.contrastText">
                {transactions.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box> */}

      {/* Transaction History Table */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Recent Transaction History</Typography>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={fetchTransactions}
            disabled={transactionsLoading}
          >
            {transactionsLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
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
              {transactionsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">Loading transactions...</Typography>
                  </TableCell>
                </TableRow>
              ) : transactions.length > 0 ? (
                transactions.slice(0, 15).map((transaction: any, index: number) => (
                  <TableRow key={transaction.id || index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(transaction.createdAt || transaction.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(transaction.createdAt || transaction.date).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getTransactionTypeLabel(transaction.type || transaction.transactionType)} 
                        color={transaction.amount > 0 ? 'success' : 'error'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transaction.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="primary.main" fontWeight="bold">
                        {formatCurrency(Number(calculateBalanceAfterTransaction(transactions, index)))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary" gutterBottom>
                      No transactions yet
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Your purchases, refunds, and balance additions will appear here
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
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
      
      {/* Fund Dialog */}
      <Dialog open={fundDialog} onClose={() => setFundDialog(false)}>
        <DialogTitle>Add Funds to Your Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter the amount you wish to add to your account.
          </Typography>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            variant="outlined"
            inputProps={{ min: "1", step: "1" }}
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
          />
          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFundDialog(false)} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleAddFunds} 
            variant="contained" 
            color="primary" 
            disabled={!fundAmount || loading}
          >
            {loading ? 'Processing...' : 'Add Funds'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* My Complaints Section */}
      {/* <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="h5" gutterBottom>My Complaints</Typography>
        <BuyerComplaintsTable />
      </Box> */}

      {/* File Complaint Form Dialog */}
      {/* <FileComplaintForm 
        open={complaintFormOpen}
        onClose={() => setComplaintFormOpen(false)}
      /> */}
    </Box>
  );
};

export default DashboardBuyer;
