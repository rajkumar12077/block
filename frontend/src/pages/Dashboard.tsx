import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardMedia, Typography, Button } from '@mui/material';
import Grid from '@mui/material/Grid';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
}

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    axios.get('/api/product/public').then(res => setProducts(res.data));
  }, []);

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 2 }}>Product List</Typography>
      <Grid container spacing={2}>
        {products.map(product => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Card>
              <CardMedia component="img" height="140" image={product.image} alt={product.name} />
              <CardContent>
                <Typography variant="h6">{product.name}</Typography>
                <Typography variant="body2">Category: {product.category}</Typography>
                <Typography variant="body2">Price: ₹{product.price}</Typography>
                <Typography variant="body2">In Stock: {product.quantity}</Typography>
                {/* Add-to-cart or other actions can be added here */}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default Dashboard;
