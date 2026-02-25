import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, MapPin, CheckCircle2, Clock, Landmark, Smartphone, CreditCard, Banknote, Gift, Sparkles } from 'lucide-react';
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

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  // 🌟 NEW: Gifting States
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [giftSender, setGiftSender] = useState('');

  // Expiry Timer State
  const [timeLeft, setTimeLeft] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '', phone: '', address: '', city: '', pincode: '',
  });

  // --- LIVE EXPIRY COUNTDOWN LOGIC ---
  useEffect(() => {
    if (cart.length === 0) return;
    
    const oldestItem = cart.reduce((oldest, item) => {
        if (!item.locked_at) return oldest; 
        return (!oldest.locked_at || item.locked_at < oldest.locked_at) ? item : oldest;
    }, cart[0]);

    if (!oldestItem.locked_at) return;

    const BASE_DURATION = 30 * 60 * 1000; 
    const GRACE_DURATION = 3 * 60 * 1000; 
    
    const timer = setInterval(() => {
        const timeElapsed = Date.now() - oldestItem.locked_at;

        if (timeElapsed >= (BASE_DURATION + GRACE_DURATION)) {
            clearInterval(timer);
            setTimeLeft({ status: "Expired" });
        } else if (timeElapsed >= BASE_DURATION) {
            const remainingGrace = (BASE_DURATION + GRACE_DURATION) - timeElapsed;
            const minutes = Math.floor(remainingGrace / 60000);
            const seconds = Math.floor((remainingGrace % 60000) / 1000);
            setTimeLeft({ status: "Grace", text: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` });
        } else {
            const remaining = BASE_DURATION - timeElapsed;
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setTimeLeft({ status: "Normal", text: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` });
        }
    }, 1000);

    return () => clearInterval(timer);
  }, [cart]);

  useEffect(() => {
    if (user) {
        axios.get(`http://localhost:5000/api/auth/addresses/${user.id}`)
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setSavedAddresses(res.data);
                    setSelectedAddress(res.data[0]); 
                    setShowNewAddressForm(false); 
                }
            })
            .catch(err => console.error("Failed to fetch addresses", err));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- DYNAMIC FEE CALCULATION ---
  const gatewayFee = paymentMethod === 'CARD' ? cartTotal * 0.02 : 0;
  const finalPayableAmount = cartTotal + gatewayFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let customerName = ""; let customerPhone = ""; let rawAddress = ""; let rawCity = ""; let rawPincode = "";

      if (showNewAddressForm) {
          customerName = formData.fullName; customerPhone = formData.phone; rawAddress = formData.address; rawCity = formData.city; rawPincode = formData.pincode;
      } else if (selectedAddress) {
          customerName = selectedAddress.full_name; customerPhone = selectedAddress.phone; rawAddress = selectedAddress.address; rawCity = selectedAddress.city; rawPincode = selectedAddress.pincode;
      } else {
          alert("Please provide a shipping address.");
          setLoading(false); return;
      }

      const orderData = {
        user_id: user ? user.id : null,
        customer_name: customerName, 
        phone_number: customerPhone, 
        address: rawAddress,
        city: rawCity,
        pincode: rawPincode,
        total_amount: finalPayableAmount.toFixed(2),
        payment_method: paymentMethod, 
        // 🌟 NEW: Pass gifting details to backend
        is_gift: isGift,
        gift_message: isGift ? giftMessage : null,
        gift_sender: isGift ? giftSender : null,
        items: cart
      };

      const res = await axios.post('http://localhost:5000/api/orders', orderData);

      if (res.status === 200 || res.status === 201) {
        clearCart(); 
        if (paymentMethod === 'BANK_TRANSFER') {
            alert(`Order Placed Successfully! 🎉\nYour Order ID is: #${res.data.orderId}\n\nPlease check your email/account for our Bank Account details to transfer the funds.`);
        } else {
            alert(`Order Placed Successfully! 🎉\nYour Order ID is: #${res.data.orderId}`);
        }
        navigate('/account'); 
      }
    } catch (err) {
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
          
          <div className="space-y-8">
            {/* 1. SHIPPING DETAILS */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                Shipping Details
              </h2>
              
              <form id="checkout-form" onSubmit={handleSubmit}>
                {user && savedAddresses.length > 0 && (
                   <div className="mb-6 space-y-3">
                      {savedAddresses.map(addr => (
                         <div 
                           key={addr.id} 
                           onClick={() => { setSelectedAddress(addr); setShowNewAddressForm(false); }}
                           className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedAddress?.id === addr.id && !showNewAddressForm ? 'border-gold bg-gold/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
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
                                {selectedAddress?.id === addr.id && !showNewAddressForm && <CheckCircle2 size={20} className="text-gold" />}
                            </div>
                         </div>
                      ))}
                      {!showNewAddressForm && (
                         <button type="button" onClick={() => { setShowNewAddressForm(true); setSelectedAddress(null); }} className="text-xs font-bold text-gold-dark hover:underline mt-2 inline-block">+ Add a new address</button>
                      )}
                   </div>
                )}

                {showNewAddressForm && (
                  <div className="space-y-4 pt-2">
                    {user && savedAddresses.length > 0 && (
                       <div className="flex justify-between items-center mb-2">
                           <span className="text-xs font-bold text-gray-500 uppercase">New Address</span>
                           <button type="button" onClick={() => { setShowNewAddressForm(false); setSelectedAddress(savedAddresses[0]); }} className="text-xs text-red-500 hover:underline">Cancel</button>
                       </div>
                    )}
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label><input required={showNewAddressForm} name="fullName" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. Arasu K" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label><input required={showNewAddressForm} name="phone" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. 9876543210" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label><textarea required={showNewAddressForm} name="address" onChange={handleChange} rows="3" className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="Street, Door No, Landmark"></textarea></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label><input required={showNewAddressForm} name="city" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" /></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pincode</label><input required={showNewAddressForm} name="pincode" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" /></div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* 🌟 2. DIGITAL GIFTING EXPERIENCE */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Gifting Options
                 </h2>
                 <label className="flex items-center cursor-pointer">
                   <div className="relative">
                     <input type="checkbox" className="sr-only" checked={isGift} onChange={() => setIsGift(!isGift)} />
                     <div className={`block w-10 h-6 rounded-full transition-colors ${isGift ? 'bg-gold' : 'bg-gray-200'}`}></div>
                     <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isGift ? 'transform translate-x-4' : ''}`}></div>
                   </div>
                 </label>
               </div>

               {!isGift && (
                  <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <Gift size={18} className="text-gray-400" />
                    <p>Make it special. Add a personalized digital note for the recipient.</p>
                  </div>
               )}

               {isGift && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-gradient-to-r from-gold/20 via-gold/5 to-transparent p-4 rounded-lg border border-gold/30 flex items-start gap-3 mb-4">
                       <Sparkles className="text-gold flex-shrink-0 mt-0.5" size={18} />
                       <p className="text-xs text-gray-700 leading-relaxed">
                         <strong>The Aura Experience:</strong> Your recipient will find a beautiful QR code inside their luxury box. Scanning it will reveal your personalized message and their BIS Authenticity Certificate. Prices will be hidden.
                       </p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name (Sender)</label>
                      <input 
                         type="text" value={giftSender} onChange={(e) => setGiftSender(e.target.value)}
                         className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-gold shadow-sm" 
                         placeholder="e.g. With love, Priya" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Message</label>
                      <textarea 
                         value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)}
                         rows="3" maxLength="400"
                         className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-gold shadow-sm" 
                         placeholder="Type your heartfelt message here..."
                      ></textarea>
                      <p className="text-right text-[10px] text-gray-400 mt-1">{giftMessage.length} / 400</p>
                    </div>
                  </div>
               )}
            </div>

            {/* 3. HYBRID PAYMENT OPTIONS */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="bg-black text-gold w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                  Payment Method
               </h2>
               
               <div className="space-y-3">
                  {/* Bank Transfer */}
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'}`}>
                     <input type="radio" name="payment" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-gold focus:ring-gold" />
                     <div className="flex-1">
                        <p className="font-bold text-gray-900 flex items-center gap-2"><Landmark size={18}/> Bank Transfer (NEFT/RTGS)</p>
                        <p className="text-xs text-gray-500 mt-1">Directly transfer to our current account. Best for high-value purchases.</p>
                     </div>
                     <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">0% Fee</span>
                  </label>

                  {/* UPI */}
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'UPI' ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'}`}>
                     <input type="radio" name="payment" value="UPI" checked={paymentMethod === 'UPI'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-gold focus:ring-gold" />
                     <div className="flex-1">
                        <p className="font-bold text-gray-900 flex items-center gap-2"><Smartphone size={18}/> UPI (GPay, PhonePe, Paytm)</p>
                        <p className="text-xs text-gray-500 mt-1">Instant transfer using your UPI app. Limits may apply.</p>
                     </div>
                     <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">0% Fee</span>
                  </label>

                  {/* Credit Card */}
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'CARD' ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'}`}>
                     <input type="radio" name="payment" value="CARD" checked={paymentMethod === 'CARD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-gold focus:ring-gold" />
                     <div className="flex-1">
                        <p className="font-bold text-gray-900 flex items-center gap-2"><CreditCard size={18}/> Credit / Debit Card</p>
                        <p className="text-xs text-gray-500 mt-1">Visa, Mastercard, RuPay.</p>
                     </div>
                     <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded">+2% Gateway Fee</span>
                  </label>

                  {/* COD */}
                  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'}`}>
                     <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-gold focus:ring-gold" />
                     <div className="flex-1">
                        <p className="font-bold text-gray-900 flex items-center gap-2"><Banknote size={18}/> Cash on Delivery</p>
                        <p className="text-xs text-gray-500 mt-1">Pay when your jewelry is delivered safely to your hands.</p>
                     </div>
                  </label>
               </div>
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gold/20 sticky top-24">
               
               {timeLeft && timeLeft.status !== "Expired" && (
                   <div className={`p-3.5 rounded-lg flex items-center justify-between mb-6 shadow-sm border ${timeLeft.status === 'Grace' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                       <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${timeLeft.status === 'Grace' ? 'text-orange-700' : 'text-red-700'}`}>
                           <Clock size={16} className="animate-pulse" /> 
                           <span>{timeLeft.status === 'Grace' ? 'Payment Grace Period' : 'Price Lock Expiring'}</span>
                       </div>
                       <span className={`bg-white border px-2.5 py-1 rounded shadow-sm font-mono font-bold text-sm tracking-widest ${timeLeft.status === 'Grace' ? 'border-orange-100 text-orange-700' : 'border-red-100 text-red-700'}`}>
                           {timeLeft.text}
                       </span>
                   </div>
               )}

               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 Order Summary
               </h2>

               <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                       <div className="flex items-center gap-3">
                          <div className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-gray-600">{item.qty}x</div>
                          <div><p className="font-bold text-gray-800 line-clamp-1 pr-2">{item.name}</p><p className="text-[10px] text-gray-400 font-mono">{item.sku}</p></div>
                       </div>
                       <span className="font-bold text-gray-900">₹{(parseFloat(item.price_breakdown?.final_total_price || 0) * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
               </div>

               <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>₹{(cartTotal / 1.03).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-500 text-sm"><span>GST (3%)</span><span>₹{(cartTotal - (cartTotal / 1.03)).toFixed(2)}</span></div>
                  
                  {/* DYNAMIC CARD FEE DISPLAY */}
                  {paymentMethod === 'CARD' && (
                     <div className="flex justify-between text-red-600 text-sm font-bold pt-2 animate-fade-in">
                        <span>Card Gateway Fee (2%)</span>
                        <span>+ ₹{gatewayFee.toFixed(2)}</span>
                     </div>
                  )}

                  <div className="flex justify-between text-xl font-bold text-gray-900 mt-4 pt-4 border-t border-dashed">
                    <span>Total to Pay</span>
                    <span className="text-gold-dark transition-all duration-300">₹{finalPayableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>

               <button 
                 type="submit" form="checkout-form" disabled={loading}
                 className="w-full mt-8 bg-black text-gold py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2"
               >
                 {loading ? 'Processing...' : (paymentMethod === 'BANK_TRANSFER' ? `Lock Order — ₹${finalPayableAmount.toLocaleString('en-IN')}` : `Pay ₹${finalPayableAmount.toLocaleString('en-IN')}`)}
                 {!loading && <Lock size={18} />}
               </button>

               <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                 <ShieldCheck size={14} /><span>Payments are SSL Encrypted & Secure</span>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;