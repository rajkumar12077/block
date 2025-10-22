import React, { useState, useEffect } from 'react';
import axios from './api';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Shop from './pages/Shop';
import ProductsList from './pages/ProductsList';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardRouter from './pages/DashboardRouter';
import EnhancedViewOrderedProduct from './pages/EnhancedViewOrderedProduct';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  
  // Check authentication state on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    
    if (storedToken && storedRole) {
      // Verify token expiration
      try {
        const tokenData = JSON.parse(atob(storedToken.split('.')[1]));
        const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
        
        if (expirationTime > Date.now()) {
          setToken(storedToken);
          setRole(storedRole);
        } else {
          // Token expired, clear storage
          handleLogout();
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        handleLogout();
      }
    }
  }, []);

  const handleAddToCart = (product: any) => {
    setCart(prev => {
      const existingProduct = prev.find(p => p._id === product._id);
      if (existingProduct) {
        return prev.map(p => 
          p._id === product._id 
            ? { ...p, quantity: p.quantity + product.quantity }
            : p
        );
      }
      return [...prev, product];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p._id !== productId));
  };

  const handleLogin = (jwt: string, userRole: string) => {
    setToken(jwt);
    setRole(userRole);
    localStorage.setItem('token', jwt);
    localStorage.setItem('role', userRole);
    // Redirect to dashboard after login
    navigate('/dashboard');
  };

  const handleSignup = async (userData: any) => {
    try {
      const res = await axios.post('/auth/signup', userData);
      if (res.data && res.data.message) {
        return { success: true, message: res.data.message };
      } else {
        return { success: false, message: 'Unexpected response from server' };
      }
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Signup failed' };
    }
  };

  const handleCheckout = () => {
    // This function is called AFTER the Cart component has already processed the orders
    // So we only need to clear the cart and optionally redirect
    console.log('🧹 Clearing cart after successful checkout...');
    setCart([]); // Clear cart after successful checkout
    
    // Optional: Navigate back to shop page (without full page reload)
    navigate('/');
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Agri Supply Chain</Typography>
          <Button color="inherit" component={Link} to="/">Shop</Button>
          {token ? (
            <>
              <Button color="inherit" component={Link} to="/cart">Cart</Button>
              <Button color="inherit" component={Link} to="/orders">Orders</Button>
              <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
              {role === 'seller' && (
                <Button color="inherit" component={Link} to="/products">My Products</Button>
              )}
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">Login</Button>
              <Button color="inherit" component={Link} to="/signup">Signup</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Shop onAddToCart={handleAddToCart} />} />
        
        {/* Auth Routes - only accessible when NOT logged in */}
        {!token && (
          <>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
          </>
        )}
        
        {/* Protected Routes - only accessible when logged in */}
        {token && (
          <>
            <Route path="/cart" element={<Cart cart={cart} onCheckout={handleCheckout} onRemoveFromCart={handleRemoveFromCart} />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/view-order/:orderId" element={<EnhancedViewOrderedProduct />} />
            <Route path="/dashboard" element={<DashboardRouter role={role!} onLogout={handleLogout} />} />
            <Route path="/products" element={<ProductsList />} />
            
            {/* Redirect logged-in users from auth pages to dashboard */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
        
        {/* Fallback routes for unauthenticated users trying to access protected routes */}
        {!token && (
          <>
            <Route path="/cart" element={<Navigate to="/login" replace />} />
            <Route path="/orders" element={<Navigate to="/login" replace />} />
            <Route path="/view-order/:orderId" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/products" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
