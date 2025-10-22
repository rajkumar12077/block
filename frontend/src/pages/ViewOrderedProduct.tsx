import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import {
  ShoppingCart,
  LocalShipping,
  AcUnit,
  DirectionsCar,
  Home,
  LocationOn,
  AccessTime,
  Person,
  ReportProblem
} from '@mui/icons-material';
import axios from '../api';

interface OrderTracking {
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  status: string;
  date: string;
  time: string;
  
  // Buyer Information
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string;
  
  // Seller Information
  sellerId: string;
  sellerName: string;
  sellerAddress?: string;
  
  // Logistics Information
  logisticsId?: string;
  logisticsName?: string;
  logisticsEmail?: string;
  logisticsAddress?: string;
  
  // Cold Storage Information
  coldStorageId?: string;
  coldStorageName?: string;
  coldStorageAddress?: string;
  
  // Driver Information
  driverId?: string;
  driverName?: string;
  driverAddress?: string;
  
  // Tracking Dates
  dispatchedToColdStorageDate?: string;
  dispatchedFromColdStorageDate?: string;
  dispatchedToCustomerDate?: string;
  
  // Delivery destination
  deliveryDestination: string;
}

interface StatusStep {
  label: string;
  description: string;
  completed: boolean;
  date?: string;
  location?: string;
  person?: string;
  address?: string;
}

const ViewOrderedProduct: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaintDialog, setComplaintDialog] = useState(false);
  const [complaintData, setComplaintData] = useState({
    reason: '',
    description: ''
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');

  const complaintReasons = [
    'Product not received',
    'Product damaged',
    'Wrong product delivered',
    'Quality issues',
    'Delayed delivery',
    'Other'
  ];

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/order/track/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      setError(err.response?.data?.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const getOrderSteps = (): StatusStep[] => {
    if (!order) return [];

    const steps: StatusStep[] = [
      {
        label: 'Order Placed',
        description: 'Your order has been confirmed and payment processed',
        completed: true,
        date: `${order.date} ${order.time}`,
        location: 'Online',
        person: order.buyerName,
        address: order.buyerAddress
      },
      {
        label: 'Seller Processing',
        description: 'Seller is preparing your order for shipment',
        completed: ['pending', 'shipped', 'dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        person: order.sellerName,
        address: order.sellerAddress
      }
    ];

    // Add logistics/shipping steps based on delivery destination
    if (order.deliveryDestination === 'coldstorage' || order.status === 'dispatched_to_coldstorage' || order.status === 'in_coldstorage') {
      steps.push({
        label: 'Dispatched to Cold Storage',
        description: 'Order sent to cold storage facility for temperature control',
        completed: ['dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedToColdStorageDate,
        person: order.coldStorageName || 'Cold Storage Team',
        address: order.coldStorageAddress
      });

      steps.push({
        label: 'In Cold Storage',
        description: 'Product is safely stored in temperature-controlled environment',
        completed: ['in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        person: order.coldStorageName || 'Cold Storage Team',
        address: order.coldStorageAddress
      });

      steps.push({
        label: 'Dispatched from Cold Storage',
        description: 'Product dispatched from cold storage for final delivery',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedFromColdStorageDate,
        person: order.logisticsName || 'Logistics Team',
        address: order.logisticsAddress
      });
    }

    // Add driver assignment if available
    if (order.driverName) {
      steps.push({
        label: 'Driver Assigned',
        description: 'Driver assigned for delivery',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        person: order.driverName,
        address: order.driverAddress
      });
    }

    // If status is dispatched_to_customer, it means delivered - don't show separate "Out for Delivery" step
    if (order.status !== 'dispatched_to_customer') {
      steps.push({
        label: 'Out for Delivery',
        description: 'Your order is on the way to your address',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedToCustomerDate,
        person: order.driverName || order.logisticsName || 'Delivery Team',
        address: order.buyerAddress
      });
    }

    steps.push({
      label: 'Delivered',
      description: order.status === 'dispatched_to_customer' ? 
        'Order dispatched to customer (Delivered)' : 
        'Order successfully delivered to your address',
      completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
      date: order.status === 'dispatched_to_customer' ? 
        order.dispatchedToCustomerDate : 
        (order as any).deliveredDate,
      person: order.buyerName,
      address: order.buyerAddress
    });

    return steps;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'dispatched_to_coldstorage': return 'info';
      case 'in_coldstorage': return 'primary';
      case 'dispatched_to_customer': return 'success';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleFileComplaint = async () => {
    if (!complaintData.reason || !complaintData.description.trim()) {
      setError('Please fill in all complaint fields');
      return;
    }

    setSubmittingComplaint(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/order/complaint', {
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading order details...</Typography>
      </Box>
    );
  }

  if (error && !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Order not found</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  const steps = getOrderSteps();
  const activeStep = steps.findIndex(step => !step.completed);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Order #{order.orderId}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Placed on {order.date} at {order.time}
            </Typography>
          </Box>
          <Box>
            <Chip 
              label={order.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(order.status) as any}
            />
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {complaintSuccess && <Alert severity="success" sx={{ mb: 2 }}>{complaintSuccess}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Order Progress */}
        <Box sx={{ flex: { xs: 1, md: 2 } }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Progress
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step) => (
                <Step key={step.label} completed={step.completed}>
                  <StepLabel>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {step.label}
                    </Typography>
                    {step.date && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        <AccessTime sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                        {step.date}
                      </Typography>
                    )}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {step.description}
                    </Typography>
                    {step.person && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{step.person}</Typography>
                      </Box>
                    )}
                    {step.address && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{step.address}</Typography>
                      </Box>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Box>

        {/* Order Details Sidebar */}
        <Box sx={{ flex: { xs: 1, md: 1 } }}>
          {/* Product Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Product Details
            </Typography>
            <Typography variant="body1" fontWeight="bold">{order.productName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Quantity: {order.quantity}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unit Price: ₹{order.price.toFixed(2)}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">
              Total: ₹{(order.price * order.quantity).toFixed(2)}
            </Typography>
          </Paper>

          {/* Address Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Addresses
            </Typography>
            <List dense>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><Home /></Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary="Delivery Address"
                  secondary={order.buyerAddress}
                />
              </ListItem>
              
              {order.sellerAddress && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><ShoppingCart /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Seller Address"
                    secondary={order.sellerAddress}
                  />
                </ListItem>
              )}

              {order.logisticsAddress && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><LocalShipping /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Logistics Center"
                    secondary={order.logisticsAddress}
                  />
                </ListItem>
              )}

              {order.coldStorageAddress && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><AcUnit /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Cold Storage"
                    secondary={order.coldStorageAddress}
                  />
                </ListItem>
              )}

              {order.driverAddress && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><DirectionsCar /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Driver Location"
                    secondary={order.driverAddress}
                  />
                </ListItem>
              )}
            </List>
          </Paper>

          {/* Contact Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <List dense>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><Person /></Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={order.sellerName}
                  secondary="Seller"
                />
              </ListItem>
              
              {order.logisticsName && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><LocalShipping /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={order.logisticsName}
                    secondary="Logistics Partner"
                  />
                </ListItem>
              )}

              {order.driverName && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar><DirectionsCar /></Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={order.driverName}
                    secondary="Delivery Driver"
                  />
                </ListItem>
              )}
            </List>
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<ReportProblem />}
              onClick={() => setComplaintDialog(true)}
              disabled={order.status === 'cancelled'}
            >
              File Complaint
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back to Orders
            </Button>
          </Box>
        </Box>
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