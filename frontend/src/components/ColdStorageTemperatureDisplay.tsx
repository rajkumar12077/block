import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress
} from '@mui/material';
import { AcUnit, Opacity, AccessTime } from '@mui/icons-material';
import axios from '../api';

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

interface TemperatureDisplayProps {
  userRole: 'buyer' | 'seller';
  userId: string;
}

const ColdStorageTemperatureDisplay: React.FC<TemperatureDisplayProps> = ({ userRole }) => {
  const [temperatureData, setTemperatureData] = useState<Record<string, TemperatureData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemperatureData();
  }, []);

  const fetchTemperatureData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get temperature data for this user's orders
      const response = await axios.get('/cold-storage/temperature');

      if (response.data) {
        console.log(`Temperature data for ${userRole}:`, response.data);
        setTemperatureData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch temperature data:', err);
      setError(err?.response?.data?.message || 'Failed to load temperature data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
        <CardContent>
          <Typography>{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(temperatureData).length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body1" align="center">
            No products are currently in cold storage
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        {userRole === 'buyer' ? 'Your Purchased Products' : 'Your Sold Products'} in Cold Storage
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        {Object.entries(temperatureData).map(([orderId, data]) => (
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={orderId}>
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
                    {data.productName}
                  </Typography>
                  <Chip 
                    size="small" 
                    label="IN COLD STORAGE"
                    color="primary"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    width: '50%', 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: data.temperature <= 5 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid',
                    borderColor: data.temperature <= 5 ? 'success.light' : 'error.light',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AcUnit sx={{ fontSize: 16, color: 'primary.main', mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">Temperature</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 600,
                      color: data.temperature <= 5 ? 'success.main' : 'error.main'
                    }}>
                      {data.temperature}°C
                    </Typography>
                    {data.temperature > 5 && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        Above safe limit!
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ 
                    width: '50%', 
                    p: 2, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(33, 150, 243, 0.1)',
                    border: '1px solid',
                    borderColor: 'info.light',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Opacity sx={{ fontSize: 16, color: 'info.main', mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">Humidity</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                      {data.humidity}%
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Order ID:</Typography>
                  <Typography variant="body2">{orderId}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(data.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ColdStorageTemperatureDisplay;