import React, { useEffect, useState, useMemo } from 'react';
import axios from '../api';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import { GridContainer, GridItem } from '../components/GridHelpers';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Zoom from '@mui/material/Zoom';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { 
  AddCircleOutline, 
  RemoveCircleOutline, 
  ShoppingCart, 
  Inventory,
  Search,
  FilterList,
  TrendingUp,
  LocalOffer,
  Favorite,
  FavoriteBorder,
  Payment,
  AccountBalanceWallet
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
}

const ITEMS_PER_PAGE = 6;

// Keyframe animations
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled Components
const StyledCard = styled(Card)(() => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
  backdropFilter: 'blur(10px)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.5s ease',
  },
  '&:hover': {
    transform: 'translateY(-16px) scale(1.02)',
    boxShadow: '0 24px 48px rgba(102, 126, 234, 0.25)',
    '&::before': {
      transform: 'scaleX(1)',
    },
    '& .product-image': {
      transform: 'scale(1.1) rotate(0deg)',
    },
    '& .hover-overlay': {
      opacity: 1,
    },
    '& .quick-actions': {
      opacity: 1,
      transform: 'translateY(0)',
    },
    '& .favorite-btn': {
      opacity: 1,
      transform: 'scale(1)',
    }
  },
}));

const StyledCardMedia = styled('div')({
  height: 280,
  width: '100%',
  minHeight: 280,
  maxHeight: 280,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
});

const HoverOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(180deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.8) 100%)',
  opacity: 0,
  transition: 'opacity 0.5s ease',
  zIndex: 1,
});

const QuickActionsBox = styled(Box)({
  position: 'absolute',
  bottom: 16,
  left: 16,
  right: 16,
  zIndex: 2,
  opacity: 0,
  transform: 'translateY(30px)',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  gap: 8,
});

const StockBadge = styled(Chip)(() => ({
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 2,
  fontWeight: 700,
  backdropFilter: 'blur(12px)',
  backgroundColor: 'rgba(114, 128, 153, 0.95)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  border: '1px solid rgba(255,255,255,0.5)',
  animation: `${pulse} 2s ease-in-out infinite`,
}));

const FavoriteButton = styled(IconButton)(() => ({
  position: 'absolute',
  top: 16,
  left: 16,
  zIndex: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  opacity: 0,
  transform: 'scale(0.8)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: '#fff',
    transform: 'scale(1.1)',
  }
}));

const CategoryChip = styled(Chip)(() => ({
  fontWeight: 600,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  marginBottom: 12,
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
  },
  transition: 'all 0.3s ease',
}));

const PriceTypography = styled(Typography)(() => ({
  fontSize: '2rem',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  backgroundSize: '200% 200%',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginTop: 8,
  marginBottom: 16,
  letterSpacing: '-0.5px',
}));

const QuantityBox = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
  borderRadius: '28px',
  padding: '6px 16px',
  transition: 'all 0.3s ease',
  border: '2px solid transparent',
  '&:hover': {
    background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
    borderColor: '#667eea',
    transform: 'scale(1.05)',
  }
}));

const StyledIconButton = styled(IconButton)(() => ({
  transition: 'all 0.3s ease',
  color: '#667eea',
  '&:hover': {
    transform: 'scale(1.3) rotate(90deg)',
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
  },
  '&:disabled': {
    color: '#ccc',
  }
}));

const AddToCartButton = styled(Button)(() => ({
  borderRadius: '28px',
  padding: '10px 28px',
  fontWeight: 700,
  textTransform: 'none',
  fontSize: '0.95rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  transition: 'all 0.4s ease',
  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    transition: 'left 0.5s ease',
  },
  '&:hover': {
    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    transform: 'scale(1.08)',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.5)',
    '&::before': {
      left: '100%',
    }
  },
  '&:disabled': {
    background: '#cccccc',
    boxShadow: 'none',
  }
}));

