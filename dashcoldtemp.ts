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
  InputLabel
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
  _id?: string;           // MongoDB ObjectId as shown in screenshot
  orderId?: string;       // Optional as it might not be present in all records
  productId?: string;     // Optional as it might not be present in all records
  productName?: string;   // Optional as it might not be present in all records
  temperature: number;    // From screenshot: temperature: 28.5
  humidity: number;       // From screenshot: humidity: 63.4
  time?: string;          // From screenshot: time: "00:27:07"
  date?: string;          // From screenshot: date: "2025-10-08"
  timestamp?: string;     // Legacy field, might be replaced by date+time
  name?: string;          // From screenshot: name: "cold"
  latitude?: number;      // From screenshot: latitude: 12
  longitude?: number;     // From screenshot: longitude: 30
  device?: string;        // From screenshot: device: "esp1"
  sellerId?: string;
  buyerId?: string;
  coldStorageId?: string; // Legacy field
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
  const [manualColdStorageName, setManualColdStorageName] = useState<string>('');
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  
  // Helper function to log temperature data details
  const logTemperatureDataDetails = (data: TemperatureData[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      console.log('No temperature data records to log');
      return;
    }
    
    const userName = localStorage.getItem('userName');
    console.log(`Temperature data summary for user "${userName || 'unknown'}":`, {
      totalRecords: data.length,
      uniqueNames: [...new Set(data.map(item => item.name))],
      dateRange: {
        earliest: data.reduce((min, item) => {
          const date = item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString() : null);
          return (min === null || (date && date < min)) ? date : min;
        }, null),
        latest: data.reduce((max, item) => {
          const date = item.date || (item.timestamp ? new Date(item.timestamp).toLocaleDateString() : null);
          return (max === null || (date && date > max)) ? date : max;
        }, null)
      },
      hasNameMatchingUser: data.some(item => item.name === userName)
    });
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    
    // Show debug panel if userName is not available
    if (!userName) {
      console.warn('No userName found in localStorage! Showing debug panel.');
      setShowDebugPanel(true);
    } else {
      console.log('Using userName from localStorage:', userName);
    }
    
    fetchColdStorageOrders(userId);
    fetchLogisticsUsers();
    fetchTemperatureData(userName || undefined); // Pass the userName to the fetchTemperatureData function
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

  const fetchTemperatureData = async (coldStorageNameParam?: string, device?: string) => {
    try {
      setLoadingTemperature(true);
      const token = localStorage.getItem('token');
      
      // Get the user details - use the user's name from localStorage
      const loginName = localStorage.getItem('userName');
      const coldStorageName = coldStorageNameParam || loginName || "cold";
      
      console.log('Attempting to fetch temperature data with params:', {
        coldStorageName,
        loginName,
        device,
        manualNameProvided: coldStorageNameParam ? true : false,
        fromLocalStorage: loginName ? true : false,
        userId: localStorage.getItem('userId'),
        usingDefaultCold: !coldStorageNameParam && !loginName
      });
      
      // First try the new aggregated endpoint for current user
      console.log('Trying new aggregated endpoint for current user temperature data');
      try {
        const currentUserResponse = await axios.get('/cold-storage/temperature-current-user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (currentUserResponse.data && currentUserResponse.data.temperature !== undefined) {
          console.log('✅ Got temperature data from new aggregated endpoint:', currentUserResponse.data);
          
          // Convert single record to array format for consistency with existing code
          const aggregatedData = [currentUserResponse.data];
          
          // Log the user details we got from aggregation
          if (currentUserResponse.data.userDetails) {
            console.log('📋 User details from aggregation:', currentUserResponse.data.userDetails);
          }
          
          // Process the aggregated data directly
          const dataToProcess = aggregatedData;
          
          // Sort the data by timestamp or date/time (newest first)
          const sortedData = [...dataToProcess].sort((a, b) => {
            if (a.date && a.time && b.date && b.time) {
              const dateCompare = b.date.localeCompare(a.date);
              if (dateCompare !== 0) return dateCompare;
              return b.time.localeCompare(a.time);
            }
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTime - aTime;
          });
          
          // Extract unique devices for the filter dropdown
          const devices = new Set<string>();
          sortedData.forEach((item: any) => {
            if (item.device) {
              devices.add(item.device);
            }
          });
          setAvailableDevices(Array.from(devices));
          
          // Convert array to record object using unique keys
          const formattedData: Record<string, TemperatureData> = {};
          sortedData.forEach((item: TemperatureData, index: number) => {
            const key = item._id || 
                       (item.timestamp ? `temp-${new Date(item.timestamp).getTime()}` : '') ||
                       (item.date && item.time ? `temp-${item.date}-${item.time}` : '') ||
                       `temp-data-${index}`;
            
            if (!formattedData[key]) {
              const pureTemperatureData: TemperatureData = {
                _id: item._id,
                temperature: item.temperature || 0,
                humidity: item.humidity || 0,
                time: item.time,
                date: item.date,
                timestamp: item.timestamp,
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                device: item.device
              };
              formattedData[key] = pureTemperatureData;
            }
          });
          
          console.log('✅ Successfully processed aggregated temperature data:', formattedData);
          setTemperatureData(formattedData);
          setLoadingTemperature(false);
          return;
        }
      } catch (aggregationError) {
        console.log('⚠️ New aggregated endpoint failed, trying fallback methods:', aggregationError.message);
      }
      
      // Fallback: Try to get temperature data by cold storage name
      if (coldStorageName) {
        let url = `/cold-storage/temperature/storage/${encodeURIComponent(coldStorageName)}`;
        if (device) {
          url += `?device=${encodeURIComponent(device)}`;
        }
        
        console.log('Requesting temperature by name URL (fallback):', url);
        const storageResponse = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Received response for name lookup:', {
          status: storageResponse.status,
          dataSample: Array.isArray(storageResponse.data) ? storageResponse.data.slice(0,3) : storageResponse.data
        });

        if (storageResponse.data && storageResponse.data.length > 0) {
          console.log('Temperature data by cold storage name:', storageResponse.data);
          
          // Log the details of the temperature data for debugging
          logTemperatureDataDetails(storageResponse.data);
          
          // Filter the data to only include entries where the name field matches the coldStorageName
          // This ensures we're only showing data for the current user's cold storage facility
          const filteredData = storageResponse.data.filter((item: any) => 
            item.name && item.name.toLowerCase() === coldStorageName.toLowerCase()
          );
          
          console.log(`Filtered ${storageResponse.data.length} records down to ${filteredData.length} records matching name "${coldStorageName}"`);
          
          if (filteredData.length > 0) {
            console.log('✅ Successfully found temperature data matching the cold storage name!');
          } else {
            console.warn('⚠️ No temperature data records match the cold storage name');
            
            // If in debug mode, show a warning but continue with unfiltered data
            // Otherwise, show the debug panel to allow manual name entry
            if (!coldStorageNameParam && !showDebugPanel) {
              setShowDebugPanel(true);
              setError(`No temperature data found for cold storage name "${coldStorageName}". Try using the debug panel.`);
            }
          }
          
          // Use either filtered data if available or fall back to unfiltered data
          const dataToProcess = filteredData.length > 0 ? filteredData : storageResponse.data;
          
          // Extract unique devices for the filter dropdown
          const devices = new Set<string>();
          dataToProcess.forEach((item: any) => {
            if (item.device) {
              devices.add(item.device);
            }
          });
          setAvailableDevices(Array.from(devices));
          
          // Sort the data by timestamp or date/time (newest first)
          const sortedData = [...dataToProcess].sort((a, b) => {
            // First try sorting by date and time fields
            if (a.date && a.time && b.date && b.time) {
              const dateCompare = b.date.localeCompare(a.date);
              if (dateCompare !== 0) return dateCompare;
              return b.time.localeCompare(a.time);
            }
            // Fall back to timestamp
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTime - aTime;
          });
          
          // Convert array to record object using unique keys (not order-based)
          const formattedData: Record<string, TemperatureData> = {};
          sortedData.forEach((item: TemperatureData, index: number) => {
            // Generate unique key using _id or timestamp or index - avoid orderId
            const key = item._id || 
                       (item.timestamp ? `temp-${new Date(item.timestamp).getTime()}` : '') ||
                       (item.date && item.time ? `temp-${item.date}-${item.time}` : '') ||
                       `temp-data-${index}`;
            
            // Create temperature data entry without any order information
            if (!formattedData[key]) {
              // Only include temperature-related fields, exclude order fields
              const pureTemperatureData: TemperatureData = {
                _id: item._id,
                temperature: item.temperature || 0,
                humidity: item.humidity || 0,
                time: item.time,
                date: item.date,
                timestamp: item.timestamp,
                name: item.name,
                latitude: item.latitude,
                longitude: item.longitude,
                device: item.device
                // Explicitly exclude: orderId, productId, productName, sellerId, buyerId, coldStorageId
              };
              formattedData[key] = pureTemperatureData;
            }
          });
          
          console.log('Formatted temperature data:', formattedData);
          setTemperatureData(formattedData);
          setLoadingTemperature(false);
          return;
        }
      }
      
      // Fall back to getting temperature data for all orders associated with this cold storage
      const fallbackUrl = '/cold-storage/temperature';
      console.log('Falling back to URL:', fallbackUrl);
      const response = await axios.get(fallbackUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Received response for fallback:', {
        status: response.status,
        dataSample: (response.data && typeof response.data === 'object') ? (Array.isArray(response.data) ? response.data.slice(0,3) : response.data) : response.data
      });

      if (response.data) {
        console.log('Temperature data by user role:', response.data);
        
        // Check if we have any data
        const hasData = Object.keys(response.data).length > 0;
        
        if (hasData) {
          setTemperatureData(response.data);
        } else {
          console.warn('No temperature data found in fallback response');
          setTemperatureData({});
          
          // Show a message to the user
          if (!showDebugPanel) {
            setShowDebugPanel(true);
            setError('No temperature data found for this cold storage. Try using the debug panel to enter a cold storage name manually.');
          }
        }
      } else {
        console.warn('No data in API response');
        setTemperatureData({});
      }
    } catch (error: any) {
      // If axios error, print response if available
      if (error.isAxiosError) {
        console.error('Axios error fetching temperature data:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      } else {
        console.error('Failed to fetch temperature data:', error);
      }
      
      // Show debug panel if we encounter an error
      setShowDebugPanel(true);
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
      
      {/* Status indicator for data source */}
      {Object.keys(temperatureData).length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip 
            size="small" 
            label="✅ Connected to Temperature Monitoring System" 
            color="success" 
            variant="outlined"
          />
        </Box>
      )}

      {/* Debug Panel for Temperature Data Testing */}
      {showDebugPanel && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px dashed #999' }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#d32f2f' }}>
            Debug Panel: No userName found in localStorage
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              label="Enter Cold Storage Name"
              value={manualColdStorageName}
              onChange={(e) => setManualColdStorageName(e.target.value)}
              size="small"
              variant="outlined"
              sx={{ flexGrow: 1 }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => fetchTemperatureData(manualColdStorageName)}
              disabled={!manualColdStorageName}
            >
              Fetch Temperature Data
            </Button>
          </Box>
          
          {/* LocalStorage Debug Info */}
          <Box sx={{ mt: 2, p: 1, bgcolor: '#e0e0e0', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              LocalStorage Contents:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>userName:</Typography>
              <Typography variant="body2">{localStorage.getItem('userName') || '<not set>'}</Typography>
              
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>userId:</Typography>
              <Typography variant="body2">{localStorage.getItem('userId') || '<not set>'}</Typography>
              
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>role:</Typography>
              <Typography variant="body2">{localStorage.getItem('role') || '<not set>'}</Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small" 
              color="error" 
              onClick={() => {
                localStorage.removeItem('userName');
                localStorage.removeItem('userId');
                window.location.reload();
              }}
              sx={{ mt: 1 }}
            >
              Clear User Data
            </Button>
          </Box>
        </Box>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, mb: 4 }}>
        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
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
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
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
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
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
        </Box>
      </Box>
      
      {/* User Information Section (if available from aggregated data) */}
      {Object.keys(temperatureData).length > 0 && (() => {
        // Check if we have user details from the aggregated endpoint
        const firstEntry = Object.values(temperatureData)[0];
        const hasUserDetails = firstEntry && (firstEntry as any).userDetails;
        
        if (hasUserDetails) {
          const userDetails = (firstEntry as any).userDetails;
          return (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Cold Storage Facility Information</Typography>
              <Card sx={{ p: 3, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid', borderColor: 'success.light' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Facility Name</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{userDetails.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{userDetails.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{userDetails.phone}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Address</Typography>
                    <Typography variant="body1">{userDetails.address}</Typography>
                  </Box>
                </Box>
              </Card>
            </Box>
          );
        }
        return null;
      })()}

      {/* Temperature Data Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Temperature Monitoring Data</Typography>
        
        {availableDevices.length > 0 && (
          <FormControl variant="outlined" size="small" sx={{ width: 200 }}>
            <InputLabel id="device-select-label">Filter by Device</InputLabel>
            <Select
              labelId="device-select-label"
              value={selectedDevice}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDevice(value);
                const userName = localStorage.getItem('userName') || manualColdStorageName;
                fetchTemperatureData(userName, value);
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
      
      {/* Latest Temperature Entry Display */}
      {Object.keys(temperatureData).length > 0 && (() => {
        // Find the newest entry by timestamp (or by date+time if available)
        const entries = Object.values(temperatureData);
        
        // Filter entries to only include those with matching name field
        // This ensures we only show temperature data for the current user's cold storage
        const userName = localStorage.getItem('userName') || manualColdStorageName || 'cold';
        const entriesForCurrentUser = entries.filter(entry => 
          entry.name && entry.name.toLowerCase() === userName.toLowerCase()
        );
        
        // Use filtered entries if available, otherwise use all entries
        const entriesToUse = entriesForCurrentUser.length > 0 ? entriesForCurrentUser : entries;
        console.log(`Found ${entriesForCurrentUser.length} temperature entries matching user name "${userName}" out of ${entries.length} total entries`);
        
        let newest: TemperatureData | null = null;
        if (entriesToUse.length > 0) {
          // Prefer entries with both date and time
          const withDateTime = entriesToUse.filter(e => e.date && e.time);
          if (withDateTime.length > 0) {
            withDateTime.sort((a, b) => {
              if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
              return (b.time || '').localeCompare(a.time || '');
            });
            newest = withDateTime[0];
          } else {
            // Fallback: sort by timestamp
            const withTimestamp = entriesToUse.filter(e => e.timestamp);
            if (withTimestamp.length > 0) {
              withTimestamp.sort((a, b) => {
                const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return bTime - aTime;
              });
              newest = withTimestamp[0];
            } else {
              newest = entriesToUse[0];
            }
          }
        }
        return newest ? (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
              <AcUnit sx={{ mr: 1, color: 'primary.main' }} />
              Latest Temperature Reading - {newest.name || 'Cold Storage'}
            </Typography>
            <Card sx={{ 
              p: 3, 
              border: '2px solid',
              borderColor: newest.temperature <= 5 ? 'success.main' : 'error.main',
              bgcolor: 'background.paper',
              boxShadow: 4
            }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
                {/* Temperature and Environmental Data */}
                <Box>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 'bold', 
                    color: newest.temperature <= 5 ? 'success.main' : 'error.main',
                    mb: 2
                  }}>
                    {newest.temperature}°C
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Humidity</Typography>
                      <Typography variant="h6">{newest.humidity}%</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">Device</Typography>
                      <Typography variant="h6">{newest.device || 'Unknown'}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date</Typography>
                      <Typography variant="body1">
                        {newest.date || (newest.timestamp ? new Date(newest.timestamp).toLocaleDateString() : 'N/A')}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">Time</Typography>
                      <Typography variant="body1">
                        {newest.time || (newest.timestamp ? new Date(newest.timestamp).toLocaleTimeString() : 'N/A')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Location Information */}
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid',
                  borderColor: 'info.light'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ mr: 1, color: 'info.main' }} />
                    Location
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Latitude</Typography>
                    <Typography variant="body1">
                      {newest.latitude !== undefined ? `${newest.latitude}°` : 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Longitude</Typography>
                    <Typography variant="body1">
                      {newest.longitude !== undefined ? `${newest.longitude}°` : 'N/A'}
                    </Typography>
                  </Box>
                  
                  {newest.name && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Storage Name</Typography>
                      <Typography variant="body1">{newest.name}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>
          </Box>
        ) : <Typography color="text.secondary">No temperature data available</Typography>;
      })()}
      {/* Temperature Data History Table - Pure Temperature Data Only */}
      {Object.keys(temperatureData).length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Temperature Monitoring History</Typography>
          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table size="small" aria-label="temperature monitoring table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Temperature</TableCell>
                  <TableCell>Humidity</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Latitude</TableCell>
                  <TableCell>Longitude</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(temperatureData).map((data, index) => (
                  <TableRow key={`temp-data-${index}`} 
                    sx={{ 
                      bgcolor: data.temperature > 5 ? 'rgba(244, 67, 54, 0.05)' : 'rgba(76, 175, 80, 0.05)',
                    }}
                  >
                    <TableCell>{data.date || (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleDateString() : 'N/A')}</TableCell>
                    <TableCell>{data.time || (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleTimeString() : 'N/A')}</TableCell>
                    <TableCell>
                      <Typography sx={{ 
                        fontWeight: 'medium',
                        color: data.temperature > 5 ? 'error.main' : 'success.main' 
                      }}>
                        {data.temperature}°C
                      </Typography>
                    </TableCell>
                    <TableCell>{data.humidity}%</TableCell>
                    <TableCell>{data.device || 'N/A'}</TableCell>
                    <TableCell>{data.latitude !== undefined ? data.latitude : 'N/A'}°</TableCell>
                    <TableCell>{data.longitude !== undefined ? data.longitude : 'N/A'}°</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Individual temperature monitoring cards - No Order Details */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, mb: 4 }}>
        {Object.keys(temperatureData).length > 0 ? (
          Object.entries(temperatureData).slice(0, 3).map(([dataKey, data]) => {
            return (
              <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={dataKey}>
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
                      <Typography variant="h6" noWrap sx={{ maxWidth: '100%' }}>
                        {data.name ? `${data.name} Storage` : 'Temperature Sensor'}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={data.device || 'Unknown Device'}
                        color="primary"
                        variant="outlined"
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

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Date</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {data.date || (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleDateString() : 'N/A')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Time</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {data.time || (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleTimeString() : 'N/A')}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Location coordinates from the sensor */}
                    <Box sx={{ 
                      mb: 2, 
                      p: 2, 
                      borderRadius: 1, 
                      bgcolor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid',
                      borderColor: 'success.light'
                    }}>
                      <Typography variant="caption" color="text.secondary">Location Coordinates</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="primary" />
                        <Box>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant="body2" fontWeight="medium">
                              Lat: {data.latitude !== undefined ? data.latitude : 'N/A'}°
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              Long: {data.longitude !== undefined ? data.longitude : 'N/A'}°
                            </Typography>
                          </Box>
                          {data.name && (
                            <Typography variant="caption" color="text.secondary">
                              Cold Storage: {data.name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">ID:</Typography>
                      <Typography variant="body2">{dataKey}</Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Location:</Typography>
                      <Typography variant="body2">
                        Lat: {data.latitude !== undefined ? data.latitude : 'N/A'}°, 
                        Long: {data.longitude !== undefined ? data.longitude : 'N/A'}°
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Last Updated:</Typography>
                      <Typography variant="body2">
                        {data.date || (data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A')} {' '}
                        {data.time || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })
        ) : (
          <Box sx={{ gridColumn: 'span 12' }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                {loadingTemperature ? (
                  <Typography color="textSecondary">Loading temperature data...</Typography>
                ) : (
                  <Typography color="textSecondary">No temperature data available</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

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
              <TableCell>Temperature Details</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Location</TableCell>
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
                    {(() => {
                      // Look for temperature data that matches this order's orderId
                      const tempForOrder = order && order.orderId && temperatureData[order.orderId];
                      
                      // Also look for any temperature data matching the cold storage name
                      const coldStorageMatches = Object.values(temperatureData).filter(
                        item => item.name === 'cold' || item.name === order.coldStorageName
                      );
                      
                      const dataToUse = tempForOrder || (coldStorageMatches.length > 0 ? coldStorageMatches[0] : null);
                      
                      if (dataToUse) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Temperature and humidity */}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700,
                                  color: dataToUse.temperature <= 5 ? 'success.main' : 'error.main' 
                                }}
                              >
                                {dataToUse.temperature}°C
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                {dataToUse.humidity}% humidity
                              </Typography>
                            </Box>
                            {/* Date and time as shown in the screenshot */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                {dataToUse.date || 
                                  (dataToUse.timestamp && typeof dataToUse.timestamp === 'string' ? 
                                    new Date(dataToUse.timestamp).toLocaleDateString() : '')
                                }
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dataToUse.time || 
                                  (dataToUse.timestamp && typeof dataToUse.timestamp === 'string' ? 
                                    new Date(dataToUse.timestamp).toLocaleTimeString() : '')
                                }
                              </Typography>
                            </Box>
                          </Box>
                        );
                      } else {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            No data
                          </Typography>
                        );
                      }
                    })()}
                  </TableCell>
                  {/* Device column */}
                  <TableCell>
                    {(() => {
                      // Look for temperature data that matches this order's orderId or cold storage name
                      const tempForOrder = order && order.orderId && temperatureData[order.orderId];
                      const coldStorageMatches = Object.values(temperatureData).filter(
                        item => item.name === 'cold' || (order.coldStorageName && item.name === order.coldStorageName)
                      );
                      const dataToUse = tempForOrder || (coldStorageMatches.length > 0 ? coldStorageMatches[0] : null);
                      
                      return dataToUse?.device || 'N/A';
                    })()}
                  </TableCell>
                  {/* Location column with coordinates */}
                  <TableCell>
                    {(() => {
                      // Look for temperature data that matches this order's orderId or cold storage name
                      const tempForOrder = order && order.orderId && temperatureData[order.orderId];
                      const coldStorageMatches = Object.values(temperatureData).filter(
                        item => item.name === 'cold' || (order.coldStorageName && item.name === order.coldStorageName)
                      );
                      const dataToUse = tempForOrder || (coldStorageMatches.length > 0 ? coldStorageMatches[0] : null);
                      
                      if (dataToUse && (dataToUse.latitude !== undefined || dataToUse.longitude !== undefined)) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2">
                              Lat: {dataToUse.latitude !== undefined ? dataToUse.latitude : 'N/A'}°
                            </Typography>
                            <Typography variant="body2">
                              Long: {dataToUse.longitude !== undefined ? dataToUse.longitude : 'N/A'}°
                            </Typography>
                          </Box>
                        );
                      } else {
                        return 'N/A';
                      }
                    })()}
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
            Dispatch Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardColdStorage;
