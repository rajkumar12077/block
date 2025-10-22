import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '& .MuiTableCell-head': {
    color: theme.palette.common.white,
    fontWeight: 'bold',
  },
}));

interface Complaint {
  _id: string;
  complaintId: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  orderDate: string;      // From schema
  dispatchDate: string;   // From schema
  complaintDate: string;  // From schema
  complaintReason: string; // From schema
  description: string;
  status: string;
  claimId?: string;
  hasClaim: boolean;
  createdAt?: string;     // MongoDB timestamp
}

interface BuyerComplaintsTableProps {
  buyerId?: string;
}

const BuyerComplaintsTable: React.FC<BuyerComplaintsTableProps> = ({ buyerId }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [buyerId]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Fetching buyer complaints...');
      
      // Use the Vite proxy configuration for API calls
      const apiUrl = '/api/order/complaints/buyer';
      
      console.log('Requesting from API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          // Try to parse as JSON first
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not JSON, get as text
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        
        console.error('Error response:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Complaints data received:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array of complaints but received:', data);
        throw new Error('Invalid data format received from server');
      }
      
      setComplaints(data);
      setError('');
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Failed to fetch complaints: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'refunded': return 'success';
      case 'claimed': return 'info';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const handleOpenDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailDialogOpen(false);
    setSelectedComplaint(null);
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        My Complaints ({complaints.length})
      </Typography>
      
      {complaints.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          You haven't filed any complaints yet.
        </Alert>
      ) : (
        <StyledTableContainer>
          <Table>
            <StyledTableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {complaints.map((complaint) => (
                <TableRow key={complaint._id} hover>
                  <TableCell>{complaint.orderId}</TableCell>
                  <TableCell>{complaint.productName}</TableCell>
                  <TableCell>${complaint.price.toFixed(2)}</TableCell>
                  <TableCell>{complaint.quantity}</TableCell>
                  <TableCell>{formatDate(complaint.orderDate)}</TableCell>
                  <TableCell>{complaint.complaintReason}</TableCell>
                  <TableCell>
                    <Chip 
                      label={complaint.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(complaint.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenDetails(complaint)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      )}
      
      {/* Complaint Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          Complaint Details
        </DialogTitle>
        <DialogContent>
          {selectedComplaint && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Chip 
                  label={selectedComplaint.status.replace('_', ' ').toUpperCase()} 
                  color={getStatusColor(selectedComplaint.status)}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Order ID</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.orderId}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Complaint Date</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(selectedComplaint.complaintDate)}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Product</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.productName}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle2">Price</Typography>
                <Typography variant="body1" gutterBottom>${selectedComplaint.price.toFixed(2)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle2">Quantity</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.quantity}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Reason</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.complaintReason}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body1" paragraph>{selectedComplaint.description}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Order Date</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(selectedComplaint.orderDate)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Dispatch Date</Typography>
                <Typography variant="body1" gutterBottom>{formatDate(selectedComplaint.dispatchDate)}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Seller</Typography>
                <Typography variant="body1" gutterBottom>{selectedComplaint.sellerName} ({selectedComplaint.sellerEmail})</Typography>
              </Grid>
              
              {selectedComplaint.hasClaim && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="primary">Insurance Claim</Typography>
                    <Typography variant="body1">
                      The seller has filed an insurance claim for this complaint. 
                      {selectedComplaint.status === 'approved' && " Your complaint has been approved."}
                      {selectedComplaint.status === 'refunded' && " You have been refunded."}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              About Complaints
            </Typography>
            <Typography variant="body2">
              If you have an issue with your order, you can file a complaint. The seller will review your complaint 
              and may file an insurance claim if necessary. You will be notified when your complaint status changes.
            </Typography>
          </CardContent>
        </Card>
      </Box> */}
    </Box>
  );
};

export default BuyerComplaintsTable;