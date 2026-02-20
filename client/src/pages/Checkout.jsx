import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, MapPin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Address States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });

  // Fetch user addresses on load
  useEffect(() => {
    if (user) {
        axios.get(`http://localhost:5000/api/auth/addresses/${user.id}`)
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setSavedAddresses(res.data);
                    setSelectedAddress(res.data[0]); // Auto-select default
                    setShowNewAddressForm(false); // Hide manual form
                }
            })
            .catch(err => console.error("Failed to fetch addresses", err));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let formattedAddress = "";
      let customerName = "";

      // 1. Format Address & Extract Name based on selection
      if (showNewAddressForm) {
          formattedAddress = `${formData.fullName}, ${formData.phone} | ${formData.address}, ${formData.city} - ${formData.pincode}`;
          customerName = formData.fullName;
      } else if (selectedAddress) {
          formattedAddress = `${selectedAddress.full_name}, ${selectedAddress.phone} | ${selectedAddress.address}, ${selectedAddress.city} - ${selectedAddress.pincode}`;
          customerName = selectedAddress.full_name;
      } else {
          alert("Please provide a shipping address.");
          setLoading(false);
          return;
      }

      // 2. Prepare the payload with the new customer_name field
      const orderData = {
        user_id: user ? user.id : null,
        customer_name: customerName, // FIX: Provided for DB constraint
        total_amount: cartTotal,
        shipping_address: formattedAddress,
        payment_method: 'CASH_ON_DELIVERY',
        items: cart
      };

      const res = await axios.post('http://localhost:5000/api/orders', orderData);

      if (res.status === 200 || res.status === 201) {
        clearCart(); 
        alert(`Order Placed Successfully! 🎉\nYour Order ID is: #${res.data.orderId}`);
        navigate('/'); 
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to place order. Please try again.');
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
          
          {/* LEFT: SHIPPING FORM (New Address Cards UX) */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Shipping Details
            </h2>
            
            <form id="checkout-form" onSubmit={handleSubmit}>
              
              {/* --- SAVED ADDRESSES --- */}
              {user && savedAddresses.length > 0 && (
                 <div className="mb-6 space-y-3">
                    {savedAddresses.map(addr => (
                       <div 
                         key={addr.id} 
                         onClick={() => { setSelectedAddress(addr); setShowNewAddressForm(false); }}
                         className={`p-4 rounded-lg cursor-pointer transition-all border ${
                            selectedAddress?.id === addr.id && !showNewAddressForm 
                            ? 'border-gold bg-gold/5 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                         }`}
                       >
                          <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3">
                                  <MapPin className={`mt-0.5 ${selectedAddress?.id === addr.id && !showNewAddressForm ? 'text-gold' : 'text-gray-400'}`} size={18} />
                                  <div>
                                      <p className="font-bold text-gray-900 text-sm">{addr.full_name}</p>
                                      <p className="text-xs text-gray-600 mt-1">{addr.address}, {addr.city} - {addr.pincode}</p>
                                      <p className="text-xs font-medium text-gray-800 mt-1">Mobile: {addr.phone}</p>
                                  </div>
                              </div>
                              {selectedAddress?.id === addr.id && !showNewAddressForm && (
                                  <CheckCircle2 size={20} className="text-gold" />
                              )}
                          </div>
                       </div>
                    ))}

                    {!showNewAddressForm && (
                       <button 
                         type="button" 
                         onClick={() => { setShowNewAddressForm(true); setSelectedAddress(null); }} 
                         className="text-xs font-bold text-gold-dark hover:underline mt-2 inline-block"
                       >
                          + Add a new address
                       </button>
                    )}
                 </div>
              )}

              {/* --- MANUAL ENTRY FORM --- */}
              {showNewAddressForm && (
                <div className="space-y-4 pt-2">
                  {user && savedAddresses.length > 0 && (
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-xs font-bold text-gray-500 uppercase">New Address</span>
                         <button 
                           type="button" 
                           onClick={() => { setShowNewAddressForm(false); setSelectedAddress(savedAddresses[0]); }} 
                           className="text-xs text-red-500 hover:underline"
                         >
                            Cancel
                         </button>
                     </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input required={showNewAddressForm} name="fullName" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. Arasu K" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                    <input required={showNewAddressForm} name="phone" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. 9876543210" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                    <textarea required={showNewAddressForm} name="address" onChange={handleChange} rows="3" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="Street, Door No, Landmark"></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                      <input required={showNewAddressForm} name="city" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pincode</label>
                      <input required={showNewAddressForm} name="pincode" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* RIGHT: ORDER SUMMARY (Your Preferred Styling Restored) */}
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