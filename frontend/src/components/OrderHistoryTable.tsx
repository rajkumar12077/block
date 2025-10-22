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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent
} from '@mui/material';
import { 
  Visibility, 
  LocalShipping, 
  Person, 
  LocationOn
} from '@mui/icons-material';
import axios from '../api';
import SellerComplaintForm from './SellerComplaintForm';

interface OrderHistoryItem {
  orderId: string;
  productId?: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  time: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress?: string;
  buyerPhone?: string;
  status: string;
  deliveryDate?: string;
  expectedDelivery?: string;
}

interface LogisticsProvider {
  _id: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
  companyName?: string;
}

interface OrderHistoryTableProps {
  onOrderDispatch?: () => void;
}

const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({ onOrderDispatch }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedLogisticsId, setSelectedLogisticsId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryItem | null>(null);
  const [logisticsProviders, setLogisticsProviders] = useState<LogisticsProvider[]>([]);
  const [, setLogisticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('📋 Fetching seller orders from /order/seller-orders');
        const response = await axios.get('/order/seller-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('📋 Orders response:', response.data);
        
        // Check if orders have buyer address
        if (response.data.length > 0) {
          const firstOrder = response.data[0];
          console.log('📋 First order buyer info:', {
            buyerName: firstOrder.buyerName,
            buyerEmail: firstOrder.buyerEmail,
            buyerAddress: firstOrder.buyerAddress,
            buyerPhone: firstOrder.buyerPhone
          });
        }
        
        setOrders(response.data);
        console.log(`📋 Set ${response.data.length} orders`);
      }
    } catch (error) {
      console.error('📋 Failed to fetch orders:', error);
    }
  };

  const fetchLogisticsProviders = async () => {
    try {
      setLogisticsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('📦 No authentication token found');
        setError('Authentication required. Please log in again.');
        return;
      }

      console.log('📦 Fetching logistics providers from /user/logistics-providers');
      console.log('📦 Using token:', token.substring(0, 20) + '...');
      
      const response = await axios.get('/user/logistics-providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📦 Logistics providers response status:', response.status);
      console.log('📦 Logistics providers response:', response.data);
      
      if (Array.isArray(response.data)) {
        setLogisticsProviders(response.data);
        console.log(`📦 Successfully set ${response.data.length} logistics providers`);
        
        if (response.data.length === 0) {
          setError('No logistics providers found in the system. Please contact an administrator.');
        }
      } else {
        console.error('📦 Response is not an array:', typeof response.data);
        setError('Invalid response format from server.');
      }
    } catch (error: any) {
      console.error('📦 Failed to fetch logistics providers:', error);
      
      if (error.response) {
        console.error('📦 Error response status:', error.response.status);
        console.error('📦 Error response data:', error.response.data);
        
        if (error.response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (error.response.status === 403) {
          setError('Access denied. You may not have permission to view logistics providers.');
        } else {
          setError(`Server error: ${error.response.data?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('📦 No response received:', error.request);
        setError('No response from server. Please check your connection.');
      } else {
        console.error('📦 Request setup error:', error.message);
        setError(`Request error: ${error.message}`);
      }
    } finally {
      setLogisticsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchLogisticsProviders();
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
      fetchOrders();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to cancel order');
    }
  };



  const handleDispatchToLogistics = async () => {
    try {
      if (!selectedLogisticsId) {
        setError('Please select a logistics provider');
        return;
      }

      const token = localStorage.getItem('token');
      const dispatchData = {
        orderId: selectedOrderId,
        logisticsId: selectedLogisticsId,
        deliveryDestination: 'customer' // Always dispatch directly to customer
      };
      
      console.log('=== FRONTEND DISPATCH DEBUG ===');
      console.log('Order ID:', selectedOrderId);
      console.log('Logistics ID:', selectedLogisticsId);
      console.log('Delivery Destination:', dispatchData.deliveryDestination);
      console.log('=== END FRONTEND DEBUG ===');
      
      const response = await axios.post('/order/dispatch-to-logistics', dispatchData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('=== DISPATCH RESPONSE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      console.log('=== END RESPONSE DEBUG ===');
      
      setSuccess('Order successfully dispatched to logistics provider!');
      setDispatchDialog(false);
      setSelectedOrderId('');
      setSelectedLogisticsId('');
      fetchOrders(); // Refresh orders to update status
      onOrderDispatch?.(); // Notify parent component
    } catch (error: any) {
      console.error('Failed to dispatch to logistics:', error);
      setError('Failed to dispatch order: ' + (error.response?.data?.message || error.message));
    }
  };

  // Removed unused function: isDeliveryWithinOneDay

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'shippedtologistics': return 'info'; // Added status for dispatched to logistics
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
      // case 'confirmed':
      //   return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
        return 'Pending';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'shippedtologistics':
        return 'Shipped to Logistics';
      default:
        // Fallback: convert underscores to spaces and capitalize
        return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
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
        <Typography variant="h6">Order History</Typography>
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
                    label={getDisplayStatus(order.status)} 
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
                    <Typography variant="body2" color="text.secondary">Price</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
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
                    <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                      {order.date} {order.time}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Buyer</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {order.buyerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {order.buyerEmail}
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
                    View Details
                  </Button>
                  
                  {order.status === 'pending' && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<LocalShipping />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.orderId);
                        setError('');
                        setSuccess('');
                        setSelectedLogisticsId(''); // Reset logistics selection
                        setDispatchDialog(true);
                      }}
                      sx={{ flex: 1 }}
                    >
                      Dispatch
                    </Button>
                  )}
                </Box>

                {order.status === 'pending' && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.orderId);
                        setError('');
                        setSuccess('');
                        setCancelDialog(true);
                      }}
                    >
                      Cancel Order
                    </Button>
                  </Box>
                )}

                {(['dispatched_to_customer', 'delivered'].includes(order.status)) && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(order.orderId);
                        setSelectedOrder(order);
                        setError('');
                        setSuccess('');
                        setReportDialog(true);
                      }}
                    >
                      Report Issue
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">No orders found</Typography>
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

      {/* Report Product Dialog using SellerComplaintForm component */}
      <SellerComplaintForm
        open={reportDialog}
        onClose={() => setReportDialog(false)}
        order={selectedOrder}
        onSuccess={(message) => {
          setSuccess(message);
          fetchOrders(); // Refresh orders after successful complaint submission
        }}
        onError={(message) => setError(message)}
      />

      {/* Dispatch to Logistics Dialog */}
      <Dialog open={dispatchDialog} onClose={() => {
        setDispatchDialog(false);
        setSelectedLogisticsId('');
        setSelectedOrderId('');
      }} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShipping />
            <Typography variant="h6">Dispatch Order to Logistics</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Order Details */}
          {(() => {
            const selectedOrder = orders.find(o => o.orderId === selectedOrderId);
            return selectedOrder ? (
              <Box sx={{ mb: 3 }}>
                <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Order & Buyer Information
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Order ID:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedOrder.orderId}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Product:</Typography>
                        <Typography variant="body1">{selectedOrder.productName}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Quantity:</Typography>
                        <Typography variant="body1">{selectedOrder.quantity}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Buyer:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedOrder.buyerName}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedOrder.buyerEmail}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Delivery Address:
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 1, 
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        {selectedOrder.buyerName}<br />
                        {selectedOrder.buyerAddress || 'Address not available'}<br />
                        {selectedOrder.buyerPhone && (
                          <>Phone: {selectedOrder.buyerPhone}</>
                        )}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ) : null;
          })()}
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Logistics Provider</InputLabel>
            <Select
              value={selectedLogisticsId}
              onChange={(e) => setSelectedLogisticsId(e.target.value as string)}
              label="Select Logistics Provider"
            >
              {logisticsProviders.map((provider) => (
                <MenuItem key={provider._id} value={provider._id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {provider.companyName || provider.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📧 {provider.email}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn sx={{ fontSize: 14, color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                        {provider.address}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {logisticsProviders.length === 0 && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                No logistics providers available. Please ensure logistics users exist in the system.
                <br />
                <Button 
                  size="small" 
                  onClick={fetchLogisticsProviders}
                  sx={{ mt: 1 }}
                >
                  Retry Loading Providers
                </Button>
              </Typography>
            )}
          </FormControl>

          {selectedLogisticsId && (
            <Card sx={{ mt: 2, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocalShipping sx={{ color: 'primary.main' }} />
                  <Typography variant="h6">
                    Selected Logistics Provider
                  </Typography>
                </Box>
                {(() => {
                  const selectedProvider = logisticsProviders.find(p => p._id === selectedLogisticsId);
                  if (!selectedProvider) return null;
                  
                  return (
                    <>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Company/Name:</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {selectedProvider.companyName || selectedProvider.name}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Email:</Typography>
                          <Typography variant="body1">{selectedProvider.email}</Typography>
                        </Box>
                        {selectedProvider.phone && (
                          <Box>
                            <Typography variant="body2" color="text.secondary">Phone:</Typography>
                            <Typography variant="body1">{selectedProvider.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                      
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationOn sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>
                            Logistics Hub Address:
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ 
                          p: 2.5, 
                          bgcolor: 'primary.light', 
                          color: 'primary.contrastText',
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: '1rem',
                          lineHeight: 1.4
                        }}>
                          📍 {selectedProvider.address}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Delivery Options
                        </Typography>
                        
                        <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                          <Typography variant="body1" color="info.dark" sx={{ fontWeight: 600 }}>
                            🚚 Direct Delivery
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Order will be dispatched directly to the customer
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {logisticsProviders.length === 0 && (
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <LocalShipping sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary" variant="h6" gutterBottom>
                  No Logistics Providers Available
                </Typography>
                <Typography color="text.secondary">
                  Please contact an administrator to add logistics providers to the system.
                </Typography>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setDispatchDialog(false);
              setSelectedLogisticsId('');
              setSelectedOrderId('');
            }}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDispatchToLogistics} 
            color="primary" 
            variant="contained"
            disabled={!selectedLogisticsId}
            size="large"
            startIcon={<LocalShipping />}
          >
            Dispatch to Logistics
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderHistoryTable;