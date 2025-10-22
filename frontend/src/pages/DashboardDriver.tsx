import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import { LocalShipping, Assignment, CheckCircle, AcUnit, Person, LocationOn, Phone } from '@mui/icons-material';
import axios from '../api';

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  currentDriverName: string;
  currentDriverPhone: string;
  vehicleType: string;
  capacity: number;
  status: string;
  assignedOrders: string[];
  currentLocation?: string;
  destination?: string;
  assignedDate?: string;
}

interface Order {
  orderId: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  time: string;
  status: string;
  buyerName: string;
  buyerPhone?: string;
  buyerAddress?: string;
  sellerName: string;
}

interface ColdStorageUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

const DashboardDriver: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [dispatchDestination, setDispatchDestination] = useState<'customer' | 'coldstorage'>('customer');
  const [coldStorageUsers, setColdStorageUsers] = useState<ColdStorageUser[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [loadingColdStorage, setLoadingColdStorage] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setError(''); // Clear any previous errors
        
        // Fetch driver data
        await fetchDriverVehicle();
        await fetchDriverOrders();
        
        // Try to fetch cold storage users with a retry mechanism
        try {
          await fetchColdStorageUsers();
        } catch (coldStorageError) {
          console.error("Error fetching cold storage users:", coldStorageError);
          // Don't set error here as fetchColdStorageUsers already handles errors
          // and provides fallback data
        }
      } catch (err: any) {
        console.error("Error initializing data:", err);
        setError(err?.message || 'Failed to load data. Please refresh the page.');
      }
    };
    
    initializeData();
  }, []);

  const fetchDriverVehicle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/logistics/driver/vehicle', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicle(response.data);
    } catch (error) {
      console.error('Failed to fetch driver vehicle:', error);
      setVehicle(null);
    }
  };

  const fetchDriverOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/logistics/driver/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch driver orders:', error);
      setOrders([]);
    }
  };

  const handleDispatch = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/logistics/driver/dispatch', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Vehicle dispatched successfully!');
      setError('');
      fetchDriverVehicle();
      fetchDriverOrders();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to dispatch vehicle');
      setSuccess('');
    }
  };

  const handleDispatchOrder = async () => {
    // Validate cold storage selection if needed
    if (dispatchDestination === 'coldstorage') {
      if (!selectedFacility) {
        setError('Please select a cold storage facility');
        return;
      }
      
      // Ensure we have cold storage users from database
      if (coldStorageUsers.length === 0) {
        setError('No cold storage facilities available. Please ensure cold storage users exist in the database.');
        return;
      }
      
      // Validate that selected facility exists in our list
      const selectedUser = coldStorageUsers.find(user => user._id === selectedFacility);
      if (!selectedUser) {
        setError('Selected cold storage facility is not valid. Please select a valid facility.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      // Create request payload
      const requestData = {
        orderId: selectedOrderId,
        destination: dispatchDestination
      };
      
      // Add cold storage details if that destination is selected
      if (dispatchDestination === 'coldstorage') {
        // Find the selected cold storage user
        const selectedUser = coldStorageUsers.find(user => user._id === selectedFacility);
        
        if (!selectedUser) {
          setError('Selected cold storage facility not found. Please try again.');
          return;
        }
        
        // Add both the ID and name to the request payload
        Object.assign(requestData, { 
          coldStorageId: selectedFacility,
          coldStorageName: selectedUser.name || 'Unknown Cold Storage'
        });
      }
      
      // Send request to API
      await axios.post('/logistics/driver/dispatch-order', requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Get selected cold storage user's name for the success message
      const selectedColdStorage = coldStorageUsers.find(user => user._id === selectedFacility);
      const successMsg = dispatchDestination === 'coldstorage' 
        ? `Order dispatched to cold storage (${selectedColdStorage?.name || 'Unknown'}) successfully!`
        : 'Order dispatched to customer successfully!';
        
      setSuccess(successMsg);
      setError('');
      setDispatchDialog(false);
      setSelectedOrderId('');
      setSelectedFacility('');
      fetchDriverVehicle();
      fetchDriverOrders();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to dispatch order');
      setSuccess('');
    }
  };

  // Fetch cold storage users from database - NO MOCK DATA
  const fetchColdStorageUsers = async () => {
    try {
      setLoadingColdStorage(true);
      setError('');
      console.log('🧊 Fetching cold storage users from database...');
      
      const response = await axios.get('/user/cold-storage-users', {
        timeout: 10000
      });
      
      console.log('🧊 API Response:', response.data);
      
      if (Array.isArray(response.data)) {
        console.log(`🧊 Found ${response.data.length} cold storage users`);
        // Debug: Log each user's address field
        response.data.forEach((user, index) => {
          console.log(`🧊 User ${index + 1}:`, {
            name: user.name,
            address: user.address,
            hasAddress: !!user.address,
            addressType: typeof user.address
          });
        });
        setColdStorageUsers(response.data);
        
        if (response.data.length === 0) {
          setError('No cold storage users found. Click "Create Cold Storage Users" to add some.');
        } else {
          setSuccess(`✅ Loaded ${response.data.length} cold storage users from database`);
        }
      } else {
        setColdStorageUsers([]);
        setError('Invalid response from API');
      }
      
    } catch (error: any) {
      console.error('🧊 Error fetching cold storage users:', error);
      
      if (error.response?.status === 404) {
        setError('❌ Backend API not found. Please start the NestJS server: npm run start:dev');
      } else if (error.code === 'ECONNREFUSED') {
        setError('❌ Cannot connect to backend. Please start the server on http://localhost:3000');
      } else {
        setError(`❌ API Error: ${error.response?.data?.message || error.message}`);
      }
      
      setColdStorageUsers([]);
    } finally {
      setLoadingColdStorage(false);
    }
  };

  const openDispatchDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDispatchDestination('customer');
    setSelectedFacility('');
    setError(''); // Clear any previous errors
    
    // Make sure we have some cold storage users loaded
    if (coldStorageUsers.length === 0) {
      fetchColdStorageUsers();
    }
    
    setDispatchDialog(true);
  };

  const handleSimpleDispatch = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/logistics/driver/dispatch-order', {
        orderId: orderId,
        destination: 'customer' // Default to customer for simple dispatch
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Order dispatched successfully!');
      setError('');
      fetchDriverVehicle();
      fetchDriverOrders();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to dispatch order');
      setSuccess('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'loaded': return 'warning';
      case 'dispatched': return 'info';
      case 'delivered': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Driver Dashboard</Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" color="secondary" onClick={onLogout}>
          Logout
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => fetchColdStorageUsers()}
          disabled={loadingColdStorage}
        >
          {loadingColdStorage ? 'Loading...' : 'Refresh Cold Storage List'}
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={async () => {
            try {
              const response = await axios.get('/user/test', { timeout: 5000 });
              setSuccess(`✅ Backend is running! Available routes: ${response.data.availableRoutes?.join(', ') || 'Multiple endpoints'}`);
            } catch (err: any) {
              if (err.code === 'ECONNREFUSED') {
                setError('❌ Backend server is NOT running. Please run: cd backend && npm run start:dev');
              } else {
                setError(`❌ Backend error: ${err.message}`);
              }
            }
          }}
        >
          Check Backend Status
        </Button>
        
        <Button 
          variant="outlined" 
          color="info"
          onClick={async () => {
            try {
              // Test API connection first
              const testResponse = await axios.get('/user/test');
              console.log('API Test:', testResponse.data);
              
              // Then try to get database health
              const token = localStorage.getItem('token');
              const response = await axios.get('/user/database-health', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const data = response.data;
              setSuccess(
                `✅ API Connected | DB: ${data.databaseHealthy ? 'Healthy' : 'Issues'} | ` +
                `Total Users: ${data.totalUsers} | Cold Storage: ${data.coldStorageUsers} | ` +
                `Available Roles: ${Object.keys(data.roleBreakdown || {}).join(', ')}`
              );
              
              // If we found cold storage users, refresh the list
              if (data.coldStorageUsers > 0) {
                await fetchColdStorageUsers();
              }
            } catch (err: any) {
              console.error('Health check failed:', err);
              setError(`Health check failed: ${err.response?.status || 'Network'} - ${err.response?.data?.message || err.message}`);
            }
          }}
        >
          Test API & Database
        </Button>
        
        <Button 
          variant="outlined" 
          color="warning"
          onClick={async () => {
            try {
              setLoadingColdStorage(true);
              
              // Force creation of cold storage users
              const response = await axios.post('/user/create-cold-storage-users', {}, {
                timeout: 15000
              });
              
              setSuccess(`Created ${response.data.created || 0} cold storage users in database`);
              
              // Refresh the list
              await fetchColdStorageUsers();
            } catch (err: any) {
              setError(`Failed to create cold storage users: ${err.response?.data?.message || err.message}`);
              setLoadingColdStorage(false);
            }
          }}
          disabled={loadingColdStorage}
        >
          Create Cold Storage Users
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {!vehicle ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>No Vehicle Currently Assigned</Typography>
          <Typography variant="body2">
            You don't have a vehicle assigned at the moment. Please contact the logistics team to get assigned to an available vehicle.
          </Typography>
        </Alert>
      ) : (
        <>
          {/* Vehicle Info */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Vehicle</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Vehicle Number</Typography>
                  <Typography variant="h6">{vehicle.vehicleNumber}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Vehicle Type</Typography>
                  <Typography variant="h6">{vehicle.vehicleType}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Capacity</Typography>
                  <Typography variant="h6">{vehicle.capacity} kg</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={vehicle.status.toUpperCase()} 
                    color={getStatusColor(vehicle.status) as any}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Assignment sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6">{orders.length}</Typography>
                      <Typography variant="body2">Assigned Orders</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocalShipping sx={{ mr: 2, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {orders.filter(o => o.status === 'shipped').length}
                      </Typography>
                      <Typography variant="body2">Ready to Dispatch</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircle sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {orders.filter(o => o.status === 'dispatched').length}
                      </Typography>
                      <Typography variant="body2">Dispatched</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Dispatch Button */}
          {vehicle.status === 'loaded' && (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleDispatch}
                startIcon={<LocalShipping />}
              >
                Dispatch Vehicle
              </Button>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Click to mark vehicle as dispatched and update all orders
              </Typography>
            </Box>
          )}

          {/* Orders Table */}
          <Typography variant="h6" gutterBottom>My Orders</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Total Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>{order.orderId}</TableCell>
                      <TableCell>{order.productName}</TableCell>
                      <TableCell>{order.buyerName}</TableCell>
                      <TableCell>{order.sellerName}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>₹{(order.price * order.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status.toUpperCase().replace(/_/g, ' ')} 
                          color={
                            order.status === 'pending' ? 'warning' :
                            order.status === 'shipped' ? 'info' :
                            order.status.includes('dispatched') ? 'success' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>
                        {/* Show dispatch buttons for orders that are ready to be dispatched by driver */}
                        {(order.status === 'shipped' || order.status === 'shippedtologistics') && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleSimpleDispatch(order.orderId)}
                              startIcon={<CheckCircle />}
                            >
                              Dispatch
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              onClick={() => openDispatchDialog(order.orderId)}
                              startIcon={<LocalShipping />}
                            >
                              Dispatch To...
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="textSecondary">No orders assigned</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Dispatch Dialog */}
          <Dialog open={dispatchDialog} onClose={() => setDispatchDialog(false)}>
            <DialogTitle>Dispatch Order</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Destination</InputLabel>
                  <Select
                    value={dispatchDestination}
                    onChange={(e) => {
                      setDispatchDestination(e.target.value as 'customer' | 'coldstorage');
                      // Reset selected facility when switching destination types
                      if (e.target.value !== 'coldstorage') {
                        setSelectedFacility('');
                      }
                    }}
                    label="Destination"
                  >
                    <MenuItem value="customer">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ mr: 1 }} />
                        Direct to Customer
                      </Box>
                    </MenuItem>
                    <MenuItem value="coldstorage">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AcUnit sx={{ mr: 1 }} />
                        Cold Storage Facility
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                {/* Conditional Facility Selection */}
                {dispatchDestination === 'coldstorage' && (
                  <>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select Cold Storage</InputLabel>
                      <Select
                        value={selectedFacility}
                        onChange={(e) => setSelectedFacility(e.target.value as string)}
                        label="Select Cold Storage"
                        required
                        disabled={loadingColdStorage}
                      >
                        {loadingColdStorage ? (
                          <MenuItem disabled>Loading cold storage facilities...</MenuItem>
                        ) : coldStorageUsers && coldStorageUsers.length > 0 ? (
                          coldStorageUsers.map(user => (
                            <MenuItem key={user._id} value={user._id}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                  {user.name}
                                </Typography>
                                {user.phone && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    📞 {user.phone}
                                  </Typography>
                                )}
                                {user.address && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationOn sx={{ fontSize: 14, color: 'primary.main' }} />
                                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                                      {user.address}
                                    </Typography>
                                  </Box>
                                )}
                                {!user.address && (
                                  <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                    No address provided
                                  </Typography>
                                )}
                              </Box>
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AcUnit sx={{ mr: 1, color: 'error.main' }} />
                              No cold storage facilities found
                            </Box>
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                    
                    {!loadingColdStorage && coldStorageUsers && coldStorageUsers.length === 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Button 
                          onClick={fetchColdStorageUsers} 
                          variant="outlined" 
                          size="small"
                          startIcon={<AcUnit />}
                        >
                          Refresh Cold Storage List
                        </Button>
                      </Box>
                    )}
                  </>
                )}
                
                {/* Destination Information Card */}
                {dispatchDestination === 'customer' && (
                  <Card sx={{ mt: 2, border: '2px solid', borderColor: 'success.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Person sx={{ color: 'success.main' }} />
                        <Typography variant="h6" color="success.main">
                          Customer Delivery Details
                        </Typography>
                      </Box>
                      {(() => {
                        const selectedOrder = orders.find(o => o.orderId === selectedOrderId);
                        return selectedOrder ? (
                          <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Customer Name:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {selectedOrder.buyerName}
                                </Typography>
                              </Box>
                              {selectedOrder.buyerPhone && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">Phone:</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Phone sx={{ fontSize: 16, color: 'success.main' }} />
                                    <Typography variant="body1">{selectedOrder.buyerPhone}</Typography>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                            {selectedOrder.buyerAddress ? (
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <LocationOn sx={{ fontSize: 18, color: 'success.main' }} />
                                  <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                                    Delivery Address:
                                  </Typography>
                                </Box>
                                <Typography variant="body1" sx={{ 
                                  p: 2.5, 
                                  bgcolor: 'success.light', 
                                  color: 'success.contrastText',
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: '1rem',
                                  lineHeight: 1.4
                                }}>
                                  🏠 {selectedOrder.buyerAddress}
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ 
                                p: 2, 
                                bgcolor: 'warning.light', 
                                borderRadius: 1,
                                textAlign: 'center'
                              }}>
                                <Typography variant="body2" color="warning.contrastText" sx={{ fontWeight: 500 }}>
                                  ⚠️ Customer address not available
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Select an order to see customer details
                          </Typography>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {dispatchDestination === 'coldstorage' && selectedFacility && (
                  <Card sx={{ mt: 2, border: '2px solid', borderColor: 'info.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <AcUnit sx={{ color: 'info.main' }} />
                        <Typography variant="h6" color="info.main">
                          Cold Storage Facility Details
                        </Typography>
                      </Box>
                      {(() => {
                        const selectedColdStorage = coldStorageUsers.find(user => user._id === selectedFacility);
                        return selectedColdStorage ? (
                          <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Facility Name:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {selectedColdStorage.name}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Email:</Typography>
                                <Typography variant="body1">{selectedColdStorage.email}</Typography>
                              </Box>
                              {selectedColdStorage.phone && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary">Phone:</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Phone sx={{ fontSize: 16, color: 'info.main' }} />
                                    <Typography variant="body1">{selectedColdStorage.phone}</Typography>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                            {selectedColdStorage.address ? (
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <LocationOn sx={{ fontSize: 18, color: 'info.main' }} />
                                  <Typography variant="body1" color="info.main" sx={{ fontWeight: 600 }}>
                                    Cold Storage Address:
                                  </Typography>
                                </Box>
                                <Typography variant="body1" sx={{ 
                                  p: 2.5, 
                                  bgcolor: 'info.light', 
                                  color: 'info.contrastText',
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: '1rem',
                                  lineHeight: 1.4
                                }}>
                                  🏢 {selectedColdStorage.address}
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ 
                                p: 2, 
                                bgcolor: 'warning.light', 
                                borderRadius: 1,
                                textAlign: 'center'
                              }}>
                                <Typography variant="body2" color="warning.contrastText" sx={{ fontWeight: 500 }}>
                                  ⚠️ Cold storage address not available
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ) : null;
                      })()}
                    </CardContent>
                  </Card>
                )}

                {dispatchDestination === 'coldstorage' && !selectedFacility && (
                  <Box sx={{ 
                    mt: 2,
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    textAlign: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Please select a cold storage facility to see delivery details
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDispatchDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleDispatchOrder} 
                variant="contained" 
                color="primary"
                disabled={dispatchDestination === 'coldstorage' && !selectedFacility}
              >
                Dispatch Order
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default DashboardDriver;