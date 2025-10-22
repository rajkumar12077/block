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
  Card,
  CardContent,
  Grid,
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
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
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
  Email,
  Phone,
  ReportProblem
} from '@mui/icons-material';
import axios from 'axios';

// Create completely isolated axios instance for direct backend communication
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use((config: any) => {
  console.log('Making request to:', config.baseURL + config.url);
  console.log('Request config:', config);
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response: any) => {
    console.log('Response received:', response.status, response.data);
    return response;
  },
  (error: any) => {
    console.error('Response error:', error.response?.status, error.response?.data);
    console.error('Error URL:', error.config?.url);
    return Promise.reject(error);
  }
);

interface OrderDetails {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  status: string;
  date: string;
  time: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string;
  sellerName: string;
  sellerAddress?: string;
  logisticsName?: string;
  logisticsAddress?: string;
  coldStorageName?: string;
  coldStorageAddress?: string;
  driverName?: string;
  driverAddress?: string;
  dispatchedToColdStorageDate?: string;
  dispatchedFromColdStorageDate?: string;
  dispatchedToCustomerDate?: string;
  deliveryDestination: string;
  deliveredDate?: string;
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
  const [order, setOrder] = useState<OrderDetails | null>(null);
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

  // Test backend connectivity using direct fetch
  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection with fetch...');
      const response = await fetch('http://localhost:3000/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      console.log('Backend connection test - status:', response.status);
      return response.status < 500; // Accept any response that's not a server error
    } catch (error) {
      console.error('Backend completely unreachable:', error);
      return false;
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:3000/order/track/${orderId}`;
      console.log('Fetching order details from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const orderData = await response.json();
      console.log('Order data received:', orderData);
      setOrder(orderData);
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      setError(err.message || 'Failed to fetch order details');
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
        order.deliveredDate,
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
      case 'dispatched_to_customer': return 'success'; // Changed to success since it means delivered
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // Helper function to convert order status to display-friendly format
  const getDisplayStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'dispatched_to_customer':
      case 'dispatched to customer':
        return 'Delivered';
      case 'dispatched_to_coldstorage':
      case 'dispatched to cold storage':
        return 'Dispatched to Cold Storage';
      case 'in_coldstorage':
      case 'in cold storage':
        return 'In Cold Storage';
      case 'in_transit':
      case 'in transit':
        return 'In Transit';
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
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        // Fallback: convert underscores to spaces and capitalize
        return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
    }
  };

  const handleFileComplaint = async () => {
    console.log('=== Starting complaint submission ===');
    console.log('Filing complaint with data:', complaintData);
    console.log('Reason valid:', !!complaintData.reason);
    console.log('Description valid:', !!complaintData.description.trim());
    
    if (!complaintData.reason || !complaintData.description.trim()) {
      const errorMsg = 'Please fill in all complaint fields';
      console.error('Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    setError(''); // Clear any previous errors
    setSubmittingComplaint(true);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token);
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
      console.log('Order data:', order);
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      // Ensure we have all required fields
      if (!order?.orderId) {
        throw new Error('Order ID is missing');
      }
      
      if (!order?.productId) {
        console.warn('Product ID is missing from order data');
      }

      const complaintPayload = {
        orderId: order.orderId,
        productId: order.productId || 'unknown',
        productName: order.productName || 'Unknown Product',
        quantity: order.quantity || 1,
        price: order.price || 0,
        complaintReason: complaintData.reason,
        description: complaintData.description,
        orderDate: order.date,
        dispatchDate: order.dispatchedToCustomerDate || order.date
      };
      
      console.log('Sending complaint payload:', complaintPayload);
      
      // Use direct fetch instead of axios to avoid any configuration conflicts
      const url = 'http://localhost:3000/order/complaint';
      console.log('Making direct fetch request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(complaintPayload),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Complaint response:', responseData);

      setComplaintSuccess('Complaint filed successfully! You can track its status in your dashboard.');
      setComplaintDialog(false);
      setComplaintData({ reason: '', description: '' });
    } catch (err: any) {
      console.error('Complaint submission error:', err);
      console.error('Full error:', err);
      
      let errorMessage = 'Failed to file complaint';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to backend server. Please check if it is running on http://localhost:3000';
      } else if (err.message.includes('HTTP 404')) {
        errorMessage = 'API endpoint not found. Please check if the backend server is running.';
      } else if (err.message.includes('HTTP 401')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" gutterBottom>
              Order #{order.orderId}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Placed on {order.date} at {order.time}
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              label={getDisplayStatus(order.status)}
              color={getStatusColor(order.status) as any}
              size="large"
            />
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {complaintSuccess && <Alert severity="success" sx={{ mb: 2 }}>{complaintSuccess}</Alert>}

      <Grid container spacing={3}>
        {/* Order Progress */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Progress
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
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
        </Grid>

        {/* Order Details Sidebar */}
        <Grid item xs={12} md={4}>
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
              Unit Price: ${order.price.toFixed(2)}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">
              Total: ${(order.price * order.quantity).toFixed(2)}
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
              onClick={() => {
                console.log('File Complaint button clicked');
                setComplaintDialog(true);
              }}
              disabled={order.status === 'cancelled'}
            >
              File Complaint
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back to Orders
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>File a Complaint</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Complaint Reason"
            value={complaintData.reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComplaintData({...complaintData, reason: e.target.value})}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComplaintData({...complaintData, description: e.target.value})}
            fullWidth
            margin="normal"
            required
            placeholder="Please describe your issue in detail..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Cancel</Button>
          <Button 
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              console.log('Submit complaint button clicked');
              console.log('Button disabled?', submittingComplaint);
              console.log('Complaint data before submit:', complaintData);
              console.log('Form is valid?', complaintData.reason && complaintData.description.trim());
              handleFileComplaint();
            }}
            variant="contained"
            disabled={submittingComplaint || !complaintData.reason || !complaintData.description.trim()}
            color="warning"
            type="button"
          >
            {submittingComplaint ? 'Filing...' : 'FILE COMPLAINT'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewOrderedProduct;