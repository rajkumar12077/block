import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility,
  ShoppingCart,
  Cancel,
  ReportProblem,
  Person,
  AccessTime
} from '@mui/icons-material';
import axios from '../api';

interface BuyerOrderHistoryItem {
  orderId: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  time: string;
  sellerName: string;
  sellerId: string;
  status: string;
}

const BuyerOrderHistoryTable: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<BuyerOrderHistoryItem[]>([]);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [complaintDialog, setComplaintDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [complaintData, setComplaintData] = useState({
    reason: '',
    description: ''
  });

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/order/buyer-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/order/cancel/${selectedOrderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Order cancelled successfully');
      setCancelDialog(false);
      setSelectedOrderId('');
      fetchOrders(); // Refresh the order list
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to cancel order');
    }
  };
  
  const handleSubmitComplaint = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }
      
      if (!selectedOrderId || !complaintData.reason || !complaintData.description) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Submit complaint
      await axios.post('/order/complaint', 
        {
          orderId: selectedOrderId,
          reason: complaintData.reason,
          description: complaintData.description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess('Complaint filed successfully');
      setComplaintDialog(false);
      setSelectedOrderId('');
      setComplaintData({ reason: '', description: '' });
      
      // Refresh orders to show updated status
      fetchOrders();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to file complaint');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'dispatched_to_coldstorage': return 'info';
      case 'in_coldstorage': return 'default';
      case 'dispatched_to_customer': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/view-order/${orderId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">My Purchase History</Typography>
        {/* <Button
          variant="outlined"
          size="small"
          onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
        >
          {viewMode === 'cards' ? 'Card View' : 'Card View'}
        </Button> */}
      </Box>
      
      {/* Success/Error Messages */}
      {success && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1 }}>
          {success}
        </Box>
      )}
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          {error}
        </Box>
      )}

      {orders.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2 }}>
          {orders.map((order, index) => (
            <Card 
              key={index} 
              sx={{ 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)', 
                  boxShadow: 3 
                }
              }}
              onClick={() => handleViewOrder(order.orderId)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem' }}>
                    {order.productName}
                  </Typography>
                  <Chip 
                    label={order.status.toUpperCase().replace(/_/g, ' ')} 
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Order ID</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {order.orderId}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Unit Price</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                      {formatCurrency(order.price)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Quantity</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                      {order.quantity}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'primary.main' }}>
                      {formatCurrency(order.price * order.quantity)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Seller</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {order.sellerName}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Order Date</Typography>
                  </Box>
                  <Typography variant="body2">
                    {order.date} {order.time}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewOrder(order.orderId);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Track Order
                  </Button>
                  
                  {order.status === 'pending' && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.orderId);
                        setError('');
                        setSuccess('');
                        setCancelDialog(true);
                      }}
                      sx={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                  )}

                  {order.status === 'dispatched_to_customer' && (
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      startIcon={<ReportProblem />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.orderId);
                        setError('');
                        setSuccess('');
                        setComplaintData({
                          reason: '',
                          description: ''
                        });
                        setComplaintDialog(true);
                      }}
                      sx={{ flex: 1 }}
                    >
                      Report
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="textSecondary" variant="h6">
              No orders found
            </Typography>
            <Typography color="text.secondary">
              You haven't placed any orders yet.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel order {selectedOrderId}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>No, Keep Order</Button>
          <Button onClick={handleCancelOrder} color="error" variant="contained">
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>File a Complaint</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            You are filing a complaint for order {selectedOrderId}. Complaints must be filed within 24 hours of dispatch.
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel id="complaint-reason-label">Reason for Complaint</InputLabel>
            <Select
              labelId="complaint-reason-label"
              value={complaintData.reason}
              label="Reason for Complaint"
              onChange={(e) => setComplaintData({ ...complaintData, reason: e.target.value })}
              required
            >
              <MenuItem value="damaged_product">Damaged Product</MenuItem>
              <MenuItem value="wrong_product">Wrong Product</MenuItem>
              <MenuItem value="missing_items">Missing Items</MenuItem>
              <MenuItem value="quality_issues">Quality Issues</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Description"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={complaintData.description}
            onChange={(e) => setComplaintData({ ...complaintData, description: e.target.value })}
            required
            placeholder="Please provide details about your complaint..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitComplaint} 
            color="primary" 
            variant="contained"
            disabled={!complaintData.reason || !complaintData.description}
          >
            Submit Complaint
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuyerOrderHistoryTable;