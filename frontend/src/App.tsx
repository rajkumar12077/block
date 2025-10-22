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
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Typography, 
  Box, 
  Badge, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  useMediaQuery,
  useTheme,
  Container,
  styled,
  Divider,
  Chip,
  Avatar,
  Tooltip,
  Fade,
  Zoom
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Menu as MenuIcon,
  Storefront as StorefrontIcon,
  Agriculture as AgricultureIcon,
  Close as CloseIcon,
  LocalShipping as LocalShippingIcon,
  Grass as GrassIcon
} from '@mui/icons-material';

// Advanced styled components with modern animations
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)',
  boxShadow: '0 4px 20px rgba(46, 125, 50, 0.3)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1100,
}));

const NavButton = styled(Button)(({ theme }) => ({
  margin: '0 6px',
  textTransform: 'none',
  fontSize: '15px',
  fontWeight: 600,
  color: '#fff !important',
  borderRadius: '12px',
  padding: '10px 20px',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    color: '#fff !important',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  '&:active': {
    color: '#fff !important',
    transform: 'translateY(0px)',
  },
  '&:focus': {
    color: '#fff !important',
  },
  '& .MuiButton-startIcon': {
    color: '#fff !important',
  },
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '12px',
  transition: 'all 0.3s ease',
  position: 'relative',
  '&:hover': {
    transform: 'scale(1.03)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}));

const LogoIcon = styled(AgricultureIcon)(({ theme }) => ({
  fontSize: 40,
  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
    '50%': { transform: 'translateY(-5px) rotate(5deg)' },
  },
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 300,
    background: 'linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)',
    backgroundImage: `
      radial-gradient(circle at 20% 30%, rgba(76,175,80,0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46,125,50,0.1) 0%, transparent 50%)
    `,
  },
}));

const DrawerHeader = styled(Box)(({ theme }) => ({
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
  color: '#fff',
  boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
}));

const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  paddingTop: '64px',
  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 70%, #81c784 100%)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      radial-gradient(circle at 20% 20%, rgba(76,175,80,0.3) 0%, transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(46,125,50,0.2) 0%, transparent 40%),
      radial-gradient(circle at 50% 50%, rgba(129,199,132,0.15) 0%, transparent 50%),
      radial-gradient(circle at 10% 80%, rgba(102,187,106,0.2) 0%, transparent 45%)
    `,
    animation: 'breathe 10s ease-in-out infinite',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 80px,
        rgba(255,255,255,0.05) 80px,
        rgba(255,255,255,0.05) 160px
      )
    `,
    animation: 'slide 25s linear infinite',
    pointerEvents: 'none',
  },
  '@keyframes breathe': {
    '0%, 100%': {
      opacity: 1,
      transform: 'scale(1) rotate(0deg)',
    },
    '50%': {
      opacity: 0.7,
      transform: 'scale(1.1) rotate(2deg)',
    },
  },
  '@keyframes slide': {
    '0%': {
      transform: 'translate(0, 0) rotate(0deg)',
    },
    '100%': {
      transform: 'translate(50px, 50px) rotate(5deg)',
    },
  },
}));

