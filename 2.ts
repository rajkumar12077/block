import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
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
  Card,
  CardContent,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import { AcUnit, Assignment, LocalShipping, LocationOn, Phone } from '@mui/icons-material';
import axios from '../api';

interface Order {
  orderId: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  time: string;
  status: string;
  buyerName: string;
  sellerName: string;
  deliveryDestination: string;
  dispatchedToColdStorageDate?: string;
  dispatchedFromColdStorageDate?: string;
  coldStorageId?: string;
  coldStorageName?: string;
}

interface TemperatureData {
  orderId: string;
  productId: string;
  productName: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  sellerId?: string;
  buyerId?: string;
  coldStorageId?: string;
}

interface LogisticsUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

const DashboardColdStorage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Dispatch to logistics dialog states
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [logisticsUsers, setLogisticsUsers] = useState<LogisticsUser[]>([]);
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [temperatureData, setTemperatureData] = useState<Record<string, TemperatureData>>({});
  const [loadingTemperature, setLoadingTemperature] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetchColdStorageOrders(userId);
    fetchLogisticsUsers();
    fetchTemperatureData();
  }, []);

  const fetchLogisticsUsers = async () => {
    try {
      setLoadingLogistics(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/user/logistics-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        setLogisticsUsers(response.data);
      } else {
        console.error('Invalid logistics users response:', response.data);
        setLogisticsUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch logistics users:', error);
      setLogisticsUsers([]);
    } finally {
      setLoadingLogistics(false);
    }
  };

  const fetchColdStorageOrders = async (userId?: string | null) => {
    try {
      const token = localStorage.getItem('token');
      const currentUserId = userId || localStorage.getItem('userId');
      
      const response = await axios.get('/order/cold-storage-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('All cold storage orders:', response.data);
      console.log('Current cold storage userId:', currentUserId);
      
      if (currentUserId) {
        // Show orders specifically assigned to this cold storage user
        // plus orders not yet assigned to any specific cold storage
        const filteredOrders = response.data.filter((order: Order) => 
          !order.coldStorageId || // General cold storage orders (legacy)
          order.coldStorageId === currentUserId // Orders specifically for this cold storage
        );
        
        console.log('Filtered orders for this cold storage:', filteredOrders);
        setOrders(filteredOrders);
      } else {
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch cold storage orders:', error);
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      await axios.put(`/order/receive-in-cold-storage/${orderId}`, {
        coldStorageId: userId // Pass the current user's ID
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Order received in cold storage');
      fetchColdStorageOrders(userId);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to receive order');
    }
  };

  const openDispatchDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedLogistics('');
    setError('');
    setDispatchDialog(true);
  };

  const handleDispatchOrder = async () => {
    if (!selectedLogistics) {
      setError('Please select a logistics company');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      // Find selected logistics user details
      const selectedLogisticsUser = logisticsUsers.find(u => u._id === selectedLogistics);
      
      await axios.put(`/order/cold-storage/dispatch/${selectedOrderId}`, {
        logisticsId: selectedLogistics,
        logisticsName: selectedLogisticsUser?.name || 'Unknown Logistics',
        logisticsEmail: selectedLogisticsUser?.email || 'Unknown Email'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Order dispatched to ${selectedLogisticsUser?.name || 'selected logistics'} for final delivery`);
      setDispatchDialog(false);
      setSelectedOrderId('');
      setSelectedLogistics('');
      fetchColdStorageOrders(userId);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to dispatch order');
    }
  };

  const fetchTemperatureData = async (device?: string) => {
    try {
      setLoadingTemperature(true);
      const token = localStorage.getItem('token');
      const coldStorageName = localStorage.getItem('userName'); // Use the cold storage name from local storage
      
      // First try to get temperature data by cold storage name
      if (coldStorageName) {
        // Build the URL based on whether a device is specified
        let url = `/cold-storage/temperature/storage/${encodeURIComponent(coldStorageName)}`;
        if (device) {
          url += `?device=${encodeURIComponent(device)}`;
        }
        
        const storageResponse = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (storageResponse.data && storageResponse.data.length > 0) {
          console.log('Temperature data by cold storage name:', storageResponse.data);
          
          // Extract unique devices for the filter dropdown
          const devices = new Set<string>();
          storageResponse.data.forEach((item: any) => {
            if (item.device) {
              devices.add(item.device);
            }
          });
          setAvailableDevices(Array.from(devices));
          
          // Convert array to record object by orderId for compatibility with existing code
          const formattedData: Record<string, TemperatureData> = {};
          storageResponse.data.forEach((item: TemperatureData) => {
            if (!formattedData[item.orderId]) {
              formattedData[item.orderId] = item;
            }
          });
          
          setTemperatureData(formattedData);
          setLoadingTemperature(false);
          return;
        }
      }
      
      // Fall back to getting temperature data for all orders associated with this cold storage
      const response = await axios.get('/cold-storage/temperature', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        console.log('Temperature data by user role:', response.data);
        setTemperatureData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch temperature data:', error);
    } finally {
      setLoadingTemperature(false);
    }
  };
  
  const handleChangePassword = async () => {
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axios.post('/user/change-password', { oldPassword, newPassword });
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="h5" gutterBottom>Cold Storage Dashboard</Typography>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={() => setOpen(true)}>
            Change Password
          </Button>
          <Button variant="outlined" color="secondary" onClick={onLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AcUnit sx={{ mr: 2, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6">
                    {orders.filter(o => o.status === 'dispatched_to_coldstorage').length}
                  </Typography>
                  <Typography variant="body2">Incoming Orders</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">
                    {orders.filter(o => o.status === 'in_coldstorage').length}
                  </Typography>
                  <Typography variant="body2">In Storage</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShipping sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">{orders.length}</Typography>
                  <Typography variant="body2">Total Orders</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Temperature Data Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Cold Storage Temperature Data</Typography>
        
        {availableDevices.length > 0 && (
          <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
            <InputLabel id="device-select-label">Filter by Device</InputLabel>
            <Select
              labelId="device-select-label"
              value={selectedDevice}
              onChange={(e) => {
                const value = e.target.value as string;
                setSelectedDevice(value);
                fetchTemperatureData(value);
              }}
              label="Filter by Device"
            >
              <MenuItem value="">
                <em>All Devices</em>
              </MenuItem>
              {availableDevices.map((device) => (
                <MenuItem key={device} value={device}>
                  {device}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.keys(temperatureData).length > 0 ? (
          Object.entries(temperatureData).map(([orderId, data]) => {
            const order = orders.find(o => o.orderId === orderId);
            if (!order) return null;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={orderId}>
                <Card sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  ':before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: data.temperature > 5 ? 'error.main' : 'success.main'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                        {order.productName}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={order.status.replace(/_/g, ' ').toUpperCase()}
                        color={order.status === 'in_coldstorage' ? 'primary' : 'default'}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ 
                        width: '50%', 
                        p: 2, 
                        borderRadius: 1, 
                        bgcolor: data.temperature <= 5 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid',
                        borderColor: data.temperature <= 5 ? 'success.light' : 'error.light'
                      }}>
                        <Typography variant="caption" color="text.secondary">Temperature</Typography>
                        <Typography variant="h5" sx={{ 
                          fontWeight: 600,
                          color: data.temperature <= 5 ? 'success.main' : 'error.main'
                        }}>
                          {data.temperature}°C
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        width: '50%', 
                        p: 2, 
                        borderRadius: 1, 
                        bgcolor: 'rgba(33, 150, 243, 0.1)',
                        border: '1px solid',
                        borderColor: 'info.light'
                      }}>
                        <Typography variant="caption" color="text.secondary">Humidity</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                          {data.humidity}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Order ID:</Typography>
                      <Typography variant="body2">{orderId}</Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Timestamp:</Typography>
                      <Typography variant="body2">
                        {new Date(data.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Seller:</Typography>
                        <Typography variant="body2">{order.sellerName}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Buyer:</Typography>
                        <Typography variant="body2">{order.buyerName}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                {loadingTemperature ? (
                  <Typography color="textSecondary">Loading temperature data...</Typography>
                ) : (
                  <Typography color="textSecondary">No temperature data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Orders Table */}
      <Typography variant="h6" gutterBottom>Cold Storage Orders</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Buyer</TableCell>
              <TableCell>Seller</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Temperature</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Date Received</TableCell>
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
                  <TableCell>
                    <Chip 
                      label={order.status.toUpperCase().replace(/_/g, ' ')} 
                      color={
                        order.status === 'dispatched_to_coldstorage' ? 'info' :
                        order.status === 'in_coldstorage' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {temperatureData[order.orderId] ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              color: temperatureData[order.orderId].temperature <= 5 ? 'success.main' : 'error.main' 
                            }}
                          >
                            {temperatureData[order.orderId].temperature}°C
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {temperatureData[order.orderId].humidity}% humidity
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(temperatureData[order.orderId].timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No data
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.coldStorageName ? (
                      order.coldStorageName
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Any Available
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{order.dispatchedToColdStorageDate || '-'}</TableCell>
                  <TableCell>
                    {order.status === 'dispatched_to_coldstorage' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        onClick={() => handleReceiveOrder(order.orderId)}
                        sx={{ mr: 1 }}
                      >
                        Receive
                      </Button>
                    )}
                    {order.status === 'in_coldstorage' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => openDispatchDialog(order.orderId)}
                        startIcon={<LocalShipping />}
                      >
                        Dispatch to Logistics
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No orders in cold storage</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Change Password Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            label="Old Password"
            type="password"
            fullWidth
            margin="normal"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {error && <Typography color="error">{error}</Typography>}
          {success && <Typography color="primary">{success}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained" color="primary">Change</Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch to Logistics Dialog */}
      <Dialog open={dispatchDialog} onClose={() => setDispatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dispatch Order to Logistics</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Select a logistics company to dispatch Order ID: {selectedOrderId}
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Logistics Company</InputLabel>
              <Select
                value={selectedLogistics}
                onChange={(e) => setSelectedLogistics(e.target.value as string)}
                label="Select Logistics Company"
                disabled={loadingLogistics}
              >
                {loadingLogistics ? (
                  <MenuItem disabled>Loading logistics companies...</MenuItem>
                ) : logisticsUsers.length > 0 ? (
                  logisticsUsers.map(logistics => (
                    <MenuItem key={logistics._id} value={logistics._id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {logistics.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          📧 {logistics.email}
                        </Typography>
                        {logistics.phone && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            📞 {logistics.phone}
                          </Typography>
                        )}
                        {logistics.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 14, color: 'primary.main' }} />
                            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                              {logistics.address}
                            </Typography>
                          </Box>
                        )}
                        {!logistics.address && (
                          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            No address provided
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No logistics companies available</MenuItem>
                )}
              </Select>
            </FormControl>

            {selectedLogistics && (
              <Card sx={{ mt: 2, border: '2px solid', borderColor: 'primary.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocalShipping sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">
                      Selected Logistics Provider
                    </Typography>
                  </Box>
                  {(() => {
                    const selectedProvider = logisticsUsers.find(u => u._id === selectedLogistics);
                    return selectedProvider ? (
                      <Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Company Name:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {selectedProvider.name}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Email:</Typography>
                            <Typography variant="body1">{selectedProvider.email}</Typography>
                          </Box>
                          {selectedProvider.phone && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Phone:</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Phone sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body1">{selectedProvider.phone}</Typography>
                              </Box>
                            </Box>
                          )}
                        </Box>
                        {selectedProvider.address ? (
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
                              🚚 {selectedProvider.address}
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
                              ⚠️ Logistics provider address not available
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="body2" color="primary" sx={{ mt: 2, fontStyle: 'italic' }}>
                          Order will be dispatched to this logistics provider for final delivery to customer.
                        </Typography>
                      </Box>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispatchDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDispatchOrder} 
            variant="contained" 
            color="primary"
            disabled={!selectedLogistics || loadingLogistics}
          >
            Dispatch Orde
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
  
  // Device selection handler
  const handleDeviceChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const deviceValue = event.target.value as string;
    setSelectedDevice(deviceValue);
    fetchTemperatureData(deviceValue);
  };
};

export default DashboardColdStorage;