const BuyNowButton = styled(Button)(() => ({
  borderRadius: '28px',
  padding: '10px 28px',
  fontWeight: 700,
  textTransform: 'none',
  fontSize: '0.95rem',
  background: 'linear-gradient(135deg, #00c853 0%, #009624 100%)',
  transition: 'all 0.4s ease',
  boxShadow: '0 4px 16px rgba(0, 200, 83, 0.4)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    transition: 'left 0.5s ease',
  },
  '&:hover': {
    background: 'linear-gradient(135deg, #009624 0%, #00c853 100%)',
    transform: 'scale(1.08)',
    boxShadow: '0 8px 24px rgba(0, 200, 83, 0.5)',
    '&::before': {
      left: '100%',
    }
  },
  '&:disabled': {
    background: '#cccccc',
    boxShadow: 'none',
  }
}));

const SearchBar = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '28px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: '0 6px 28px rgba(0,0,0,0.12)',
    },
    '&.Mui-focused': {
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
    }
  }
}));

const FilterBox = styled(Box)(() => ({
  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
  borderRadius: '20px',
  padding: '24px',
  marginBottom: '32px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  border: '1px solid rgba(102, 126, 234, 0.1)',
  animation: `${slideUp} 0.6s ease-out`,
}));

const TrendingBadge = styled(Chip)(() => ({
  position: 'absolute',
  top: 60,
  left: 16,
  zIndex: 2,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 12px rgba(245, 87, 108, 0.4)',
}));

