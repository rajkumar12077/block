import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, SelectChangeEvent } from '@mui/material';
import axios from './frontend/src/api';

interface Address {
  name: string;
  email: string;
  phone?: string;
  address: string;
}

interface OrderTracking {
  orderId: string;
  productName: string;
  price: number;
  quantity: number;
  buyer: Address;
  seller: Address;
  logistics?: Address;
  driver?: Address;
  coldStorage?: Address;
  status: string;
  history: Array<{
    status: string;
    date: string;
    time: string;
    location?: string;
    actor?: string;
    address?: string;
  }>;
}

interface ViewOrderedProductProps {
  orderId: string;
}

const ViewOrderedProduct: React.FC<ViewOrderedProductProps> = ({ orderId }) => {
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [error, setError] = useState('');
  const [complaintDialog, setComplaintDialog] = useState(false);
  const [complaintData, setComplaintData] = useState({
    reason: '',
    description: ''
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');

  // Helper function to convert order status to display-friendly format
  const getDisplayStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'dispatched to customer':
      case 'dispatched_to_customer':
      case 'delivered_to_customer':
        return 'Delivered';
      case 'in_transit':
      case 'in transit':
        return 'In Transit';
      case 'at_cold_storage':
      case 'at cold storage':
        return 'At Cold Storage';
      case 'picked_up':
      case 'picked up':
        return 'Picked Up';
      case 'order_placed':
      case 'order placed':
        return 'Order Placed';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
        return 'Pending';
      default:
        return status || 'Unknown';
    }
  };

  const complaintReasons = [
    'Product not received',
    'Product damaged',
    'Wrong product delivered',
    'Quality issues',
    'Delayed delivery',
    'Other'
  ];

  useEffect(() => {
    fetchOrderTracking();
  }, [orderId]);

  const fetchOrderTracking = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/order/tracking/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch order tracking');
    }
  };

  const handleOpenComplaint = () => {
    setComplaintDialog(true);
  };

  const handleFileComplaint = async () => {
    if (!complaintData.reason || !complaintData.description.trim()) {
      setError('Please fill in all complaint fields');
      return;
    }

    setSubmittingComplaint(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/order/complaint', {
        orderId: order?.orderId,
        productId: order?.productId,
        productName: order?.productName,
        quantity: order?.quantity,
        price: order?.price,
        complaintReason: complaintData.reason,
        description: complaintData.description,
        orderDate: order?.date,
        dispatchDate: order?.dispatchedToCustomerDate || order?.date
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setComplaintSuccess('Complaint filed successfully! You can track its status in your dashboard.');
      setComplaintDialog(false);
      setComplaintData({ reason: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to file complaint');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!order) {
    return <Typography>Loading order details...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Order Tracking: {order.productName}</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1">Order ID: {order.orderId}</Typography>
          <Typography>Quantity: {order.quantity}</Typography>
          <Typography>Price: ₹{order.price}</Typography>
          <Typography>Status: {getDisplayStatus(order.status)}</Typography>
        </CardContent>
      </Card>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Buyer Address</Typography>
              <Typography>Name: {order.buyer.name}</Typography>
              <Typography>Email: {order.buyer.email}</Typography>
              <Typography>Phone: {order.buyer.phone}</Typography>
              <Typography>Address: {order.buyer.address}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Seller Address</Typography>
              <Typography>Name: {order.seller.name}</Typography>
              <Typography>Email: {order.seller.email}</Typography>
              <Typography>Phone: {order.seller.phone}</Typography>
              <Typography>Address: {order.seller.address}</Typography>
            </CardContent>
          </Card>
          {order.logistics && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">Logistics Address</Typography>
                <Typography>Name: {order.logistics.name}</Typography>
                <Typography>Email: {order.logistics.email}</Typography>
                <Typography>Phone: {order.logistics.phone}</Typography>
                <Typography>Address: {order.logistics.address}</Typography>
              </CardContent>
            </Card>
          )}
          {order.driver && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">Driver Address</Typography>
                <Typography>Name: {order.driver.name}</Typography>
                <Typography>Email: {order.driver.email}</Typography>
                <Typography>Phone: {order.driver.phone}</Typography>
                <Typography>Address: {order.driver.address}</Typography>
              </CardContent>
            </Card>
          )}
          {order.coldStorage && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">Cold Storage Address</Typography>
                <Typography>Name: {order.coldStorage.name}</Typography>
                <Typography>Email: {order.coldStorage.email}</Typography>
                <Typography>Phone: {order.coldStorage.phone}</Typography>
                <Typography>Address: {order.coldStorage.address}</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Order Status History</Typography>
              {order.history.map((h, idx) => (
                <Box key={idx} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography>Status: {getDisplayStatus(h.status)}</Typography>
                  <Typography>Date: {h.date}</Typography>
                  <Typography>Time: {h.time}</Typography>
                  {h.location && <Typography>Location: {h.location}</Typography>}
                  {h.actor && <Typography>Actor: {h.actor}</Typography>}
                  {h.address && <Typography>Address: {h.address}</Typography>}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" color="error" onClick={handleOpenComplaint}>
          File a Complaint
        </Button>
        {/* Complaint dialog/modal can be implemented here */}
      </Box>

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>File a Complaint</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Complaint Reason"
            value={complaintData.reason}
            onChange={(e) => setComplaintData({...complaintData, reason: e.target.value})}
            fullWidth
            margin="normal"
            required
          >
            {complaintReasons.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            label="Description"
            multiline
            rows={4}
            value={complaintData.description}
            onChange={(e) => setComplaintData({...complaintData, description: e.target.value})}
            fullWidth
            margin="normal"
            required
            placeholder="Please describe your issue in detail..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleFileComplaint}
            variant="contained"
            disabled={submittingComplaint}
          >
            {submittingComplaint ? 'Filing...' : 'File Complaint'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewOrderedProduct;