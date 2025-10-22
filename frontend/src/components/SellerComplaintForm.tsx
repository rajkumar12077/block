import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import axios from '../api';

interface Order {
  orderId: string;
  productId?: string;
  productName: string;
  price: number;
  quantity: number;
  date: string;
  deliveryDate?: string;
}

interface SellerComplaintFormProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const SellerComplaintForm: React.FC<SellerComplaintFormProps> = ({
  open,
  onClose,
  order,
  onSuccess,
  onError
}) => {
  const [complaintType, setComplaintType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Complaint type options for sellers
  const complaintTypes = [
    'Damaged in transit',
    'Buyer claims item not received',
    'Wrong item claimed by buyer',
    'Payment dispute',
    'Return request without valid reason',
    'Buyer misuse of product',
    'Fraudulent claim',
    'Unreasonable expectations',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!order) return;

    // Validate form
    if (!complaintType) {
      setFormError('Please select a complaint type');
      return;
    }
    
    if (!description.trim()) {
      setFormError('Please provide a detailed description of the issue');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      
      const token = localStorage.getItem('token');
      
      await axios.post('/order/complaint', {
        orderId: order.orderId,
        productId: order.productId || 'unknown',
        productName: order.productName,
        quantity: order.quantity,
        price: order.price,
        complaintReason: complaintType,
        description: description,
        orderDate: order.date,
        dispatchDate: order.deliveryDate || new Date().toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onSuccess('Issue reported successfully. An insurance agent will review your complaint.');
      handleClose();
    } catch (error: any) {
      onError(error?.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComplaintType('');
    setDescription('');
    setFormError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Report Order Issue</DialogTitle>
      <DialogContent>
        {order && (
          <>
            <Typography gutterBottom variant="subtitle1" sx={{ mb: 2 }}>
              Report a problem with order <strong>{order.orderId}</strong>
            </Typography>
            
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Order Details:</Typography>
              <Typography><strong>Product:</strong> {order.productName}</Typography>
              <Typography><strong>Quantity:</strong> {order.quantity}</Typography>
              <Typography><strong>Price:</strong> ${order.price.toFixed(2)}</Typography>
              <Typography><strong>Order Date:</strong> {new Date(order.date).toLocaleDateString()}</Typography>
              {order.deliveryDate && (
                <Typography><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</Typography>
              )}
            </Box>
            
            <FormControl fullWidth margin="normal" error={formError.includes('complaint type')}>
              <InputLabel id="seller-complaint-type-label">Complaint Type</InputLabel>
              <Select
                labelId="seller-complaint-type-label"
                id="seller-complaint-type"
                value={complaintType}
                label="Complaint Type"
                onChange={(e) => setComplaintType(e.target.value)}
              >
                {complaintTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              {formError.includes('complaint type') && (
                <FormHelperText>{formError}</FormHelperText>
              )}
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Detailed Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide a detailed description of the issue, including any relevant information that would help us investigate..."
              sx={{ mt: 2 }}
              error={formError.includes('description')}
              helperText={formError.includes('description') ? formError : ''}
            />
            
            <Box sx={{ mt: 2, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Note: Providing accurate and detailed information will help expedite the resolution process.
                All reported issues are subject to verification by insurance agents.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="warning" 
          variant="contained" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SellerComplaintForm;