const Shop: React.FC<{ onAddToCart: (product: Product) => void }> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [buyNowDialog, setBuyNowDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'wallet'>('upi');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/product/public?page=${page}&limit=${ITEMS_PER_PAGE}`);
        setProducts(res.data.products);
        setTotalProducts(res.data.total);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setSnackbar({ open: true, message: 'Failed to load products', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'stock': return b.quantity - a.quantity;
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [products, searchQuery, categoryFilter, sortBy]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
      setSnackbar({ open: true, message: 'Removed from favorites', severity: 'success' });
    } else {
      newFavorites.add(productId);
      setSnackbar({ open: true, message: 'Added to favorites', severity: 'success' });
    }
    setFavorites(newFavorites);
  };

  const handleAddToCart = (product: Product) => {
    const qty = cartQuantities[product._id] || 0;
    if (qty > 0) {
      // Allow adding to cart without authentication check
      onAddToCart({...product, quantity: qty});
      setCartQuantities({...cartQuantities, [product._id]: 0});
      setSnackbar({ open: true, message: `Added ${qty} ${product.name} to cart`, severity: 'success' });
    }
  };
  
  const handleBuyNow = (product: Product) => {
    const quantity = cartQuantities[product._id] || 0;
    
    // Only proceed if quantity is at least 1
    if (quantity >= 1) {
      setSelectedProduct({...product, quantity});
      setBuyNowDialog(true);
    } else {
      setSnackbar({
        open: true,
        message: 'Please select at least 1 item to purchase',
        severity: 'info'
      });
    }
  };
  
  const handlePayment = async () => {
    if (!selectedProduct) return;
    
    try {
      // Start processing
      setProcessing(true);
      
      // Show processing notification
      setSnackbar({ 
        open: true, 
        message: `Processing ${paymentMethod === 'upi' ? 'UPI' : 'Wallet'} payment...`, 
        severity: 'info' 
      });
      
      // Create order in the backend with required fields
      const orderData = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        quantity: selectedProduct.quantity, // Use the quantity from selected product
        paymentMethod
      };
      
      // Make the API call to create the order
      await axios.post('/order', orderData);
      
      // Successfully placed order
      setProcessing(false);
      setBuyNowDialog(false);
      setSelectedProduct(null);
      setPaymentMethod('upi');
      setUpiId('');
        setSnackbar({ 
          open: true, 
          message: `Successfully purchased ${selectedProduct.quantity} ${selectedProduct.name} using ${paymentMethod === 'upi' ? 'UPI' : 'Wallet'}!`, 
          severity: 'success' 
        });    } catch (error: any) {
      console.error('Payment failed:', error);
      setProcessing(false);
      
      // Handle specific error cases
      if (error.response) {
        if (error.response.status === 401) {
          // Unauthorized - token expired or missing
          setSnackbar({ 
            open: true, 
            message: 'Please log in to complete your purchase', 
            severity: 'error' 
          });
        } else if (error.response.status === 400 && error.response.data?.message?.includes('balance')) {
          // Insufficient balance
          setSnackbar({ 
            open: true, 
            message: 'Insufficient balance. Please add funds to your wallet.', 
            severity: 'error' 
          });
        } else {
          // Other server errors
          setSnackbar({ 
            open: true, 
            message: error.response.data?.message || 'Payment failed. Please try again.', 
            severity: 'error' 
          });
        }
      } else {
        // Network errors or other issues
        setSnackbar({ 
          open: true, 
          message: 'Payment failed. Please check your connection and try again.', 
          severity: 'error' 
        });
      }
    }
  };

  return (
    <Box sx={{ padding: 3, minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)' }}>
      {/* Filter Section */}
      <FilterBox>
        <GridContainer spacing={3}>
          <GridItem xs={12} md={5}>
            <SearchBar
              fullWidth
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
            />
          </GridItem>
          <GridItem xs={12} sm={6} md={3.5}>
            <TextField
              select
              fullWidth
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterList sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '28px' } }}
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </GridItem>
          <GridItem xs={12} sm={6} md={3.5}>
            <TextField
              select
              fullWidth
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TrendingUp sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '28px' } }}
            >
              <MenuItem value="name">Name (A-Z)</MenuItem>
              <MenuItem value="price-low">Price (Low to High)</MenuItem>
              <MenuItem value="price-high">Price (High to Low)</MenuItem>
              <MenuItem value="stock">Stock Level</MenuItem>
            </TextField>
          </GridItem>
        </GridContainer>
      </FilterBox>

      {/* Products Grid */}
      <GridContainer spacing={4}>
        {loading ? (
          Array.from(new Array(ITEMS_PER_PAGE)).map((_, index) => (
            <GridItem xs={12} sm={6} md={4} key={index}>
              <Card sx={{ borderRadius: '20px' }}>
                <Skeleton variant="rectangular" height={280} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={24} width="60%" />
                  <Skeleton variant="rectangular" height={48} sx={{ mt: 2, borderRadius: '28px' }} />
                </CardContent>
              </Card>
            </GridItem>
          ))
        ) : (
          filteredProducts.map((product, index) => (
            <GridItem xs={12} sm={6} md={4} key={product._id}>
              <Zoom in={true} timeout={300 + index * 100}>
                <StyledCard>
                  <Box sx={{ position: 'relative', height: 280, overflow: 'hidden' }}>
                    <StyledCardMedia 
                      style={{ backgroundImage: `url(${product.image})` }}
                      className="product-image"
                    />
                    <HoverOverlay className="hover-overlay" />
                    
                    <FavoriteButton 
                      className="favorite-btn"
                      size="small"
                      onClick={() => toggleFavorite(product._id)}
                    >
                      {favorites.has(product._id) ? 
                        <Favorite sx={{ color: '#f5576c' }} /> : 
                        <FavoriteBorder />
                      }
                    </FavoriteButton>
                    
                    <StockBadge 
                      icon={<Inventory />}
                      label={`${product.quantity} in stock`}
                      size="small"
                      color={product.quantity > 10 ? "success" : product.quantity > 0 ? "warning" : "error"}
                    />
                    
                    {product.quantity < 5 && product.quantity > 0 && (
                      <TrendingBadge 
                        icon={<LocalOffer />}
                        label="Low Stock!"
                        size="small"
                      />
                    )}
                    
                    <QuickActionsBox className="quick-actions">
                      <Tooltip title="Quick view details" TransitionComponent={Zoom}>
                        <Typography variant="caption" sx={{ 
                          color: 'white', 
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                          Premium Quality • Fast Shipping
                        </Typography>
                      </Tooltip>
                    </QuickActionsBox>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, padding: 3 }}>
                    <CategoryChip label={product.category} size="small" />
                    
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 800, 
                        mb: 1,
                        color: '#2d3748',
                        lineHeight: 1.3,
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {product.name}
                    </Typography>
                    
                    <PriceTypography>
                      ₹{product.price.toFixed(2)}
                    </PriceTypography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mt: 2,
                      gap: 2
                    }}>
                      <QuantityBox>
                        <StyledIconButton 
                          size="small" 
                          onClick={() => {
                            const qty = cartQuantities[product._id] || 0;
                            if (qty > 0) {
                              setCartQuantities({...cartQuantities, [product._id]: qty - 1});
                            }
                          }}
                          disabled={!cartQuantities[product._id]}
                        >
                          <RemoveCircleOutline fontSize="small" />
                        </StyledIconButton>
                        
                        <Typography 
                          sx={{ 
                            mx: 2, 
                            fontWeight: 700,
                            minWidth: '24px',
                            textAlign: 'center',
                            fontSize: '1.15rem',
                            color: '#667eea'
                          }}
                        >
                          {cartQuantities[product._id] || 0}
                        </Typography>
                        
                        <StyledIconButton 
                          size="small" 
                          onClick={() => {
                            const qty = cartQuantities[product._id] || 0;
                            if (qty < product.quantity) {
                              setCartQuantities({...cartQuantities, [product._id]: qty + 1});
                            }
                          }}
                          disabled={cartQuantities[product._id] >= product.quantity}
                        >
                          <AddCircleOutline fontSize="small" />
                        </StyledIconButton>
                      </QuantityBox>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                        <AddToCartButton 
                          variant="contained" 
                          startIcon={<ShoppingCart />}
                          onClick={() => handleAddToCart(product)}
                          disabled={!cartQuantities[product._id] || product.quantity === 0}
                          fullWidth
                        >
                          Add to Cart
                        </AddToCartButton>
                        
                        <BuyNowButton
                          variant="contained"
                          startIcon={<Payment />}
                          onClick={() => handleBuyNow(product)}
                          disabled={!cartQuantities[product._id] || cartQuantities[product._id] < 1 || product.quantity === 0}
                          fullWidth
                        >
                          Buy Now
                        </BuyNowButton>
                      </Box>
                    </Box>
                  </CardContent>
                </StyledCard>
              </Zoom>
            </GridItem>
          ))
        )}
      </GridContainer>
      
      {/* Pagination */}
      {!loading && filteredProducts.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 8,
          mb: 4
        }}>
          <Pagination 
            count={Math.ceil(totalProducts / ITEMS_PER_PAGE)}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                minWidth: '44px',
                height: '44px',
                transition: 'all 0.3s ease',
                border: '2px solid transparent',
                '&:hover': {
                  transform: 'scale(1.15)',
                  borderColor: '#667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                },
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }
              }
            }}
          />
        </Box>
      )}

      {/* No Results */}
      {!loading && filteredProducts.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          animation: `${slideUp} 0.6s ease-out`
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: '#667eea',
            mb: 2
          }}>
            No products found
          </Typography>
          <Typography variant="body1" sx={{ color: '#6c757d' }}>
            Try adjusting your filters or search query
          </Typography>
        </Box>
      )}

      {/* Snackbar Notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            borderRadius: '16px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Buy Now Dialog */}
      <Dialog open={buyNowDialog} onClose={() => setBuyNowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Complete Your Purchase</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: 2, 
                    backgroundImage: `url(${selectedProduct.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    mr: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }} 
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedProduct.name}</Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>Category: {selectedProduct.category}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Quantity: {selectedProduct.quantity}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#667eea', mt: 1 }}>
                    ₹{(selectedProduct.price * selectedProduct.quantity).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              
              <DialogContentText sx={{ mb: 3 }}>
                Choose your payment method:
              </DialogContentText>
              
              <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
                <FormLabel component="legend">Payment Method</FormLabel>
                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'upi' | 'wallet')}
                >
                  <FormControlLabel 
                    value="upi" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Payment sx={{ mr: 1 }} color="primary" />
                        <Typography>UPI Payment</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="wallet" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccountBalanceWallet sx={{ mr: 1 }} color="primary" />
                        <Typography>Wallet Balance</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              {paymentMethod === 'upi' && (
                <TextField
                  label="UPI ID"
                  fullWidth
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setBuyNowDialog(false)}
            variant="outlined"
            sx={{ borderRadius: '28px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            variant="contained"
            disabled={paymentMethod === 'upi' && !upiId || processing}
            sx={{ 
              borderRadius: '28px', 
              px: 3,
              background: 'linear-gradient(135deg, #00c853 0%, #009624 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #009624 0%, #00c853 100%)',
              }
            }}
          >
            {processing ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                Processing...
              </Box>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shop;