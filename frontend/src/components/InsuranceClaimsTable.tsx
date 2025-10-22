import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.secondary.main,
  '& .MuiTableCell-head': {
    color: theme.palette.common.white,
    fontWeight: 'bold',
  },
}));

interface InsuranceClaim {
  _id: string;
  claimId: string;
  complaintId: string;
  orderId: string;
  // Product details
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  // Seller details
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  // Buyer details
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  // Insurance agent details
  agentId: string;
  agentName?: string;
  agentEmail?: string;
  // Policy details
  policyId: string;
  policyNumber?: string;
  coverageAmount?: number;
  // Order details
  orderDate: string;
  dispatchDate: string;
  // Complaint details
  complaintReason: string;
  complaintDate: string;
  description: string;
  // Claim details
  claimAmount: number;
  totalAmount: number;
  claimDate: string;
  status: string;
  createdAt: string;
  // Refund info
  refundDate?: string;
}

interface InsuranceClaimsTableProps {
  agentId?: string;
  onProcessClaim?: (claim: InsuranceClaim) => void;
}

const InsuranceClaimsTable: React.FC<InsuranceClaimsTableProps> = ({ agentId, onProcessClaim }) => {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [refundDialog, setRefundDialog] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    fetchPendingClaims();
  }, [agentId]);

  const fetchPendingClaims = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Note: We don't need to check for agentId since the backend will use the authenticated user
      console.log(`Fetching pending claims for current agent ${agentId ? `(${agentId})` : ''}`);
      
      const response = await fetch('/api/insurance/pending-claims', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setClaims(data.claims || []);
      setError('');
    } catch (err) {
      console.error('Error fetching claims:', err);
      // setError('Failed to fetch pending claims');
    } finally {
      setLoading(false);
    }
  };

  const handlePayClaim = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    if (onProcessClaim) {
      // If parent component provided a handler, use it
      onProcessClaim(claim);
    } else {
      // Otherwise use the default internal dialog
      setPaymentDialog(true);
    }
  };

  const handleRefundClaim = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setRefundDialog(true);
  };


  // The second handleRefundSubmit implementation merged with the first
  const handleRefundSubmit = async () => {
    if (!selectedClaim) return;

    try {
      setProcessingRefund(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/insurance/refund-claim/${selectedClaim._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process refund');
      }

      await response.json(); // We don't need to use the result
      
      // Update the claim status in the list
      setClaims(prev => prev.map(claim => 
        claim._id === selectedClaim._id 
          ? { ...claim, status: 'refunded' }
          : claim
      ));

      setRefundDialog(false);
      setSelectedClaim(null);
      alert(`Refund of ₹${selectedClaim.claimAmount.toFixed(2)} has been processed successfully to ${selectedClaim.buyerName}!`);
      
      // Refresh the claims list
      fetchPendingClaims();
    } catch (err) {
      console.error('Error processing refund:', err);
      setError(err instanceof Error ? err.message : 'Failed to process refund');
      alert(`Failed to process refund: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingRefund(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedClaim) return;

    try {
      setProcessingPayment(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/insurance/pay-claim/${selectedClaim._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process payment');
      }

      await response.json();
      
      // Remove the claim from the list since it's been processed
      setClaims(prev => prev.filter(claim => claim._id !== selectedClaim._id));

      setPaymentDialog(false);
      setSelectedClaim(null);
      alert(`Payment of ₹${selectedClaim.claimAmount.toFixed(2)} has been processed successfully to ${selectedClaim.buyerName}!`);
    } catch (err) {
      console.error('Error processing payment:', err);
      alert(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Insurance Claims ({claims.length})
      </Typography>
      
      {claims.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No pending claims to review.
        </Alert>
      ) : (
        <StyledTableContainer>
            <Table>
              <StyledTableHead>
                <TableRow>
                  <TableCell>Claim ID</TableCell>
                  <TableCell>Order Details</TableCell>
                  <TableCell>Product Details</TableCell>
                  <TableCell>Seller Details</TableCell>
                  <TableCell>Buyer Details</TableCell>
                  <TableCell>Insurance Agent</TableCell>
                  <TableCell>Policy Info</TableCell>
                  <TableCell>Amounts</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Complaint Info</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </StyledTableHead>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim._id} hover>
                  {/* Claim ID */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.claimId || claim._id.slice(-8)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {claim.complaintId}
                    </Typography>
                  </TableCell>
                  
                  {/* Order Details */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.orderId}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Qty: {claim.quantity} × ₹{claim.price}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Total: ₹{(claim.price * claim.quantity).toFixed(2)}
                    </Typography>
                  </TableCell>
                  
                  {/* Product Details */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.productName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {claim.productId?.slice(-8)}
                    </Typography>
                  </TableCell>
                  
                  {/* Seller Details */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.sellerName}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      {claim.sellerEmail}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {claim.sellerId?.slice(-8)}
                    </Typography>
                  </TableCell>
                  
                  {/* Buyer Details */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.buyerName}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      {claim.buyerEmail}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {claim.buyerId?.slice(-8)}
                    </Typography>
                  </TableCell>
                  
                  {/* Insurance Agent Details */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.agentName || 'Agent'}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      {claim.agentEmail || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {claim.agentId?.slice(-8)}
                    </Typography>
                  </TableCell>
                  
                  {/* Policy Info */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.policyId}
                    </Typography>
                    <Typography variant="caption" display="block" color="success.main">
                      Coverage: ₹{claim.coverageAmount || 0}
                    </Typography>
                  </TableCell>
                  
                  {/* Amounts */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      Claim: ₹{(claim.claimAmount || claim.totalAmount || 0).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      Order: ₹{(claim.price * claim.quantity).toFixed(2)}
                    </Typography>
                  </TableCell>
                  
                  {/* Dates */}
                  <TableCell>
                    <Typography variant="caption" display="block">
                      Order: {formatDate(claim.orderDate)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Dispatch: {formatDate(claim.dispatchDate)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Complaint: {formatDate(claim.complaintDate)}
                    </Typography>
                    <Typography variant="caption" display="block" color="primary">
                      Claim: {formatDate(claim.claimDate || claim.createdAt)}
                    </Typography>
                  </TableCell>
                  
                  {/* Complaint Info */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.complaintReason || 'No reason'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {claim.description?.slice(0, 50) || 'No description'}
                      {claim.description && claim.description.length > 50 ? '...' : ''}
                    </Typography>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={
                        claim.status === 'pending' ? 'warning.main' :
                        claim.status === 'approved' ? 'success.main' :
                        claim.status === 'refunded' ? 'info.main' :
                        'error.main'
                      }
                    >
                      {claim.status?.toUpperCase()}
                    </Typography>
                    {claim.refundDate && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Refunded: {formatDate(claim.refundDate)}
                      </Typography>
                    )}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    {claim.status === 'pending' && (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() => handleRefundClaim(claim)}
                          sx={{ mb: 1, minWidth: '80px' }}
                        >
                          Refund
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          onClick={() => handlePayClaim(claim)}
                          sx={{ minWidth: '80px' }}
                        >
                          Process
                        </Button>
                      </>
                    )}
                    {claim.status === 'refunded' && (
                      <Typography variant="caption" color="success.main">
                        ✓ Refunded
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      )}

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialog} onClose={() => !processingPayment && setPaymentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Process Insurance Claim Payment</DialogTitle>
        <DialogContent>
          {selectedClaim && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please review the claim details carefully before processing the payment.
              </Alert>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Claim Information
                    </Typography>
                    <Typography><strong>Claim ID:</strong> {selectedClaim._id.slice(-8)}</Typography>
                    <Typography><strong>Order ID:</strong> {selectedClaim.orderId}</Typography>
                    <Typography><strong>Product:</strong> {selectedClaim.productName}</Typography>
                    <Typography><strong>Quantity:</strong> {selectedClaim.quantity}</Typography>
                    <Typography><strong>Unit Price:</strong> ₹{selectedClaim.price.toFixed(2)}</Typography>
                    <Typography><strong>Total Claim Amount:</strong> 
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                        ${selectedClaim.claimAmount.toFixed(2)}
                      </span>
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Parties Involved
                    </Typography>
                    <Typography variant="subtitle2">Seller (Claimant):</Typography>
                    <Typography>{selectedClaim.sellerName}</Typography>
                    <Typography color="textSecondary">{selectedClaim.sellerEmail}</Typography>
                    
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Buyer (Beneficiary):</Typography>
                    <Typography>{selectedClaim.buyerName}</Typography>
                    <Typography color="textSecondary">{selectedClaim.buyerEmail}</Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Complaint Details
                    </Typography>
                    <Typography><strong>Reason:</strong> {selectedClaim.complaintReason || 'No reason provided'}</Typography>
                    <Typography><strong>Description:</strong> {selectedClaim.description || 'No description provided'}</Typography>
                    <Typography><strong>Ordered:</strong> {formatDate(selectedClaim.orderDate)}</Typography>
                    <Typography><strong>Dispatched:</strong> {formatDate(selectedClaim.dispatchDate)}</Typography>
                    <Typography><strong>Claim Filed:</strong> {formatDate(selectedClaim.claimDate)}</Typography>
                  </CardContent>
                </Card>
              </Box>

              <Box mt={2}>
                <Alert severity="info">
                  <strong>Payment Processing:</strong> This will transfer ${selectedClaim.claimAmount.toFixed(2)} 
                  directly to the buyer's account ({selectedClaim.buyerName}) as compensation for the complaint.
                  The seller's insurance policy will cover this amount.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPaymentDialog(false)} 
            disabled={processingPayment}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePaymentSubmit} 
            variant="contained"
            color="success"
            disabled={processingPayment}
          >
            {processingPayment ? <CircularProgress size={20} /> : `Pay $${selectedClaim?.claimAmount.toFixed(2)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialog} onClose={() => !processingRefund && setRefundDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Process Claim Refund</DialogTitle>
        <DialogContent>
          {selectedClaim && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                This will refund the claim amount directly to the buyer's account and deduct from the insurance agent's balance.
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Refund Details
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Claim ID</Typography>
                  <Typography variant="body1">{selectedClaim.claimId || selectedClaim._id.slice(-8)}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Order ID</Typography>
                  <Typography variant="body1">{selectedClaim.orderId}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Product</Typography>
                  <Typography variant="body1">{selectedClaim.productName}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedClaim.quantity}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Buyer</Typography>
                  <Typography variant="body1">{selectedClaim.buyerName}</Typography>
                  <Typography variant="caption" color="textSecondary">{selectedClaim.buyerEmail}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Seller</Typography>
                  <Typography variant="body1">{selectedClaim.sellerName}</Typography>
                  <Typography variant="caption" color="textSecondary">{selectedClaim.sellerEmail}</Typography>
                </Box>
              </Box>
              
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.light', 
                borderRadius: 1, 
                border: '1px solid',
                borderColor: 'success.main'
              }}>
                <Typography variant="h6" color="success.dark">
                  Refund Amount: ₹{(selectedClaim.claimAmount || selectedClaim.totalAmount || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="success.dark">
                  This amount will be credited to {selectedClaim.buyerName}'s account
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRefundDialog(false)} 
            disabled={processingRefund}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRefundSubmit} 
            variant="contained"
            color="success"
            disabled={processingRefund}
          >
            {processingRefund ? <CircularProgress size={20} /> : `Refund ₹${selectedClaim?.claimAmount?.toFixed(2) || '0.00'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsuranceClaimsTable;