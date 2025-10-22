import React, { useEffect, useState } from 'react';
import { ShoppingCart, Heart, Star, TrendingUp, Package } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
}

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    {
      _id: '1',
      name: 'Premium Wireless Headphones',
      category: 'Electronics',
      price: 299.99,
      quantity: 15,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'
    },
    {
      _id: '2',
      name: 'Minimalist Watch',
      category: 'Accessories',
      price: 199.99,
      quantity: 8,
      image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=300&fit=crop'
    },
    {
      _id: '3',
      name: 'Smart Water Bottle',
      category: 'Health',
      price: 89.99,
      quantity: 23,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop'
    },
    {
      _id: '4',
      name: 'Ergonomic Desk Lamp',
      category: 'Home',
      price: 149.99,
      quantity: 12,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'
    },
    {
      _id: '5',
      name: 'Yoga Mat Premium',
      category: 'Fitness',
      price: 79.99,
      quantity: 30,
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop'
    },
    {
      _id: '6',
      name: 'Coffee Maker Deluxe',
      category: 'Kitchen',
      price: 249.99,
      quantity: 6,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop'
    }
  ]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Simulate API call with mock data
  useEffect(() => {
    // axios.get('/api/product/public').then(res => setProducts(res.data));
  }, []);

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (favorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity > 20) return { text: 'In Stock', color: 'text-emerald-500', bg: 'bg-emerald-100' };
    if (quantity > 10) return { text: 'Limited', color: 'text-amber-500', bg: 'bg-amber-100' };
    return { text: 'Low Stock', color: 'text-red-500', bg: 'bg-red-100' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-3/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <Package className="w-6 h-6 text-purple-300" />
            <span className="text-white/80 font-medium">Product Showcase</span>
          </div>
          
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Premium Collection
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Discover our curated selection of premium products designed for the modern lifestyle
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Products', value: products.length, icon: Package, color: 'from-blue-500 to-cyan-500' },
            { label: 'Categories', value: new Set(products.map(p => p.category)).size, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
            { label: 'In Stock Items', value: products.filter(p => p.quantity > 0).length, icon: Star, color: 'from-emerald-500 to-teal-500' }
          ].map((stat, index) => (
            <div key={index} className="group">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => {
            const stockStatus = getStockStatus(product.quantity);
            const isHovered = hoveredCard === product._id;
            
            return (
              <div
                key={product._id}
                className="group relative"
                onMouseEnter={() => setHoveredCard(product._id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:bg-white/15 hover:shadow-2xl hover:shadow-purple-500/20 ${isHovered ? 'transform -translate-y-2' : ''}`}>
                  {/* Image Container */}
                  <div className="relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(product._id)}
                      className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                        favorites.has(product._id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${favorites.has(product._id) ? 'fill-current' : ''}`} />
                    </button>

                    {/* Stock Status Badge */}
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color} backdrop-blur-sm`}>
                      {stockStatus.text}
                    </div>

                    {/* Category Tag */}
                    <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {product.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        ${product.price}
                      </span>
                      <span className="text-white/60 text-sm">
                        {product.quantity} available
                      </span>
                    </div>

                    {/* Action Button */}
                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transform hover:scale-105">
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}></div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-16">
          <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30">
            Load More Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;