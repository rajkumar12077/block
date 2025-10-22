import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip
} from '@mui/material';
import {
  ShoppingCart,
  LocalShipping,
  AcUnit,
  DirectionsCar,
  Person,
  LocationOn,
  AccessTime,
  ReportProblem,
  Phone,
  Email
} from '@mui/icons-material';
import axios from '../api';

interface OrderTracking {
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  status: string;
  date: string;
  time: string;
  
  // Buyer Information
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string;
  buyerPhone?: string;
  
  // Seller Information
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  
  // Logistics Information
  logisticsId?: string;
  logisticsName?: string;
  logisticsEmail?: string;
  logisticsAddress?: string;
  logisticsPhone?: string;
  logisticsCompany?: string;
  
  // Cold Storage Information
  coldStorageId?: string;
  coldStorageName?: string;
  coldStorageEmail?: string;
  coldStorageAddress?: string;
  coldStoragePhone?: string;
  
  // Driver Information
  driverId?: string;
  driverName?: string;
  driverEmail?: string;
  driverAddress?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  
  // Tracking Dates with detailed information
  orderPlacedDate?: string;
  dispatchedToLogisticsDate?: string;
  dispatchedToColdStorageDate?: string;
  arrivedAtColdStorageDate?: string;
  dispatchedFromColdStorageDate?: string;
  assignedToDriverDate?: string;
  dispatchedToCustomerDate?: string;
  deliveredDate?: string;
  
