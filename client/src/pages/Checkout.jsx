import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock } from 'lucide-react';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        customer: formData,
        items: cart,
        total_amount: cartTotal
      };

      const res = await axios.post('http://localhost:5000/api/orders', orderData);

      if (res.status === 201) {
        clearCart(); // Empty the bag
        alert(`Order Placed Successfully! 🎉\nYour Order ID is: #${res.data.orderId}`);
        navigate('/'); // Go back home
      }
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <p className="text-xl font-bold text-gray-500 mb-4">Your bag is empty.</p>
              <button onClick={() => navigate('/')} className="text-gold font-bold hover:underline">Go back to shopping</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 text-center">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEFT: SHIPPING FORM */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Shipping Details
            </h2>
            
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input required name="fullName" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. Arasu K" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input required name="phone" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. 9876543210" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                <textarea required name="address" onChange={handleChange} rows="3" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="Street, Door No, Landmark"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                  <input required name="city" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pincode</label>
                  <input required name="pincode" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" />
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gold/20 sticky top-24">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                 Order Summary
               </h2>

               <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                       <div className="flex items-center gap-3">
                          <div className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                             {item.qty}x
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.sku}</p>
                          </div>
                       </div>
                       <span className="font-bold text-gray-900">₹{(parseFloat(item.price_breakdown?.final_total_price || 0) * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
               </div>

               <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>₹{(cartTotal / 1.03).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-500 text-sm"><span>GST (3%)</span><span>₹{(cartTotal - (cartTotal / 1.03)).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 mt-4 pt-4 border-t border-dashed">
                    <span>Total to Pay</span>
                    <span className="text-gold-dark">₹{cartTotal.toFixed(2)}</span>
                  </div>
               </div>

               <button 
                 type="submit" 
                 form="checkout-form"
                 disabled={loading}
                 className="w-full mt-8 bg-black text-gold py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2"
               >
                 {loading ? 'Processing...' : `Pay ₹${cartTotal.toFixed(2)}`}
                 {!loading && <Lock size={18} />}
               </button>

               <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                 <ShieldCheck size={14} />
                 <span>Payments are SSL Encrypted & Secure</span>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;