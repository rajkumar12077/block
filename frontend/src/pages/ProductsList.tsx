import React, { useEffect, useState } from 'react';
import axios from '../api';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import Pagination from '@mui/material/Pagination';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
}

const ITEMS_PER_PAGE = 6;

const ProductsList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [editDialog, setEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    image: ''
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(atob(token!.split('.')[1]));
        const response = await axios.get(`/product/seller/${user.sub}?page=${page}&limit=${ITEMS_PER_PAGE}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(response.data.products);
        setTotalProducts(response.data.total);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };

    fetchProducts();
  }, [page]);

  const handleDelete = async (productId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(products.filter(p => p._id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      category: product.category,
      image: product.image
    });
    setEditDialog(true);
    setEditError('');
    setEditSuccess('');
  };

  const handleQuickQuantityUpdate = async (productId: string, change: number) => {
    try {
      const token = localStorage.getItem('token');
      const product = products.find(p => p._id === productId);
      if (!product) return;
      
      const newQuantity = Math.max(0, product.quantity + change);
      
      await axios.put(`/product/${productId}`, {
        ...product,
        quantity: newQuantity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProducts(products.map(p => 
        p._id === productId ? { ...p, quantity: newQuantity } : p
      ));
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleSaveEdit = async () => {
    setEditError('');
    setEditSuccess('');
    
    if (!editingProduct) return;
    
    if (!editForm.name || !editForm.description || !editForm.price || !editForm.quantity || !editForm.category) {
      setEditError('All fields are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updatedProduct = {
        ...editingProduct,
        name: editForm.name,
        description: editForm.description,
        price: Number(editForm.price),
        quantity: Number(editForm.quantity),
        category: editForm.category,
        image: editForm.image
      };

      await axios.put(`/product/${editingProduct._id}`, updatedProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProducts(products.map(p => 
        p._id === editingProduct._id ? updatedProduct : p
      ));
      
      setEditSuccess('Product updated successfully');
      setTimeout(() => {
        setEditDialog(false);
        setEditingProduct(null);
      }, 1000);
    } catch (error: any) {
      setEditError(error?.response?.data?.message || 'Failed to update product');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>My Products</Typography>
      <Grid container spacing={2}>
        {products.map(product => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Card>
              {product.image && (
                <CardMedia component="img" height="140" image={product.image} alt={product.name} />
              )}
              <CardContent>
                <Typography variant="h6">{product.name}</Typography>
                <Typography variant="body2">Category: {product.category}</Typography>
                <Typography variant="body2">Price: ₹{product.price}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>In Stock: {product.quantity}</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleQuickQuantityUpdate(product._id, -1)}
                    disabled={product.quantity <= 0}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleQuickQuantityUpdate(product._id, 1)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {product.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(product)}
                    sx={{ flex: 1 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error" 
                    onClick={() => handleDelete(product._id)}
                    sx={{ flex: 1 }}
                  >
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination 
          count={Math.ceil(totalProducts / ITEMS_PER_PAGE)}
          page={page + 1}
          onChange={(_event, value) => setPage(value - 1)}
          color="primary"
        />
      </Box>

      {/* Edit Product Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <TextField
            label="Product Name"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={editForm.description}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Price"
              type="number"
              fullWidth
              margin="normal"
              value={editForm.price}
              onChange={e => setEditForm({ ...editForm, price: e.target.value })}
            />
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              margin="normal"
              value={editForm.quantity}
              onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
            />
          </Box>
          <TextField
            label="Category"
            fullWidth
            margin="normal"
            value={editForm.category}
            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
          />
          <TextField
            label="Image URL"
            fullWidth
            margin="normal"
            value={editForm.image}
            onChange={e => setEditForm({ ...editForm, image: e.target.value })}
          />
          {editError && <Typography color="error" sx={{ mt: 2 }}>{editError}</Typography>}
          {editSuccess && <Typography color="success" sx={{ mt: 2 }}>{editSuccess}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsList;