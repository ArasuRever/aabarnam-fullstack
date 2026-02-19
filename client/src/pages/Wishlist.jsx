import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchWishlist();
  }, [user, navigate]);

  const fetchWishlist = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/wishlist/${user.id}`);
      setWishlist(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await axios.post('http://localhost:5000/api/wishlist/toggle', { user_id: user.id, product_id: productId });
      setWishlist(wishlist.filter(item => item.id !== productId));
      toast.success("Removed from wishlist");
    } catch (err) { toast.error("Failed to remove item"); }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center font-bold text-gray-500">Loading your treasures...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Heart className="text-red-500 fill-red-500" /> My Wishlist
        </h1>

        {wishlist.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Heart size={48} className="text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save items you love here to easily find them later.</p>
            <Link to="/collections/all" className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition inline-block">Explore Collection</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map(product => (
              <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
                  <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </Link>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mb-4">{product.sku}</p>
                  <div className="flex justify-between items-center">
                    <Link to={`/product/${product.id}`} className="text-xs font-bold text-gold hover:underline flex items-center gap-1">View Details <ArrowRight size={12}/></Link>
                    <button onClick={() => removeFromWishlist(product.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;    