  // Delivery destination and tracking
  deliveryDestination: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  
  // Current location tracking
  currentLocation?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
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

const EnhancedViewOrderedProduct: React.FC = () => {
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
    'Poor service',
    'Other'
  ];

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('You must be logged in to view order details');
        setLoading(false);
        return;
      }
      
      console.log(`Fetching order details for ID: ${orderId}`);
      const response = await axios.get(`/order/track/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Order data received:', response.data);
      setOrder(response.data);
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      
      // Handle specific error cases
      if (err.response) {
        // The request was made and the server responded with an error status
        console.error('Server error response:', err.response.data);
        console.error('Status code:', err.response.status);
        
        if (err.response.status === 401) {
          setError('Authentication expired. Please log in again.');
        } else if (err.response.status === 403) {
          setError('You do not have permission to view this order.');
        } else if (err.response.status === 404) {
          setError('Order not found. It may have been deleted or the ID is incorrect.');
        } else {
          setError(err.response.data?.message || 'Failed to fetch order details');
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        setError('Server did not respond. Please check your connection and try again.');
      } else {
        // Something happened in setting up the request
        console.error('Error setting up request:', err.message);
        setError('An error occurred while fetching order details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'dispatched_to_coldstorage': return 'info';
      case 'in_coldstorage': return 'default';
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

  const getOrderSteps = (): StatusStep[] => {
    if (!order) return [];

    const steps: StatusStep[] = [
      {
        label: 'Order Placed',
        description: `Order confirmed by ${order.buyerName}`,
        completed: true,
        date: order.orderPlacedDate || `${order.date} ${order.time}`,
        person: order.buyerName,
        address: order.buyerAddress
      }
    ];

    // Add seller confirmation step
    steps.push({
      label: 'Order Confirmed by Seller',
      description: `${order.sellerName} confirmed the order`,
      completed: ['shipped', 'dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
      person: order.sellerName,
      address: order.sellerAddress
    });

    // Add logistics steps if logistics is involved
    if (order.logisticsName || order.status === 'shipped') {
      steps.push({
        label: 'Dispatched to Logistics',
        description: order.logisticsName ? `Handed over to ${order.logisticsName}` : 'Dispatched to logistics partner',
        completed: ['shipped', 'dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedToLogisticsDate,
        person: order.logisticsName,
        address: order.logisticsAddress
      });
    }

    // Add cold storage steps if applicable
    if (order.deliveryDestination === 'coldstorage' || order.coldStorageName || ['dispatched_to_coldstorage', 'in_coldstorage'].includes(order.status)) {
      steps.push({
        label: 'Dispatched to Cold Storage',
        description: order.coldStorageName ? `Sent to ${order.coldStorageName}` : 'Dispatched to cold storage facility',
        completed: ['dispatched_to_coldstorage', 'in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedToColdStorageDate,
        person: order.coldStorageName,
        address: order.coldStorageAddress
      });

      steps.push({
        label: 'Arrived at Cold Storage',
        description: 'Product stored in cold storage facility',
        completed: ['in_coldstorage', 'dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.arrivedAtColdStorageDate,
        location: order.coldStorageAddress
      });

      steps.push({
        label: 'Dispatched from Cold Storage',
        description: 'Product dispatched from cold storage for delivery',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedFromColdStorageDate,
        person: order.driverName,
        address: order.coldStorageAddress
      });
    }

    // Add driver assignment step
    if (order.driverName || order.assignedToDriverDate) {
      steps.push({
        label: 'Assigned to Driver',
        description: order.driverName ? `Assigned to driver ${order.driverName}` : 'Assigned to delivery driver',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.assignedToDriverDate,
        person: order.driverName,
        address: order.driverAddress
      });
    }

    // Final delivery step
    // If status is dispatched_to_customer, it means delivered - don't show separate "Out for Delivery" step
    if (order.status !== 'dispatched_to_customer') {
      steps.push({
        label: 'Out for Delivery',
        description: 'Product is out for final delivery',
        completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
        date: order.dispatchedToCustomerDate,
        person: order.driverName,
        location: 'En route to delivery address'
      });
    }

    steps.push({
      label: 'Delivered',
      description: order.status === 'dispatched_to_customer' ? 
        'Product dispatched to customer (Delivered)' : 
        'Product delivered to customer',
      completed: ['dispatched_to_customer', 'delivered'].includes(order.status),
      date: order.status === 'dispatched_to_customer' ? 
        order.dispatchedToCustomerDate : 
        order.deliveredDate,
      address: order.buyerAddress
    });

    return steps;
  };

  const handleComplaint = async () => {
    if (!complaintData.reason || !complaintData.description.trim()) {
      return;
    }

    setSubmittingComplaint(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/order/complaint', {
        orderId: order?.orderId,
        complaintReason: complaintData.reason,
        description: complaintData.description,
        productId: order?.productId,
        productName: order?.productName,
        quantity: order?.quantity,
        price: order?.price,
        orderDate: order?.date,
        dispatchDate: order?.dispatchedToCustomerDate || order?.date
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setComplaintSuccess('Complaint filed successfully. We will investigate and get back to you.');
      setComplaintDialog(false);
      setComplaintData({ reason: '', description: '' });
    } catch (err: any) {
      console.error('Failed to file complaint:', err);
      setError('Failed to file complaint: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderAddressCard = (title: string, icon: React.ReactNode, person: string, email?: string, phone?: string, address?: string, extraInfo?: React.ReactNode) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
          {person}
        </Typography>
        {email && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {email}
            </Typography>
          </Box>
        )}
        {phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {phone}
            </Typography>
          </Box>
        )}
        {address && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.5 }} />
            <Typography variant="body2">
              {address}
            </Typography>
          </Box>
        )}
        {extraInfo}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Loading Order Details</Typography>
        
        {/* Loading animation */}
        <Box sx={{ mb: 4 }}>
          <Card sx={{ p: 3, mb: 2, bgcolor: '#f9f9f9' }}>
            <Box sx={{ height: 12, bgcolor: '#eaeaea', width: '70%', mb: 2, borderRadius: 1 }} />
            <Box sx={{ height: 12, bgcolor: '#eaeaea', width: '40%', mb: 2, borderRadius: 1 }} />
            <Box sx={{ height: 12, bgcolor: '#eaeaea', width: '60%', borderRadius: 1 }} />
          </Card>
          
          <Card sx={{ p: 3, mb: 2, bgcolor: '#f9f9f9' }}>
            <Box sx={{ height: 12, bgcolor: '#eaeaea', width: '80%', mb: 2, borderRadius: 1 }} />
            <Box sx={{ height: 12, bgcolor: '#eaeaea', width: '50%', borderRadius: 1 }} />
          </Card>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Box sx={{ 
              width: 24, 
              height: 24, 
              borderRadius: '50%', 
              bgcolor: 'primary.main',
              animation: 'pulse 1.5s infinite ease-in-out',
              '@keyframes pulse': {
                '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                '50%': { transform: 'scale(1)', opacity: 1 },
                '100%': { transform: 'scale(0.8)', opacity: 0.5 }
              }
            }} />
          </Box>
        </Box>
        
        <Typography color="text.secondary">Fetching all tracking details for this order...</Typography>
      </Box>
    );
  }

  if (error && !order) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
        <Card sx={{ p: 4, borderTop: '4px solid #f44336', borderRadius: '8px' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Unable to Load Order
          </Typography>
          
          <Typography sx={{ my: 3, color: 'text.secondary' }}>
            {error}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back to Orders
            </Button>
            <Button variant="contained" onClick={fetchOrderDetails}>
              Try Again
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
        <Card sx={{ p: 4, borderTop: '4px solid #ff9800', borderRadius: '8px' }}>
          <Typography variant="h5" color="warning.main" gutterBottom>
            Order Not Found
          </Typography>
          
          <Typography sx={{ my: 3, color: 'text.secondary' }}>
            The order you're looking for could not be found. It may have been deleted or the ID is incorrect.
          </Typography>
          
          <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
            Back to Orders
          </Button>
        </Card>
      </Box>
    );
  }

  const steps = getOrderSteps();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Success/Error Messages */}
      {complaintSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setComplaintSuccess('')}>
          {complaintSuccess}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Order #{order.orderId}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {order.productName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Quantity: {order.quantity} • Placed on {order.date} at {order.time}
              </Typography>
            </Box>
            <Chip 
              label={getDisplayStatus(order.status)} 
              color={getStatusColor(order.status) as any}
              sx={{ fontSize: '0.9rem', px: 2, py: 1 }}
            />
          </Box>
          
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Total: {formatCurrency(order.totalAmount)}
          </Typography>
        </CardContent>
      </Card>

      {/* Address Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2, mb: 3 }}>
        {/* Buyer Address */}
        {renderAddressCard(
          'Delivery Address',
          <Person sx={{ color: 'primary.main' }} />,
          order.buyerName,
          order.buyerEmail,
          order.buyerPhone,
          order.buyerAddress
        )}

        {/* Seller Address */}
        {renderAddressCard(
          'Seller Information',
          <ShoppingCart sx={{ color: 'success.main' }} />,
          order.sellerName,
          order.sellerEmail,
          order.sellerPhone,
          order.sellerAddress
        )}

        {/* Logistics Address */}
        {order.logisticsName && renderAddressCard(
          'Logistics Partner',
          <LocalShipping sx={{ color: 'info.main' }} />,
          order.logisticsCompany || order.logisticsName,
          order.logisticsEmail,
          order.logisticsPhone,
          order.logisticsAddress,
          order.trackingNumber && (
            <Typography variant="body2" sx={{ 
              mt: 1, 
              p: 1, 
              bgcolor: 'info.light', 
              borderRadius: 1,
              fontWeight: 500
            }}>
              Tracking: {order.trackingNumber}
            </Typography>
          )
        )}

        {/* Driver Information */}
        {order.driverName && renderAddressCard(
          'Assigned Driver',
          <DirectionsCar sx={{ color: 'warning.main' }} />,
          order.driverName,
          order.driverEmail,
          order.driverPhone,
          order.driverAddress,
          order.vehicleNumber && (
            <Typography variant="body2" sx={{ 
              mt: 1,
              p: 1,
              bgcolor: 'warning.light',
              borderRadius: 1,
              fontWeight: 500
            }}>
              Vehicle: {order.vehicleNumber}
            </Typography>
          )
        )}

        {/* Cold Storage Information */}
        {order.coldStorageName && renderAddressCard(
          'Cold Storage Facility',
          <AcUnit sx={{ color: 'primary.main' }} />,
          order.coldStorageName,
          order.coldStorageEmail,
          order.coldStoragePhone,
          order.coldStorageAddress
        )}
      </Box>

      {/* Current Status & Location */}
      {order.currentLocation && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTime sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'primary.main' }}>
                Current Status
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              📍 {order.currentLocation}
            </Typography>
            {order.lastUpdatedBy && order.lastUpdatedAt && (
              <Typography variant="body2" color="text.secondary">
                Last updated by {order.lastUpdatedBy} on {order.lastUpdatedAt}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tracking Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Order Journey</Typography>
          <Stepper orientation="vertical">
            {steps.map((step, index) => (
              <Step key={index} active={step.completed}>
                <StepLabel>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={step.completed ? 'bold' : 'normal'}>
                        {step.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                      {step.person && (
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                          👤 {step.person}
                        </Typography>
                      )}
                      {step.address && (
                        <Typography variant="body2" color="text.secondary">
                          📍 {step.address}
                        </Typography>
                      )}
                    </Box>
                    {step.date && (
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'fit-content', ml: 2 }}>
                        {step.date}
                      </Typography>
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  {step.location && step.location !== step.address && (
                    <Typography variant="body2" color="text.secondary">
                      📍 {step.location}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {/* Only show File Complaint button for dispatched orders */}
        {(['dispatched_to_customer', 'delivered'].includes(order.status)) && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<ReportProblem />}
            onClick={() => setComplaintDialog(true)}
          >
            File Complaint
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Back to Orders
        </Button>
      </Box>

      {/* Complaint Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>File Complaint</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            File a complaint for order #{order.orderId}
          </Typography>
          
          <TextField
            select
            fullWidth
            label="Complaint Reason"
            value={complaintData.reason}
            onChange={(e) => setComplaintData({ ...complaintData, reason: e.target.value })}
            margin="normal"
          >
            {complaintReasons.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            placeholder="Please describe the issue in detail..."
            value={complaintData.description}
            onChange={(e) => setComplaintData({ ...complaintData, description: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleComplaint} 
            variant="contained" 
            color="warning"
            disabled={!complaintData.reason || !complaintData.description.trim() || submittingComplaint}
          >
            {submittingComplaint ? 'Filing...' : 'File Complaint'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedViewOrderedProduct;