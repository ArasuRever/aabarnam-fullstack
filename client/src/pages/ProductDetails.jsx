import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, ShieldCheck, Truck, RotateCcw, 
  Heart, MapPin, Info, X, MessageCircle, Send, Loader2 
} from 'lucide-react';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext'; 
import toast from 'react-hot-toast';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart(); 
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

  // Delivery & UI States
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // --- AI WEBSOCKET STATES ---
  const socketRef = useRef(null);
  const hesitationTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  
  const [showChat, setShowChat] = useState(false);
  const [userBid, setUserBid] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveBreakdown, setLiveBreakdown] = useState(null); // Real-time UI data
  const [dealStatus, setDealStatus] = useState(null); // 'accepted' or null
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(res.data);
        setActiveImage(res.data.main_image_url);
        // Initialize the live breakdown with default DB values (Rounded)
        if (res.data.price_breakdown) {
            setLiveBreakdown({
                ...res.data.price_breakdown,
                final_total_price: Math.round(res.data.price_breakdown.final_total_price)
            });
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching product details");
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // --- WEBSOCKET INITIALIZATION ---
  useEffect(() => {
    if (showChat && !socketRef.current) {
      // Connect to Socket
      socketRef.current = io('http://localhost:5000');
      
      socketRef.current.on('connect', () => {
          socketRef.current.emit('start_negotiation', { product_id: id });
      });

      socketRef.current.on('system_message', (data) => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.text }]);
          resetHesitationTimer();
      });

      socketRef.current.on('ai_typing', (status) => {
          setIsTyping(status);
      });

      socketRef.current.on('price_update', (data) => {
          // AI triggered a live UI update!
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
          
          if (data.status === 'accepted') {
              setDealStatus('accepted');
              toast.success("Deal Accepted! Price locked in.");
          }

          // Update the modal values dynamically
          setLiveBreakdown(prev => ({
              ...prev,
              making_charge: data.newBreakdown.making_charge !== undefined ? data.newBreakdown.making_charge : prev.making_charge,
              wastage_value: data.newBreakdown.wastage_value !== undefined ? data.newBreakdown.wastage_value : prev.wastage_value,
              final_total_price: data.newBreakdown.final_total_price
          }));
          
          resetHesitationTimer();
      });
    }

    return () => {
        if (!showChat && socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            clearTimeout(hesitationTimerRef.current);
        }
    };
  }, [showChat, id]);

  // Auto-scroll chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // --- HESITATION SENTIMENT TRACKING ---
  const resetHesitationTimer = () => {
      if (hesitationTimerRef.current) clearTimeout(hesitationTimerRef.current);
      // If user stares at chat for 30 seconds doing nothing, trigger AI
      hesitationTimerRef.current = setTimeout(() => {
          if (socketRef.current && !dealStatus) {
              socketRef.current.emit('user_hesitating');
          }
      }, 30000); 
  };

  const handleSendMessage = () => {
    if (!userBid.trim() || !socketRef.current) return;
    
    setChatMessages(prev => [...prev, { sender: 'user', text: userBid }]);
    socketRef.current.emit('send_message', { text: userBid });
    setUserBid('');
    resetHesitationTimer();
  };

  const handleAddToCart = () => {
    const finalPrice = liveBreakdown?.final_total_price || product.price_breakdown?.final_total_price;
    const productToCart = {
      ...product,
      price_breakdown: liveBreakdown || product.price_breakdown
    };

    addToCart(productToCart);
    toast.success(`Added ${product.name} at ₹${finalPrice}! 🛍️`, {
      style: { border: '1px solid #D4AF37', padding: '16px', color: '#000', fontWeight: 'bold' },
    });
  };

  const checkPincode = async () => {
    if (pincode.length !== 6) {
        toast.error("Please enter a valid 6-digit Pincode");
        return;
    }
    setCheckingPincode(true);
    try {
        const res = await axios.get(`http://localhost:5000/api/pincodes/${pincode}`);
        setPincodeResult({ success: true, message: res.data.message });
    } catch (err) {
        setPincodeResult({ success: false, message: err.response?.data?.message || "Delivery not available" });
    } finally {
        setCheckingPincode(false);
    }
  };

  const toggleWishlist = async () => {
    if(!user) return toast.error("Please login to save to wishlist!");
    try {
        const res = await axios.post('http://localhost:5000/api/wishlist/toggle', { user_id: user.id, product_id: product.id });
        toast.success(res.data.message, { icon: res.data.status === 'added' ? '❤️' : '💔' });
    } catch (e) { toast.error("Error updating wishlist"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gold font-bold text-xl animate-pulse">Loading treasure...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center text-gray-500">Product not found.</div>;

  const displayPrice = liveBreakdown?.final_total_price;

  return (
    <div className="bg-white pt-10 pb-20 animate-fade-in relative">
      
      {/* --- MODAL: LIVE PRICE BREAKDOWN --- */}
      {showBreakdown && liveBreakdown && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up transition-all duration-500">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Info size={18} className="text-gold"/> Transparent Pricing</h3>
                 <button onClick={() => setShowBreakdown(false)} className="text-gray-400 hover:text-black transition"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 text-sm">
                 <div className="flex justify-between text-gray-600">
                    <span>Gold Value <br/><span className="text-xs text-gray-400">({product.net_weight}g × ₹{liveBreakdown.metal_rate}/g)</span></span>
                    <span className="font-medium">₹{liveBreakdown.raw_metal_value}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500">
                    <span>Wastage <br/><span className="text-xs text-gray-400">(Dynamic)</span></span>
                    <span className="font-medium text-blue-600">₹{parseFloat(liveBreakdown.wastage_value).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500">
                    <span>Making Charges</span>
                    <span className="font-medium text-blue-600">₹{parseFloat(liveBreakdown.making_charge).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 border-b pb-4">
                    <span>GST (3%)</span>
                    <span className="font-medium">₹{parseFloat(liveBreakdown.gst_amount || 0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 font-extrabold text-xl text-gray-900">
                    <span>Final Price (Rounded)</span>
                    <span className="text-gold-dark text-2xl transition-all duration-700">₹{liveBreakdown.final_total_price}</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEFT: IMAGE GALLERY */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative group cursor-zoom-in">
              <img 
                src={activeImage || 'https://via.placeholder.com/600'} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 origin-center"
              />
              <div className="absolute top-4 left-4">
                 <span className="bg-black/80 backdrop-blur-sm text-gold text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-sm shadow-sm">
                    {product.item_type}
                 </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <button 
                onClick={() => setActiveImage(product.main_image_url)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImage === product.main_image_url ? 'border-gold opacity-100 ring-1 ring-gold' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={product.main_image_url} className="w-full h-full object-cover" alt="main thumb" />
              </button>
              
              {product.gallery_images?.map((img) => (
                <button 
                  key={img.id}
                  onClick={() => setActiveImage(img.url)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImage === img.url ? 'border-gold opacity-100 ring-1 ring-gold' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img.url} className="w-full h-full object-cover" alt="gallery angle" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: PRODUCT INFO */}
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <h1 className="text-3xl md:text-5xl font-serif text-gray-900 mb-3 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-4">
                 <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">SKU: {product.sku}</p>
                 <div className="flex text-gold text-xs">★★★★★ <span className="text-gray-400 ml-1">(0 reviews)</span></div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6 relative overflow-hidden">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900 tracking-tight transition-all duration-700">₹{displayPrice}</span>
                {dealStatus === 'accepted' ? (
                  <span className="text-xs text-green-600 font-bold mb-2 bg-green-100 px-2 py-1 rounded-full animate-fade-in">
                    Special Deal Locked 🤝
                  </span>
                ) : (
                   <span className="text-xs text-blue-600 font-bold mb-2 bg-blue-100 px-2 py-1 rounded-full animate-pulse">● Live Price</span>
                )}
              </div>
              <button 
                 onClick={() => setShowBreakdown(true)}
                 className="text-xs text-gold-dark font-bold hover:underline flex items-center gap-1 cursor-pointer mt-2"
              >
                 <span className="flex items-center gap-1"><Info size={14} /> View Live Math</span>
              </button>
            </div>

            {/* Pincode Checker */}
            <div className="mb-8 bg-white border border-gray-200 p-4 rounded-xl">
               <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                 <MapPin size={16} className="text-gold" /> Check Delivery Availability
               </label>
               <div className="flex gap-2">
                  <input 
                    type="text" maxLength="6" value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-gold outline-none transition bg-gray-50" 
                    placeholder="Enter 6-digit Pincode" 
                  />
                  <button onClick={checkPincode} disabled={checkingPincode} className="bg-black text-white px-6 font-bold text-sm rounded-lg hover:bg-gray-800 transition">
                     {checkingPincode ? '...' : 'Check'}
                  </button>
               </div>
               {pincodeResult && (
                 <p className={`text-xs font-bold mt-3 flex items-center gap-1 ${pincodeResult.success ? 'text-green-600' : 'text-red-500'}`}>
                    {pincodeResult.message}
                 </p>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-4 border rounded-lg bg-white hover:border-gray-300 transition">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Metal</span>
                  <span className="font-bold text-gray-800 text-sm">{product.metal_type.replace('_', ' ')}</span>
               </div>
               <div className="p-4 border rounded-lg bg-white hover:border-gray-300 transition">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Purity</span>
                  <span className="font-bold text-gray-800 text-sm">{product.metal_type.includes('22K') ? '22 Karat (916)' : 'Sterling Silver'}</span>
               </div>
               <div className="p-4 border rounded-lg bg-white hover:border-gray-300 transition">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Gross Weight</span>
                  <span className="font-bold text-gray-800 text-sm">{product.gross_weight} g</span>
               </div>
               <div className="p-4 border rounded-lg bg-white hover:border-gray-300 transition">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Net Weight</span>
                  <span className="font-bold text-gray-800 text-sm">{product.net_weight} g</span>
               </div>
            </div>

            <div className="flex gap-4 mb-10">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
              >
                <ShoppingBag size={20} className="group-hover:text-gold transition-colors" /> 
                Add to Cart (₹{displayPrice})
              </button>
              
              <button 
                onClick={() => {
                    setShowChat(!showChat);
                    if (!showChat) setShowBreakdown(true); // Auto open breakdown to see live changes
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95 ${showChat ? 'bg-black text-gold' : 'bg-gold text-black'}`}
                title="Live Negotiation"
              >
                 <MessageCircle size={24} />
              </button>

              <button 
                onClick={toggleWishlist}
                className="w-14 h-14 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
              >
                 <Heart size={20} />
              </button>
            </div>
            {/* ... bottom features remain the same ... */}
          </div>
        </div>
      </div>

      {/* --- LIVE WEBSOCKET CHAT WINDOW --- */}
      {showChat && (
        <div 
          className="fixed bottom-6 right-6 min-w-[320px] max-w-[600px] w-80 bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden z-[100] animate-fade-in flex flex-col resize"
          style={{ height: '450px', direction: 'rtl' }}
        >
          <div className="flex flex-col h-full w-full" style={{ direction: 'ltr' }}>
            <div className="bg-black p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="font-bold text-sm tracking-wide">Live Manager</span>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:text-gold transition"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col">
              {chatMessages.length === 0 && (
                  <div className="flex justify-center my-4"><Loader2 className="animate-spin text-gray-400" /></div>
              )}
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'bot' 
                    ? 'bg-white border text-gray-800 self-start rounded-tl-none' 
                    : 'bg-gold text-black font-bold self-end rounded-tr-none'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                 <div className="self-start bg-white border p-2 rounded-lg text-gray-400 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t bg-white flex gap-2 items-center">
              <div className="relative flex-1">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm z-10 pointer-events-none">₹</span>
                 <input 
                   type="text" 
                   value={userBid} 
                   onChange={(e) => {
                       setUserBid(e.target.value);
                       resetHesitationTimer(); // Typing resets hesitation
                   }}
                   onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                   placeholder={dealStatus === 'accepted' ? "Deal Locked!" : "Type your counter-offer..."} 
                   disabled={dealStatus === 'accepted'}
                   className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold transition shadow-inner bg-gray-50 focus:bg-white disabled:opacity-50" 
                 />
              </div>
              <button 
                onClick={handleSendMessage} 
                disabled={isTyping || !userBid.trim() || dealStatus === 'accepted'}
                className={`p-2.5 rounded-xl transition shadow-md ${!userBid.trim() || dealStatus === 'accepted' ? 'bg-gray-100 text-gray-400' : 'bg-black text-gold hover:bg-gray-800'}`}
              >
                 <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;