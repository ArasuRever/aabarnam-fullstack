import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import axios from 'axios'; // Ensure axios is imported

const Cart = () => {
  const { cart, addToCart, decrementFromCart, removeFromCart, cartTotal, cartCount } = useCart();
  const [productImages, setProductImages] = useState({});

  // 1. Fetch Images for items in Cart
  useEffect(() => {
    const fetchImages = async () => {
      const newImages = {};
      let needsUpdate = false;

      for (const item of cart) {
          // Only fetch if we don't have it yet
          if (!productImages[item.id]) {
              try {
                  const res = await axios.get(`http://localhost:5000/api/products/${item.id}`);
                  newImages[item.id] = res.data.main_image_url;
                  needsUpdate = true;
              } catch (e) {
                  console.error("Failed to load image for item", item.id);
              }
          }
      }

      if (needsUpdate) {
          setProductImages(prev => ({ ...prev, ...newImages }));
      }
    };
    
    if (cart.length > 0) fetchImages();
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="bg-gray-50 p-6 rounded-full mb-6">
            <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Your Bag is Empty</h2>
        <p className="text-gray-500 mb-8 max-w-md">Looks like you haven't found your perfect piece yet. Explore our collection.</p>
        <Link to="/" className="bg-black text-gold px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition">Start Shopping</Link>
      </div>
    );
  }

  const subtotal = cartTotal / 1.03;
  const gst = cartTotal - subtotal;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Shopping Bag ({cartCount})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* LEFT: CART ITEMS */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-6 items-center">
                
                {/* Image: Loaded from local state */}
                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                  {productImages[item.id] ? (
                    <img src={productImages[item.id]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Loading...</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                        <p className="text-xs text-gray-500 font-mono uppercase">{item.sku}</p>
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                        ₹{(parseFloat(item.price_breakdown?.final_total_price || 0) * item.qty).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                     <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <button onClick={() => decrementFromCart(item.id)} className="p-1 hover:bg-white rounded shadow-sm transition"><Minus size={14} /></button>
                        <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => addToCart(item)} className="p-1 hover:bg-white rounded shadow-sm transition"><Plus size={14} /></button>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition flex items-center gap-1 text-xs font-medium">
                        <Trash2 size={14} /> Remove
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-24">
              <h2 className="font-bold text-lg text-gray-900 mb-6 border-b pb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>GST (3%)</span><span>₹{gst.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span className="text-green-600 font-bold">Free</span></div>
              </div>
              <div className="flex justify-between items-center border-t pt-4 mb-8">
                <span className="font-bold text-xl text-gray-900">Total</span>
                <span className="font-bold text-2xl text-gold-dark">₹{cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => alert("Proceeding to Checkout...")} className="w-full bg-black text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg">
                Checkout Securely <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;