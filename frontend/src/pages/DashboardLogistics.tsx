import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { Add as AddIcon, LocalShipping, Assignment, CheckCircle, LocationOn, Person } from '@mui/icons-material';
import axios from '../api';

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  currentDriverName?: string;
  currentDriverPhone?: string;
  currentDriverId?: string;
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
  sellerName: string;
}

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: string;
}

const DashboardLogistics: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [tabValue, setTabValue] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);
  const [driverAssignDialog, setDriverAssignDialog] = useState(false);
  const [selectedVehicleForDriver, setSelectedVehicleForDriver] = useState<string>('');
  const [selectedDriverForVehicle, setSelectedDriverForVehicle] = useState<string>('');

  
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleType: '',
    capacity: '',
    currentLocation: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchVehicles();
    fetchOrders();
    fetchDrivers();
    fetchAvailableDrivers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/logistics/vehicles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      console.log('=== LOGISTICS DASHBOARD DEBUG ===');
      console.log('Fetching orders from /logistics/all-logistics-orders');
      
      // Use logistics-specific endpoint to get orders with 'shippedtologistics', 'dispatched', and 'cancelled' status
      const response = await axios.get('/logistics/all-logistics-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status);
      console.log('Response data length:', response.data.length);
      console.log('First few orders:', response.data.slice(0, 3));
      console.log('Order statuses:', response.data.map((o: any) => o.status));
      
      // Add additional direct query for available orders to ensure we get everything
      const availableResponse = await axios.get('/logistics/available-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Available orders response length:', availableResponse.data.length);
      
      // Merge the results, removing duplicates
      const mergedOrders = [...response.data];
      
      // Add any available orders that weren't in the main response
      availableResponse.data.forEach((availableOrder: any) => {
        if (!mergedOrders.some(o => o.orderId === availableOrder.orderId)) {
          mergedOrders.push(availableOrder);
        }
      });
      
      // Check specifically for shippedtologistics orders
      const shippedToLogisticsOrders = mergedOrders.filter((o: any) => 
        o.status?.toLowerCase() === 'shippedtologistics'
      );
      
      console.log('Orders with status shippedtologistics:', shippedToLogisticsOrders.length);
      if (shippedToLogisticsOrders.length > 0) {
        console.log('Example shippedtologistics order:', shippedToLogisticsOrders[0]);
      }
      
      console.log('=== END LOGISTICS DASHBOARD DEBUG ===');
      
      setOrders(mergedOrders);
    } catch (error) {
      console.error('Failed to fetch logistics orders:', error);
      // Fallback to general orders endpoint and filter for logistics-relevant statuses
      try {
        console.log('=== FALLBACK DEBUG ===');
        console.log('Fetching from general /order endpoint as fallback');
        
        const fallbackResponse = await axios.get('/order', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter to only show orders relevant to logistics - handle case insensitivity
        const logisticsOrders = (fallbackResponse.data || []).filter((order: any) => {
          const status = order.status?.toLowerCase() || '';
          return ['shippedtologistics', 'dispatched', 'delivered', 'cancelled'].includes(status);
        });
        
        console.log('Fallback response data length:', fallbackResponse.data.length);
        console.log('Filtered logistics orders:', logisticsOrders.length);
        console.log('Filtered order statuses:', logisticsOrders.map((o: any) => o.status));
        console.log('=== END FALLBACK DEBUG ===');
        
        setOrders(logisticsOrders);
        console.log('Using fallback with filtered orders');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setOrders([]);
      }
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/user/drivers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrivers(response.data);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const fetchAvailableDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/logistics/available-drivers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableDrivers(response.data);
    } catch (error) {
      console.error('Failed to fetch available drivers:', error);
    }
  };

  const handleAddVehicle = async () => {
    setError('');
    setSuccess('');
    
    if (!vehicleForm.vehicleNumber || 
        !vehicleForm.vehicleType || !vehicleForm.capacity) {
      setError('All fields are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/logistics/vehicle', {
        ...vehicleForm,
        capacity: Number(vehicleForm.capacity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Vehicle added successfully');
      setVehicleForm({
        vehicleNumber: '',
        vehicleType: '',
        capacity: '',
        currentLocation: ''
      });
      setVehicleDialog(false);
      fetchVehicles();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const handleAssignOrder = async () => {
    if (!selectedVehicle || !selectedOrder) {
      setError('Please select both vehicle and order');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      console.log(`Assigning order ${selectedOrder} to vehicle ${selectedVehicle}`);
      
      await axios.post('/logistics/assign-order', {
        vehicleId: selectedVehicle,
        orderId: selectedOrder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Order assigned successfully');
      
      // Clear selections and close dialog
      setSelectedVehicle('');
      setSelectedOrder('');
      setAssignDialog(false);
      
      // Refresh data
      await fetchVehicles();
      await fetchOrders();
      
    } catch (error: any) {
      console.error('Order assignment error:', error);
      setError(error?.response?.data?.message || 'Failed to assign order');
    }
  };

  const handleDispatchVehicle = async (vehicleId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/logistics/dispatch/${vehicleId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Vehicle dispatched successfully');
      fetchVehicles();
      fetchOrders();
      fetchAvailableDrivers(); // Refresh available drivers list since driver is now unassigned
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to dispatch vehicle');
    }
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      const assignableOrderIds = orders
        .filter(order => isOrderAssignable(order))
        .map(order => order.orderId);
      setSelectedOrders(assignableOrderIds);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkAssignOrders = async () => {
    if (!selectedVehicle || selectedOrders.length === 0) {
      setError('Please select a vehicle and at least one order');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      // Assign each selected order to the vehicle sequentially
      for (let i = 0; i < selectedOrders.length; i++) {
        const orderId = selectedOrders[i];
        console.log(`Assigning order ${orderId} to vehicle ${selectedVehicle}`);
        
        await axios.post('/logistics/assign-order', {
          vehicleId: selectedVehicle,
          orderId: orderId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setSuccess(`Successfully assigned ${selectedOrders.length} orders to vehicle`);
      
      // Clear selections and close dialog
      setSelectedOrders([]);
      setSelectedVehicle('');
      setBulkAssignDialog(false);
      
      // Refresh data
      await fetchVehicles();
      await fetchOrders();
      
    } catch (error: any) {
      console.error('Bulk assignment error:', error);
      setError(error?.response?.data?.message || 'Failed to assign orders');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/logistics/vehicle/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to delete vehicle');
    }
  };

  const openDriverAssignDialog = (vehicleId: string) => {
    setSelectedVehicleForDriver(vehicleId);
    setSelectedDriverForVehicle('');
    setDriverAssignDialog(true);
    setError('');
    setSuccess('');
    fetchAvailableDrivers(); // Fetch fresh list of available drivers
  };

  const openOrderAssignDialog = (orderId: string) => {
    console.log(`Opening order assign dialog for order ID: ${orderId}`);
    const order = orders.find(o => o.orderId === orderId);
    console.log(`Order details:`, order);
    
    setSelectedOrder(orderId);
    setSelectedVehicle('');
    setAssignDialog(true);
    setError('');
    setSuccess('');
  };

  const handleAssignDriver = async () => {
    if (!selectedDriverForVehicle || !selectedVehicleForDriver) {
      setError('Please select a driver');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/logistics/assign-driver-to-vehicle', {
        vehicleId: selectedVehicleForDriver,
        driverId: selectedDriverForVehicle
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Driver assigned to vehicle successfully');
      setDriverAssignDialog(false);
      setSelectedVehicleForDriver('');
      setSelectedDriverForVehicle('');
      fetchVehicles();
      fetchAvailableDrivers(); // Refresh available drivers list
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to assign driver');
    }
  };

  const handleUnassignDriver = async (vehicleId: string) => {
    if (!window.confirm('Are you sure you want to unassign the driver from this vehicle?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/logistics/unassign-driver-from-vehicle/${vehicleId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Driver unassigned from vehicle successfully');
      fetchVehicles();
      fetchAvailableDrivers(); // Refresh available drivers list
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to unassign driver');
    }
  };



  const getStatusColor = (status: string) => {
    // Normalize status for consistent comparisons
    const normalizedStatus = status?.toLowerCase() || '';
    
    switch (normalizedStatus) {
      case 'available': return 'success';
      case 'loaded': return 'warning';
      case 'dispatched': return 'info';
      case 'shippedtologistics': return 'warning'; // Color for orders dispatched to logistics
      case 'delivered': return 'default';
      default: return 'default';
    }
  };

  // Helper function to check if an order is already assigned to a vehicle
  const isOrderAssigned = (orderId: string) => {
    return vehicles.some(vehicle => vehicle.assignedOrders.includes(orderId));
  };

  // Helper function to check if an order can be assigned to a vehicle
  const isOrderAssignable = (order: any) => {
    // Debug logging to check status matching
    console.log(`Checking assignability for order ${order.orderId} with status "${order.status}"`);
    
    if (!order || !order.status) {
      console.log(`Order ${order?.orderId || 'unknown'} has no status, not assignable`);
      return false;
    }
    
    // Normalize the status to ensure case-insensitive comparison (sometimes APIs return different cases)
    const normalizedStatus = order.status.toLowerCase().replace(/\s+/g, '');
    
    // Only orders with 'shippedtologistics' or 'dispatched to logistics' status can be assigned to vehicles
    // This handles variations like: 'shippedtologistics', 'shipped to logistics', 'dispatched to logistics'
    // 'dispatched' and 'cancelled' orders are shown for tracking but cannot be reassigned
    const validStatuses = ['shippedtologistics','dispatchedtocoldstorage', 'shippedto logistics', 'dispatched to coldstorage'];
    const assignable = validStatuses.includes(normalizedStatus);
    
    console.log(`Order ${order.orderId} status: "${order.status}" (normalized: "${normalizedStatus}"), assignable: ${assignable}`);
    return assignable;
  };

  // For the assign dialog, always include the selected order (if any) in the dropdown
  const availableOrders = React.useMemo(() => {
    const assignable = orders.filter(order => isOrderAssignable(order));
    if (selectedOrder) {
      const alreadyIncluded = assignable.some(o => o.orderId === selectedOrder);
      if (!alreadyIncluded) {
        const selected = orders.find(o => o.orderId === selectedOrder);
        if (selected) assignable.push(selected);
      }
    }
    return assignable;
  }, [orders, selectedOrder, vehicles]);
  const availableVehicles = vehicles.filter(vehicle => 
    (vehicle.status === 'available' || vehicle.status === 'assigned') && 
    vehicle.currentDriverId && 
    vehicle.assignedOrders.length === 0
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Logistics Dashboard</Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" color="secondary" onClick={onLogout}>
          Logout
        </Button>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      {success && <Typography color="success" sx={{ mb: 2 }}>{success}</Typography>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ width: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShipping sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">{vehicles.length}</Typography>
                  <Typography variant="body2">Total Vehicles</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">{availableOrders.length}</Typography>
                  <Typography variant="body2">Orders Ready for Pickup</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">{availableVehicles.length}</Typography>
                  <Typography variant="body2">Available Vehicles</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShipping sx={{ mr: 2, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6">
                    {vehicles.filter(v => v.status === 'dispatched').length}
                  </Typography>
                  <Typography variant="body2">Dispatched</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Vehicles" />
        <Tab label="Orders" />
        <Tab label="Assignments" />
      </Tabs>

      {/* Vehicles Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setVehicleDialog(true)}
            >
              Add Vehicle
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vehicle Number</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned Orders</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle._id}>
                    <TableCell>{vehicle.vehicleNumber}</TableCell>
                    <TableCell>{vehicle.currentDriverName || 'Unassigned'}</TableCell>
                    <TableCell>{vehicle.currentDriverPhone || '-'}</TableCell>
                    <TableCell>{vehicle.vehicleType}</TableCell>
                    <TableCell>{vehicle.capacity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={vehicle.status.toUpperCase()} 
                        color={getStatusColor(vehicle.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{vehicle.assignedOrders.length}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {!vehicle.currentDriverId && vehicle.status === 'available' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            onClick={() => openDriverAssignDialog(vehicle._id)}
                          >
                            Assign Driver
                          </Button>
                        )}
                        {vehicle.currentDriverId && vehicle.status !== 'dispatched' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleUnassignDriver(vehicle._id)}
                          >
                            Unassign Driver
                          </Button>
                        )}
                        {vehicle.status === 'loaded' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleDispatchVehicle(vehicle._id)}
                          >
                            Dispatch
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => handleDeleteVehicle(vehicle._id)}
                          disabled={vehicle.assignedOrders.length > 0}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Orders Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => {
                setError('');
                setSuccess('');
                setSelectedOrder('');
                setSelectedVehicle('');
                setAssignDialog(true);
              }}
              disabled={availableOrders.length === 0 || availableVehicles.length === 0}
            >
              Assign Order to Vehicle
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                setError('');
                setSuccess('');
                setBulkAssignDialog(true);
              }}
              disabled={selectedOrders.length === 0}
              sx={{ ml: 2 }}
            >
              Bulk Assign Selected ({selectedOrders.length})
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.filter(order => isOrderAssignable(order)).length}
                      checked={orders.filter(order => isOrderAssignable(order)).length > 0 && selectedOrders.length === orders.filter(order => isOrderAssignable(order)).length}
                      onChange={(e) => handleSelectAllOrders(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={index}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedOrders.includes(order.orderId)}
                        onChange={() => handleOrderSelection(order.orderId)}
                        disabled={!isOrderAssignable(order)}
                      />
                    </TableCell>
                    <TableCell>{order.orderId}</TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell>{order.buyerName}</TableCell>
                    <TableCell>{order.sellerName}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          (() => {
                            const statusLower = order.status?.toLowerCase() || '';
                            const statusNormalized = statusLower.replace(/\s+/g, '');
                            
                            // Check if status indicates order is ready for pickup
                            if (statusNormalized === 'shippedtologistics' || 
                                statusNormalized === 'dispatched to coldstorage' ||
                                statusLower === 'dispatched to logistics') {
                              return 'READY FOR PICKUP';
                            }
                            
                            return order.status.toUpperCase().replace(/_/g, ' ');
                          })()
                        } 
                        color={
                          (() => {
                            const statusLower = order.status?.toLowerCase() || '';
                            const statusNormalized = statusLower.replace(/\s+/g, '');
                            
                            // Ready for pickup statuses
                            if (statusNormalized === 'shippedtologistics' || 
                                statusNormalized === 'dispatched to coldstorage') {
                              return 'warning';
                            }
                            
                            // Other statuses
                            if (statusLower === 'shipped') return 'info';
                            if (statusLower.includes('dispatched')) return 'success';
                            if (statusLower === 'cancelled') return 'error';
                            
                            return 'default';
                          })() as any
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      {isOrderAssignable(order) && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => openOrderAssignDialog(order.orderId)}
                            disabled={availableVehicles.length === 0}
                          >
                            {isOrderAssigned(order.orderId) ? 'Reassign' : 'Assign'}
                          </Button>
                        </Box>
                      )}
                      {!isOrderAssignable(order) && (
                        <Typography variant="body2" color="textSecondary">
                          {order.status === 'shipped' ? 'Dispatched' : 'Not Available'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add Vehicle Dialog */}
      <Dialog open={vehicleDialog} onClose={() => setVehicleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Vehicle</DialogTitle>
        <DialogContent>
          <TextField
            label="Vehicle Number"
            fullWidth
            margin="normal"
            value={vehicleForm.vehicleNumber}
            onChange={e => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
          />
          <TextField
            select
            label="Vehicle Type"
            fullWidth
            margin="normal"
            value={vehicleForm.vehicleType}
            onChange={e => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
          >
            <MenuItem value="truck">Truck</MenuItem>
            <MenuItem value="van">Van</MenuItem>
            <MenuItem value="motorcycle">Motorcycle</MenuItem>
            <MenuItem value="car">Car</MenuItem>
          </TextField>
          <TextField
            label="Capacity (kg)"
            type="number"
            fullWidth
            margin="normal"
            value={vehicleForm.capacity}
            onChange={e => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
          />
          <TextField
            label="Current Location"
            fullWidth
            margin="normal"
            value={vehicleForm.currentLocation}
            onChange={e => setVehicleForm({ ...vehicleForm, currentLocation: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialog(false)}>Cancel</Button>
          <Button onClick={handleAddVehicle} variant="contained">Add Vehicle</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Order Dialog */}
      <Dialog open={assignDialog} onClose={() => {
        setError('');
        setSuccess('');
        setAssignDialog(false);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Order to Vehicle</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Select Vehicle"
            fullWidth
            margin="normal"
            value={selectedVehicle}
            onChange={e => setSelectedVehicle(e.target.value)}
            helperText={`${availableVehicles.length} available vehicles`}
          >
            {availableVehicles.length > 0 ? (
              availableVehicles.map((vehicle) => (
                <MenuItem key={vehicle._id} value={vehicle._id}>
                  {vehicle.vehicleNumber} - {vehicle.currentDriverName || 'Unassigned'} ({vehicle.vehicleType})
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled value="">
                No available vehicles
              </MenuItem>
            )}
          </TextField>
          <TextField
            select
            label="Select Order"
            fullWidth
            margin="normal"
            value={selectedOrder}
            onChange={e => setSelectedOrder(e.target.value)}
            helperText={`${availableOrders.length} assignable orders available`}
          >
            {availableOrders.length > 0 ? (
              availableOrders.map((order) => (
                <MenuItem key={order.orderId} value={order.orderId}>
                  {order.orderId} - {order.productName} ({order.buyerName}) - {order.status}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled value="">
                No assignable orders available
              </MenuItem>
            )}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setError('');
            setSuccess('');
            setAssignDialog(false);
          }}>Cancel</Button>
          <Button onClick={handleAssignOrder} variant="contained">Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Assign Orders Dialog */}
      <Dialog open={bulkAssignDialog} onClose={() => {
        setError('');
        setSuccess('');
        setBulkAssignDialog(false);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Assign Orders to Vehicle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Selected Orders: {selectedOrders.length}
          </Typography>
          <TextField
            select
            label="Select Vehicle"
            fullWidth
            margin="normal"
            value={selectedVehicle}
            onChange={e => setSelectedVehicle(e.target.value)}
          >
            {vehicles
              .filter(vehicle => vehicle.status === 'available' || (vehicle.status === 'assigned' && vehicle.currentDriverId))
              .map((vehicle) => (
              <MenuItem key={vehicle._id} value={vehicle._id}>
                {vehicle.vehicleNumber} - {vehicle.currentDriverName || 'Unassigned'} ({vehicle.vehicleType})
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Orders:
            </Typography>
            {selectedOrders.map(orderId => {
              const order = orders.find(o => o.orderId === orderId);
              return order ? (
                <Chip
                  key={orderId}
                  label={`${order.orderId} - ${order.productName}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ) : null;
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setError('');
            setSuccess('');
            setBulkAssignDialog(false);
          }}>Cancel</Button>
          <Button onClick={handleBulkAssignOrders} variant="contained">
            Assign {selectedOrders.length} Orders
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Driver Assignment Dialog */}
      <Dialog open={driverAssignDialog} onClose={() => setDriverAssignDialog(false)}>
        <DialogTitle>Assign Driver to Vehicle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Select an available driver to assign to this vehicle
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Driver</InputLabel>
            <Select
              value={selectedDriverForVehicle}
              onChange={(e) => setSelectedDriverForVehicle(e.target.value)}
              label="Select Driver"
            >
              {availableDrivers.length > 0 ? (
                availableDrivers.map((driver) => (
                  <MenuItem key={driver._id} value={driver._id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Person sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {driver.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        📞 {driver.phone}
                      </Typography>
                      {driver.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 14, color: 'primary.main' }} />
                          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>
                            {driver.address}
                          </Typography>
                        </Box>
                      )}
                      {!driver.address && (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                          No address provided
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled value="">
                  No available drivers at the moment
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            {availableDrivers.length} driver{availableDrivers.length !== 1 ? 's' : ''} available for assignment
          </Typography>

          {selectedDriverForVehicle && (
            <Card sx={{ mt: 2, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Person sx={{ color: 'primary.main' }} />
                  <Typography variant="h6">
                    Selected Driver
                  </Typography>
                </Box>
                {(() => {
                  const selectedDriver = availableDrivers.find(d => d._id === selectedDriverForVehicle);
                  return selectedDriver ? (
                    <Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Name:</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {selectedDriver.name}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Phone:</Typography>
                          <Typography variant="body1">{selectedDriver.phone}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Email:</Typography>
                          <Typography variant="body1">{selectedDriver.email}</Typography>
                        </Box>
                      </Box>
                      {selectedDriver.address ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LocationOn sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>
                              Driver Address:
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
                            🏠 {selectedDriver.address}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: 'grey.100', 
                          borderRadius: 1,
                          textAlign: 'center'
                        }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            ⚠️ No address information available for this driver
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDriverAssignDialog(false);
            setSelectedVehicleForDriver('');
            setSelectedDriverForVehicle('');
            setError('');
          }}>Cancel</Button>
          <Button onClick={handleAssignDriver} variant="contained">
            Assign Driver
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default DashboardLogistics;
