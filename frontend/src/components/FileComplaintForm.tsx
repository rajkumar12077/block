import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';

interface Order {
  _id: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  status: string;
  date: string;
  time: string;
  dispatchDate?: string;
  dispatchTime?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
}

interface FileComplaintProps {
  open: boolean;
  onClose: () => void;
  onComplaintFiled?: () => void;
}

const FileComplaintForm: React.FC<FileComplaintProps> = ({ open, onClose, onComplaintFiled }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      fetchCompletedOrders();
    }
  }, [open]);

  const fetchCompletedOrders = async () => {
    try {
      setLoadingOrders(true);
      const token = localStorage.getItem('token');
      // Use the Vite proxy configuration for API calls
      const response = await fetch('/api/order/buyer', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Filter only delivered orders that can have complaints
      const completedOrders = data.filter((order: Order) => 
        order.status === 'delivered' || order.status === 'dispatched_to_customer'
      );
      
      setOrders(completedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSuccess('');
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedOrder('');
    setReason('');
    setDescription('');
    setSuccess('');
    setError('');
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!selectedOrder) {
      setError('Please select an order');
      return;
    }
    
    if (!reason) {
      setError('Please provide a reason for your complaint');
      return;
    }
    
    if (!description) {
      setError('Please provide a detailed description of the issue');
      return;
    }
    
    if (description.length < 20) {
      setError('Description must be at least 20 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const orderDetails = orders.find(order => order._id === selectedOrder);
      
      if (!orderDetails) {
        throw new Error('Selected order not found');
      }

      const complaintData = {
        orderId: orderDetails.orderId,
        productId: orderDetails.productId || '',
        productName: orderDetails.productName,
        price: orderDetails.price,
        quantity: orderDetails.quantity,
        sellerId: orderDetails.sellerId,
        sellerName: orderDetails.sellerName,
        sellerEmail: orderDetails.sellerEmail,
        orderDate: orderDetails.date || new Date().toISOString(),
        dispatchDate: orderDetails.dispatchDate || new Date().toISOString(),
        complaintReason: reason,
        description: description
      };

      // Use the Vite proxy configuration for API calls
      const apiUrl = '/api/order/complaint';
      
      console.log('Filing complaint with data:', complaintData);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaintData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to file complaint');
      }

      await response.json();
      setSuccess('Complaint filed successfully!');
      
      // Reset form
      setSelectedOrder('');
      setReason('');
      setDescription('');

      // Call the callback if provided
      if (onComplaintFiled) {
        onComplaintFiled();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Error filing complaint:', err);
      setError(err instanceof Error ? err.message : 'Failed to file complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleOpen}
        fullWidth
      >
        File a Complaint
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>File a Complaint</DialogTitle>
        <DialogContent>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ my: 2 }}>
            <Typography variant="body2" color="textSecondary" paragraph>
              If you have an issue with your order, please file a complaint. The seller will review it 
              and may file an insurance claim if necessary.
            </Typography>
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Select Order</InputLabel>
            <Select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value as string)}
              disabled={loadingOrders}
            >
              {loadingOrders ? (
                <MenuItem disabled>Loading orders...</MenuItem>
              ) : orders.length === 0 ? (
                <MenuItem disabled>No eligible orders found</MenuItem>
              ) : (
                orders.map((order) => (
                  <MenuItem key={order._id} value={order._id}>
                    {order.productName} - {order.quantity} units - {new Date(order.date).toLocaleDateString()}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Reason</InputLabel>
            <Select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <MenuItem value="damaged">Product Damaged During Transit</MenuItem>
              <MenuItem value="quality_issue">Product Quality Issue</MenuItem>
              <MenuItem value="not_as_described">Product Not as Described</MenuItem>
              <MenuItem value="missing_items">Missing Items</MenuItem>
              <MenuItem value="expired">Product Expired/Spoiled</MenuItem>
              <MenuItem value="wrong_product">Wrong Product Delivered</MenuItem>
              <MenuItem value="temperature_issue">Temperature Control Issue</MenuItem>
              <MenuItem value="wrong_item">Wrong Item Received</MenuItem>
              <MenuItem value="missing_parts">Missing Parts</MenuItem>
              <MenuItem value="quality_issue">Quality Issue</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Detailed Description"
            multiline
            rows={4}
            fullWidth
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide details about your complaint"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained" 
            disabled={loading || !selectedOrder || !reason || !description}
          >
            {loading ? <CircularProgress size={24} /> : "Submit Complaint"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileComplaintForm;