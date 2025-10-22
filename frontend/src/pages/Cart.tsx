import React, { useState, useEffect, useRef } from 'react';
// Use the base import to avoid resolution issues
import { Card, CardContent, Typography, Button, Box, Divider, Alert, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import axios from '../api';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  sellerId: string;
}

interface CartProps {
  cart: Product[];
  onCheckout: () => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateQuantity: (productId: string, change: number) => void;
}

const Cart: React.FC<CartProps> = ({ cart, onCheckout, onRemoveFromCart, onUpdateQuantity }) => {
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const checkoutInProgressRef = useRef(false);

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/user/balance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  useEffect(() => {
    // Only fetch balance if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      fetchBalance();
    }
  }, []);

  const totalCost = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const hasInsufficientBalance = userBalance < totalCost;
  const isLoggedIn = !!localStorage.getItem('token');
  
  const handleCheckoutClick = async () => {
    // Prevent multiple clicks and React StrictMode double invocation
    if (loading || checkoutInProgressRef.current) {
      console.log('🚫 Checkout already in progress, ignoring duplicate click');
      return;
    }
    
    // Check if cart is empty
    if (!cart || cart.length === 0) {
      console.log('🛒 Cart is empty, nothing to checkout');
      setError('Cart is empty');
      return;
    }
    
    if (hasInsufficientBalance) {
      setError('Insufficient balance!');
      return;
    }

    checkoutInProgressRef.current = true;
    setLoading(true);
    setError('');
    console.log('🔒 Starting checkout process - setting loading to true');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login page instead of showing an error
        window.location.href = '/login';
        return;
      }

      // Deduplicate cart items by ID and sum quantities
      const consolidatedCart = cart.reduce((acc, item) => {
        const existingItem = acc.find(existing => existing._id === item._id);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, [] as typeof cart);

      console.log(`🛒 Original cart has ${cart.length} items, consolidated cart has ${consolidatedCart.length} items:`);
      cart.forEach((item, index) => {
        console.log(`   Original ${index + 1}. ${item.name} - Qty: ${item.quantity} - Price: ₹${item.price} - ID: ${item._id}`);
      });
      consolidatedCart.forEach((item, index) => {
        console.log(`   Consolidated ${index + 1}. ${item.name} - Qty: ${item.quantity} - Price: ₹${item.price} - ID: ${item._id}`);
      });

      // Process each unique item in consolidated cart
      for (const [index, item] of consolidatedCart.entries()) {
        console.log(`📤 Processing item ${index + 1}/${consolidatedCart.length}: ${item.name}`);
        
        const orderPayload = {
          productId: item._id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          sellerId: item.sellerId,
        };
        
        console.log(`   📝 Order payload:`, orderPayload);
        console.log(`   🔍 Making single API call for this item...`);
        
        const response = await axios.post('/order', orderPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`   ✅ Order created successfully:`, response.data);
      }

      await fetchBalance(); // Refresh balance first to get updated amount
      setSuccess(`Orders placed successfully! Your new balance is ₹${userBalance.toFixed(2)}`);
      
      // Clear cart and redirect after a brief delay to ensure UI updates
      setTimeout(() => {
        onCheckout(); // Clear cart and redirect
      }, 1000);
      
      console.log('✅ Checkout completed successfully');
    } catch (error: any) {
      console.error('❌ Checkout failed:', error);
      setError(error?.response?.data?.message || 'Failed to complete checkout');
    } finally {
      console.log('🔓 Checkout process finished - setting loading to false');
      setLoading(false);
      checkoutInProgressRef.current = false;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Shopping Cart</Typography>
      
      {/* Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {/* Balance Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Account Balance: ₹{userBalance.toFixed(2)}</Typography>
        <Typography variant="h6">Cart Total: ₹{totalCost.toFixed(2)}</Typography>
        
        {hasInsufficientBalance && totalCost > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Insufficient balance! You need ₹{(totalCost - userBalance).toFixed(2)} more to complete this purchase.
          </Alert>
        )}
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cart.map(product => (
          <Card key={product._id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography variant="body2">Category: {product.category}</Typography>
                  <Typography variant="body2">Price: ₹{product.price}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                    <Typography variant="body2" sx={{ mr: 2 }}>Quantity:</Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => onUpdateQuantity(product._id, -1)}
                      disabled={product.quantity <= 1}
                      sx={{ minWidth: '36px', p: '2px 8px' }}
                    >
                      -
                    </Button>
                    <Typography variant="body2" sx={{ mx: 1.5, fontWeight: 'bold' }}>
                      {product.quantity}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => onUpdateQuantity(product._id, 1)}
                      sx={{ minWidth: '36px', p: '2px 8px' }}
                    >
                      +
                    </Button>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Subtotal: ₹{(product.price * product.quantity).toFixed(2)}
                  </Typography>
                </Box>
                <IconButton 
                  color="error" 
                  onClick={() => onRemoveFromCart(product._id)}
                  sx={{ mt: -1, mr: -1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Total: ₹{totalCost.toFixed(2)}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleCheckoutClick}
          disabled={cart.length === 0 || hasInsufficientBalance || loading}
          size="large"
        >
          {loading ? 'Processing...' : 
           !isLoggedIn ? 'Login to Checkout' : 
           hasInsufficientBalance ? 'Insufficient Balance' : 'Checkout'}
        </Button>
      </Box>
    </Box>
  );
};

export default Cart;
