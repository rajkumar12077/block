import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Tab,
  Tabs,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import axios from '../api';

interface Order {
  orderId: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  time: string;
  status: 'pending' | 'shipped' | 'dispatched';
  buyerName?: string;
  buyerEmail?: string;
  sellerName?: string;
  sellerId?: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [cancelDialog, setCancelDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const role = localStorage.getItem('role');
        let endpoint = '';
        
        if (role === 'seller') {
          endpoint = '/order/seller-orders';
        } else if (role === 'buyer') {
          endpoint = '/order/buyer-orders';
        } else {
          // For logistics and other roles, show all orders
          endpoint = '/order/all-orders';
        }
        
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'dispatched': return 'success';
      default: return 'default';
    }
  };

  const handleCancelOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/order/cancel/${selectedOrderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Order cancelled successfully');
      setCancelDialog(false);
      fetchOrders(); // Refresh the order list
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to cancel order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (tabValue === 0) return true; // All orders
    if (tabValue === 1) return order.status === 'pending';
    if (tabValue === 2) return order.status === 'shipped';
    if (tabValue === 3) return order.status === 'dispatched';
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {userRole === 'seller' ? 'Sales Orders' : userRole === 'buyer' ? 'My Orders' : 'All Orders'}
      </Typography>

      <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`All (${orders.length})`} />
        <Tab label={`Pending (${orders.filter(o => o.status === 'pending').length})`} />
        <Tab label={`Shipped (${orders.filter(o => o.status === 'shipped').length})`} />
        <Tab label={`Dispatched (${orders.filter(o => o.status === 'dispatched').length})`} />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              {userRole === 'seller' && <TableCell>Buyer</TableCell>}
              {userRole === 'buyer' && <TableCell>Seller</TableCell>}
              {(userRole === 'buyer' || userRole === 'seller') && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell>{order.orderId}</TableCell>
                  <TableCell>{order.productName}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>₹{order.price.toFixed(2)}</TableCell>
                  <TableCell>₹{(order.price * order.quantity).toFixed(2)}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.time}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status.toUpperCase()} 
                      color={getStatusColor(order.status) as any}
                      size="small"
                    />
                  </TableCell>
                  {userRole === 'seller' && (
                    <TableCell>{order.buyerName} ({order.buyerEmail})</TableCell>
                  )}
                  {userRole === 'buyer' && (
                    <TableCell>{order.sellerName}</TableCell>
                  )}
                  {(userRole === 'buyer' || userRole === 'seller') && (
                    <TableCell>
                      {(order.status === 'pending' || order.status === 'shipped') && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => {
                            setSelectedOrderId(order.orderId);
                            setCancelDialog(true);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={userRole === 'logistics' ? 8 : 10} align="center">
                  <Typography color="textSecondary">No orders found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel order {selectedOrderId}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>No, Keep Order</Button>
          <Button onClick={handleCancelOrder} color="error" variant="contained">
            Yes, Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;