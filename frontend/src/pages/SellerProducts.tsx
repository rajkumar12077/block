import React, { useEffect, useState } from 'react';
import axios from '../api';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { Grid } from '@mui/material';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
}


const SellerProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('User not found. Please log in again.');
      setLoading(false);
      return;
    }

    // Get seller ID from JWT token
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const sellerId = tokenData.sub;

    // Use the seller-specific endpoint instead of filtering on frontend
    axios.get(`/product/seller/${sellerId}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch products.');
        setLoading(false);
      });
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (products.length === 0) return <Typography>No products found.</Typography>;

  return (
    <Grid container spacing={2}>
      {products.map(product => (
        <Grid item key={product._id} xs={12} sm={6} md={4}>
          <Card>
            <CardMedia component="img" height="140" image={product.image} alt={product.name} />
            <CardContent>
              <Typography variant="h6">{product.name}</Typography>
              <Typography variant="body2">Category: {product.category}</Typography>
              <Typography variant="body2">Price: ₹{product.price}</Typography>
              <Typography variant="body2">In Stock: {product.quantity}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SellerProducts;