const FloatingLeaf = styled(Box)<{ delay?: number }>(({ theme, delay = 0 }) => ({
  position: 'absolute',
  animation: `leafFloat 15s ease-in-out infinite ${delay}s`,
  opacity: 0.15,
  pointerEvents: 'none',
  '@keyframes leafFloat': {
    '0%, 100%': {
      transform: 'translate(0, 0) rotate(0deg)',
      opacity: 0,
    },
    '10%': {
      opacity: 0.15,
    },
    '90%': {
      opacity: 0.15,
    },
    '50%': {
      transform: 'translate(100px, -200px) rotate(180deg)',
    },
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)',
    color: '#fff',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(255, 82, 82, 0.4)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  '@keyframes pulse': {
    '0%, 100%': {
      transform: 'scale(1)',
    },
    '50%': {
      transform: 'scale(1.1)',
    },
  },
}));

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [cart, setCart] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    
    if (storedToken && storedRole) {
      try {
        const tokenData = JSON.parse(atob(storedToken.split('.')[1]));
        const expirationTime = tokenData.exp * 1000;
        
        if (expirationTime > Date.now()) {
          setToken(storedToken);
          setRole(storedRole);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        handleLogout();
      }
    }
  }, []);

  const handleAddToCart = (product: any) => {
    // Add the product to cart without any authentication check
    // This allows non-logged-in users to add products to cart
    setCart(prev => [...prev, product]);
  };
  
  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };
  
  const updateCartItemQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const newQuantity = Math.max(1, item.quantity + change); // Ensure quantity is at least 1
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleLogin = (jwt: string, userRole: string) => {
    setToken(jwt);
    setRole(userRole);
    localStorage.setItem('token', jwt);
    localStorage.setItem('role', userRole);
    
    // Extract and store user name from JWT token
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      if (payload.name) {
        localStorage.setItem('userName', payload.name);
        console.log('Stored user name in localStorage:', payload.name);
      } else {
        console.warn('No name found in JWT payload');
      }
      
      // Store user ID as well
      if (payload.sub) {
        localStorage.setItem('userId', payload.sub);
        console.log('Stored user ID in localStorage:', payload.sub);
      }
      
      // Log the entire payload for debugging
      console.log('JWT payload:', payload);
    } catch (e) {
      console.error('Failed to parse JWT token:', e);
    }
    
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

  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // If user is not logged in or cart is empty, redirect to login page
      if (!token) {
        navigate('/login');
        return;
      }
      
      if (!cart.length) return;

      for (const item of cart) {
        try {
          await axios.post('/order', {
            productId: item._id,
            productName: item.name,
            price: item.price,
            quantity: item.quantity,
            sellerId: item.sellerId,
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err: any) {
          const errorMessage = err?.response?.data?.message || `Failed to checkout ${item.name}`;
          throw new Error(errorMessage);
        }
      }

      setCart([]);
      alert('Checkout completed successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Checkout failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete checkout. Please try again.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const mobileMenuItems = () => (
    <>
      <DrawerHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AgricultureIcon sx={{ fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
        </Box>
        <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DrawerHeader>
      
      <List sx={{ pt: 2, px: 1 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            component={Link} 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            sx={{
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(46, 125, 50, 0.15)',
                transform: 'translateX(8px)',
              },
            }}
          >
            <ListItemIcon><StorefrontIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
            <ListItemText primary="Shop" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItemButton>
        </ListItem>
        
        {token ? (
          <>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                component={Link} 
                to="/cart" 
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon>
                  <StyledBadge badgeContent={cart.length} color="error">
                    <ShoppingCartIcon sx={{ color: '#2e7d32' }} />
                  </StyledBadge>
                </ListItemIcon>
                <ListItemText primary="Cart" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
            
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                component={Link} 
                to="/orders" 
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon><LocalShippingIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
                <ListItemText primary="Orders" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
            
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                component={Link} 
                to="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon><DashboardIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
                <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
            
            {role === 'seller' && (
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton 
                  component={Link} 
                  to="/products" 
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(46, 125, 50, 0.15)',
                      transform: 'translateX(8px)',
                    },
                  }}
                >
                  <ListItemIcon><InventoryIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
                  <ListItemText primary="My Products" primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              </ListItem>
            )}
            
            <Divider sx={{ my: 2, borderColor: 'rgba(46, 125, 50, 0.2)' }} />
            
            {role && (
              <ListItem sx={{ justifyContent: 'center', mb: 2 }}>
                <Chip 
                  label={role.toUpperCase()} 
                  size="medium" 
                  sx={{
                    background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
                  }}
                  icon={<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 24, height: 24 }}>
                    {role.charAt(0).toUpperCase()}
                  </Avatar>}
                />
              </ListItem>
            )}
            
            <ListItem disablePadding sx={{ px: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
                  borderRadius: '12px',
                  py: 1.5,
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(211, 47, 47, 0.4)',
                  },
                }}
              >
                Logout
              </Button>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                component={Link} 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon><LoginIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
                <ListItemText primary="Login" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
            
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                to="/signup" 
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon><PersonAddIcon sx={{ color: '#2e7d32' }} /></ListItemIcon>
                <ListItemText primary="Signup" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </>
  );

  return (
    <Box>
      <StyledAppBar>
        <Toolbar sx={{ py: 0.5 }}>
          <LogoBox onClick={() => navigate('/')} sx={{ flexGrow: 1 }}>
            <LogoIcon />
            <Box>
              <Typography variant="h6" component="div" sx={{ 
                fontWeight: 700, 
                lineHeight: 1.2,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                letterSpacing: '0.5px'
              }}>
                Agri Supply Chain
              </Typography>
              <Typography variant="caption" sx={{ 
                opacity: 0.9,
                fontWeight: 500,
                letterSpacing: '1px'
              }}>
                🌾 Farm to Market
              </Typography>
            </Box>
          </LogoBox>
          
          {isMobile ? (
            <IconButton 
              color="inherit" 
              edge="end" 
              onClick={toggleMobileMenu}
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  transform: 'rotate(90deg)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, }}>
              <Tooltip title="Browse Products" TransitionComponent={Zoom} arrow>
                <NavButton component={Link} to="/" startIcon={<StorefrontIcon />}>
                  Shop
                </NavButton>
              </Tooltip>
              
              {token ? (
                <>
                  <Tooltip title="View Cart" TransitionComponent={Zoom} arrow>
                    <NavButton component={Link} to="/cart">
                      <StyledBadge badgeContent={cart.length} color="error">
                        <ShoppingCartIcon />
                      </StyledBadge>
                      <Box sx={{ ml: 1 }}>Cart</Box>
                    </NavButton>
                  </Tooltip>
                  
                  <Tooltip title="My Orders" TransitionComponent={Zoom} arrow>
                    <NavButton component={Link} to="/orders" startIcon={<LocalShippingIcon />}>
                      Orders
                    </NavButton>
                  </Tooltip>
                  
                  <Tooltip title="Dashboard" TransitionComponent={Zoom} arrow>
                    <NavButton component={Link} to="/dashboard" startIcon={<DashboardIcon />}>
                      Dashboard
                    </NavButton>
                  </Tooltip>
                  
                  {role === 'seller' && (
                    <Tooltip title="Manage Products" TransitionComponent={Zoom} arrow>
                      <NavButton component={Link} to="/products" startIcon={<InventoryIcon />}>
                        My Products
                      </NavButton>
                    </Tooltip>
                  )}
                  
                  {role && (
                    <Zoom in={true}>
                      <Chip 
                        label={role.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          mx: 1, 
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                          color: '#fff',
                          fontWeight: 700,
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }} 
                        avatar={<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)' }}>
                          {role.charAt(0).toUpperCase()}
                        </Avatar>}
                      />
                    </Zoom>
                  )}
                  
                  <Tooltip title="Sign Out" TransitionComponent={Zoom} arrow>
                    <Button 
                      color="inherit" 
                      onClick={handleLogout} 
                      startIcon={<LogoutIcon />}
                      variant="outlined"
                      sx={{ 
                        ml: 1,
                        borderRadius: '12px',
                        borderColor: 'rgba(255,255,255,0.3)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: '#fff',
                          bgcolor: 'rgba(255,255,255,0.15)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }
                      }}
                    >
                      Logout
                    </Button>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Sign In" TransitionComponent={Zoom} arrow>
                    <NavButton component={Link} to="/login" startIcon={<LoginIcon />}>
                      Login
                    </NavButton>
                  </Tooltip>
                  <Tooltip title="Create Account" TransitionComponent={Zoom} arrow>
                    <NavButton component={Link} to="/signup" startIcon={<PersonAddIcon />}>
                      Signup
                    </NavButton>
                  </Tooltip>
                </>
              )}
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>

      <StyledDrawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        {mobileMenuItems()}
      </StyledDrawer>

      <PageContainer>
        {/* Floating decorative elements */}
        <FloatingLeaf sx={{ top: '10%', left: '5%' }} delay={0}>
          <GrassIcon sx={{ fontSize: 60, color: '#2e7d32' }} />
        </FloatingLeaf>
        <FloatingLeaf sx={{ top: '30%', right: '10%' }} delay={3}>
          <GrassIcon sx={{ fontSize: 50, color: '#388e3c' }} />
        </FloatingLeaf>
        <FloatingLeaf sx={{ top: '60%', left: '15%' }} delay={6}>
          <GrassIcon sx={{ fontSize: 55, color: '#43a047' }} />
        </FloatingLeaf>
        <FloatingLeaf sx={{ top: '80%', right: '20%' }} delay={9}>
          <GrassIcon sx={{ fontSize: 45, color: '#66bb6a' }} />
        </FloatingLeaf>
        
        <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
          <Fade in={true} timeout={800}>
            <Box>
              <Routes>
                <Route path="/" element={<Shop onAddToCart={handleAddToCart} />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
                
                {/* Allow non-logged-in users to access the cart page */}
                <Route path="/cart" element={<Cart cart={cart} onCheckout={handleCheckout} onRemoveFromCart={handleRemoveFromCart} onUpdateQuantity={updateCartItemQuantity} />} />
                
                {token && (
                  <>
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/view-order/:orderId" element={<EnhancedViewOrderedProduct />} />
                    <Route path="/dashboard" element={<DashboardRouter role={role!} onLogout={handleLogout} />} />
                    <Route path="/products" element={<ProductsList />} />
                  </>
                )}
                {!token && (
                  <>
                    <Route path="/orders" element={<Navigate to="/login" replace />} />
                    <Route path="/view-order/:orderId" element={<Navigate to="/login" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/login" replace />} />
                    <Route path="/products" element={<Navigate to="/login" replace />} />
                  </>
                )}
              </Routes>
            </Box>
          </Fade>
        </Container>
      </PageContainer>
    </Box>
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