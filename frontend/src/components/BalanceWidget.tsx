import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import axios from '../api';

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  type: 'credit' | 'debit';
  date: string;
}

interface BalanceData {
  balance: number;
  transactions: Transaction[];
}

interface BalanceWidgetProps {
  externalBalance?: number;
  refreshTrigger?: number;
}

const BalanceWidget: React.FC<BalanceWidgetProps> = ({ externalBalance, refreshTrigger }) => {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBalanceData();
  }, []);

  // Effect to handle external balance updates
  useEffect(() => {
    if (externalBalance !== undefined && balanceData) {
      console.log('🔄 BalanceWidget: Updating balance from external source:', externalBalance);
      setBalanceData(prev => prev ? ({
        ...prev,
        balance: externalBalance
      }) : null);
    }
  }, [externalBalance, balanceData]);

  // Effect to handle refresh trigger
  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 BalanceWidget: Refresh triggered:', refreshTrigger);
      fetchBalanceData();
    }
  }, [refreshTrigger]);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await axios.get('/user/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBalanceData(response.data || { balance: 0, transactions: [] });
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      setError(err?.response?.data?.message || 'Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Loading balance...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Account Balance
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
            ₹{balanceData?.balance?.toFixed(2) || '0.00'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Current Balance
          </Typography>
        </Box>

        {balanceData?.transactions && balanceData.transactions.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Recent Transactions
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {balanceData.transactions.slice(0, 10).map((transaction) => (
                    <TableRow key={transaction._id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell align="right">
                        ₹{Math.abs(transaction.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type.toUpperCase()}
                          color={transaction.type === 'credit' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {(!balanceData?.transactions || balanceData.transactions.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {/* No transactions found */}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default BalanceWidget;