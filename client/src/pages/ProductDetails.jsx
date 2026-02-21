import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, ShieldCheck, Heart, MapPin, Info, X, MessageCircle, Send, Loader2, Maximize2 
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

  // --- IMAGE MAGNIFIER & FULLSCREEN STATES ---
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Delivery & UI States
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // --- AI WEBSOCKET STATES ---
  const socketRef = useRef(null);
  const hesitationTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  
  // NEW: AI Spam Protection Refs
  const proactiveOffersCount = useRef(0); // Max 2 proactive offers allowed
  const lastExitIntentTime = useRef(0);   // Cooldown tracker for exit intent
  
  const [showChat, setShowChat] = useState(false);
  const showChatRef = useRef(showChat); 
  const [unreadCount, setUnreadCount] = useState(0);

  const [userBid, setUserBid] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onCooldown, setOnCooldown] = useState(false); 
  const [liveBreakdown, setLiveBreakdown] = useState(null); 
  const [dealStatus, setDealStatus] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);

  // Sync ref with state
  useEffect(() => {
      showChatRef.current = showChat;
      if (showChat) setUnreadCount(0); 
  }, [showChat]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(res.data);
        setActiveImage(res.data.main_image_url);
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
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:5000');
      
      socketRef.current.on('connect', () => {
          socketRef.current.emit('start_negotiation', { product_id: id });
      });

      socketRef.current.on('system_message', (data) => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.text }]);
          if (!showChatRef.current) setUnreadCount(prev => prev + 1); 
          resetHesitationTimer();
      });

      socketRef.current.on('ai_typing', (status) => {
          setIsTyping(status);
      });

      socketRef.current.on('price_update', (data) => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
          if (!showChatRef.current) setUnreadCount(prev => prev + 1); 

          if (data.status === 'accepted') {
              setDealStatus('accepted');
              toast.success("Deal Accepted! Price locked in.", { icon: '🤝' });
          }

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
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            clearTimeout(hesitationTimerRef.current);
        }
    };
  }, [id]);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping, showChat]);

  // --- UPGRADED: SMART EXIT INTENT & HESITATION ---
  const resetHesitationTimer = () => {
      if (hesitationTimerRef.current) clearTimeout(hesitationTimerRef.current);
      if (dealStatus === 'accepted') return; 

      hesitationTimerRef.current = setTimeout(() => {
          // STRICT RULE: Only hesitate if AI hasn't already made 2 unanswered offers
          if (socketRef.current && dealStatus !== 'accepted' && proactiveOffersCount.current < 2) {
              socketRef.current.emit('user_hesitating');
              proactiveOffersCount.current += 1; 
              resetHesitationTimer(); // Reset for potential second offer
          }
      }, 30000); 
  };

  useEffect(() => {
      const triggerExitIntent = () => {
          const now = Date.now();
          
          // STRICT RULE: 10-second cooldown so it doesn't spam when switching tabs rapidly
          if (now - lastExitIntentTime.current < 10000) return; 

          // STRICT RULE: Only trigger if AI hasn't already made 2 unanswered offers
          if (dealStatus !== 'accepted' && socketRef.current && proactiveOffersCount.current < 2) {
              socketRef.current.emit('user_leaving');
              proactiveOffersCount.current += 1;
              lastExitIntentTime.current = now;
              resetHesitationTimer(); // Restart silence timer so they don't overlap
          }
      };

      const handleVisibilityChange = () => {
          if (document.hidden) triggerExitIntent();
      };

      const handleMouseLeave = (e) => {
          // Only trigger if mouse leaves through the very TOP of the browser (towards the 'X' button)
          if (e.clientY <= 5) triggerExitIntent();
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("mouseleave", handleMouseLeave);

      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          document.removeEventListener("mouseleave", handleMouseLeave);
      };
  }, [dealStatus]);

  // --- SEND MESSAGE LOGIC ---
  const handleSendMessage = () => {
    if (!userBid.trim() || !socketRef.current || isTyping || onCooldown || dealStatus === 'accepted') return;
    
    setOnCooldown(true);
    setTimeout(() => setOnCooldown(false), 3000);

    // WIN CONDITION: The user replied! Reset the proactive offer cap back to 0.
    proactiveOffersCount.current = 0; 

    setChatMessages(prev => [...prev, { sender: 'user', text: userBid }]);
    socketRef.current.emit('send_message', { text: userBid });
    setUserBid('');
    resetHesitationTimer();
  };

  const handleAddToCart = () => {
    const finalPrice = liveBreakdown?.final_total_price || product.price_breakdown?.final_total_price;
    const productToCart = { ...product, price_breakdown: liveBreakdown || product.price_breakdown };
    addToCart(productToCart);
    
    // NEW: Detailed Toast with Price Lock Warning
    toast.success(
        (t) => (
            <div>
                <span className="font-bold text-gray-900">Added {product.name} at ₹{finalPrice}! 🛍️</span>
                <p className="text-sm mt-1.5 text-gray-700 leading-snug">
                    Your negotiated price is locked for <span className="font-extrabold text-red-600">30 minutes</span>.
                </p>
            </div>
        ), 
        { 
            duration: 5000,
            style: { border: '1px solid #D4AF37', padding: '16px', backgroundColor: '#fff' } 
        }
    );
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

  // --- IMAGE MAGNIFIER LOGIC ---
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gold font-bold text-xl animate-pulse">Loading treasure...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center text-gray-500">Product not found.</div>;

  const displayPrice = liveBreakdown?.final_total_price;

  return (
    <div className="bg-[#faf9f6] min-h-screen pt-10 pb-20 animate-fade-in relative font-sans">
      
      {/* --- MODAL: FULLSCREEN IMAGE VIEWER --- */}
      {showFullscreen && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center backdrop-blur-md transition-opacity duration-300">
           <button 
             onClick={() => setShowFullscreen(false)} 
             className="absolute top-8 right-8 text-white hover:text-gold transition bg-white/10 p-3 rounded-full"
           >
              <X size={28} />
           </button>
           <img 
             src={activeImage} 
             className="max-w-[90vw] max-h-[90vh] object-contain select-none shadow-2xl rounded-sm" 
             alt="Fullscreen View" 
           />
        </div>
      )}

      {/* --- MODAL: LIVE PRICE BREAKDOWN --- */}
      {showBreakdown && liveBreakdown && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up transition-all duration-500 border border-gold/30">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <Info size={20} className="text-gold"/> Transparent Pricing
                 </h3>
                 <button onClick={() => setShowBreakdown(false)} className="text-gray-400 hover:text-black transition p-1"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 text-sm bg-white">
                 <div className="flex justify-between text-gray-600">
                    <span>Gold Value <br/><span className="text-[11px] text-gray-400">({product.net_weight}g × ₹{liveBreakdown.metal_rate}/g)</span></span>
                    <span className="font-medium">₹{liveBreakdown.raw_metal_value}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500">
                    <span>Wastage <br/><span className="text-[11px] text-gray-400">(Dynamic)</span></span>
                    <span className="font-medium text-blue-600">₹{parseFloat(liveBreakdown.wastage_value).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500">
                    <span>Making Charges</span>
                    <span className="font-medium text-blue-600">₹{parseFloat(liveBreakdown.making_charge).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-4">
                    <span>GST (3%)</span>
                    <span className="font-medium">₹{parseFloat(liveBreakdown.gst_amount || 0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 font-extrabold text-xl text-gray-900">
                    <span>Final Price <span className="text-xs text-gray-400 font-normal">(Rounded)</span></span>
                    <span className="text-gold-dark text-2xl transition-all duration-700">₹{liveBreakdown.final_total_price}</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* LEFT: REDESIGNED IMAGE GALLERY WITH LENS MAGNIFIER */}
          <div className="space-y-6">
            <div 
              className="w-full aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-crosshair"
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              onClick={() => setShowFullscreen(true)}
            >
              <img 
                src={activeImage || 'https://via.placeholder.com/600'} 
                alt={product.name} 
                style={isZooming ? {
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: 'scale(2.2)'
                } : {
                    transformOrigin: 'center',
                    transform: 'scale(1)'
                }}
                className="w-full h-full object-cover transition-transform duration-150 ease-out select-none"
              />
              
              <div className="absolute top-5 left-5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                 <span className="bg-black/80 backdrop-blur-md text-gold text-[10px] font-bold px-4 py-1.5 uppercase tracking-widest rounded-full shadow-sm border border-gold/20">
                    {product.item_type.replace('_', ' ')}
                 </span>
              </div>
              
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg text-gray-800">
                    <Maximize2 size={20} />
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3">
              <button 
                onClick={() => setActiveImage(product.main_image_url)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImage === product.main_image_url ? 'border-gold opacity-100 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 bg-white'}`}
              >
                <img src={product.main_image_url} className="w-full h-full object-cover" alt="main thumb" />
              </button>
              
              {product.gallery_images?.map((img) => (
                <button 
                  key={img.id}
                  onClick={() => setActiveImage(img.url)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImage === img.url ? 'border-gold opacity-100 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 bg-white'}`}
                >
                  <img src={img.url} className="w-full h-full object-cover" alt="gallery angle" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: REDESIGNED PRODUCT INFO */}
          <div className="flex flex-col h-full py-4">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-6">
                 <p className="text-gray-500 text-sm font-mono bg-gray-100 px-3 py-1 rounded-md tracking-wider">SKU: {product.sku}</p>
                 <div className="flex text-gold text-sm tracking-widest">
                    ★★★★★ <span className="text-gray-400 ml-2 tracking-normal text-xs">(0 Reviews)</span>
                 </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 relative">
              <div className="flex items-end gap-4 mb-2">
                <span className="text-5xl font-bold text-gray-900 tracking-tight transition-all duration-700">₹{displayPrice}</span>
                {dealStatus === 'accepted' ? (
                  <span className="text-xs text-green-700 font-bold mb-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full animate-fade-in flex items-center gap-1">
                    Special Deal Locked 🤝
                  </span>
                ) : (
                   <span className="text-xs text-blue-700 font-bold mb-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block"></span> Live Price
                   </span>
                )}
              </div>
              <button 
                 onClick={() => setShowBreakdown(true)}
                 className="text-sm text-gold-dark font-semibold hover:text-black transition flex items-center gap-1.5 cursor-pointer mt-3"
              >
                 <Info size={16} /> View Transparent Pricing Math
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-5 border border-gray-100 rounded-2xl bg-white flex flex-col justify-center shadow-sm hover:shadow-md transition">
                  <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Metal & Purity</span>
                  <span className="font-bold text-gray-900 text-sm">
                     {product.metal_type.replace('_', ' ')} - {product.metal_type.includes('22K') ? '22K (916)' : 'Sterling'}
                  </span>
               </div>
               <div className="p-5 border border-gray-100 rounded-2xl bg-white flex justify-between shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col">
                     <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Gross Wt.</span>
                     <span className="font-bold text-gray-900 text-sm">{product.gross_weight} g</span>
                  </div>
                  <div className="w-px bg-gray-100 mx-2"></div>
                  <div className="flex flex-col text-right">
                     <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Net Wt.</span>
                     <span className="font-bold text-gray-900 text-sm">{product.net_weight} g</span>
                  </div>
               </div>
            </div>

            <div className="mb-10 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <MapPin size={18} className="text-gold" /> Check Delivery Availability
               </label>
               <div className="flex gap-3">
                  <input 
                    type="text" maxLength="6" value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 border border-gray-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-gold outline-none transition bg-gray-50 focus:bg-white" 
                    placeholder="Enter 6-digit Pincode" 
                  />
                  <button 
                     onClick={checkPincode} disabled={checkingPincode} 
                     className="bg-gray-900 text-white px-8 font-bold text-sm rounded-xl hover:bg-black transition shadow-md"
                  >
                     {checkingPincode ? <Loader2 size={18} className="animate-spin" /> : 'Verify'}
                  </button>
               </div>
               {pincodeResult && (
                 <p className={`text-xs font-bold mt-4 flex items-center gap-1.5 bg-gray-50 p-2.5 rounded-lg ${pincodeResult.success ? 'text-green-700' : 'text-red-600'}`}>
                    {pincodeResult.message}
                 </p>
               )}
            </div>

            <div className="flex gap-4 mt-auto">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(212,175,55,0.3)] active:scale-[0.98] group"
              >
                <ShoppingBag size={22} className="text-gold group-hover:scale-110 transition-transform" /> 
                Add to Cart — ₹{displayPrice}
              </button>
              
              <button 
                onClick={() => {
                    setShowChat(!showChat);
                    if (!showChat) {
                        setShowBreakdown(true);
                        setUnreadCount(0); 
                    }
                }}
                className={`relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 border ${showChat ? 'bg-black text-gold border-black' : 'bg-white text-black border-gray-200 hover:border-gold'}`}
                title="Bargain with Manager"
              >
                 <MessageCircle size={28} />
                 {unreadCount > 0 && !showChat && (
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-md border-2 border-white">
                         {unreadCount}
                     </span>
                 )}
              </button>

              <button 
                onClick={toggleWishlist}
                className="w-[72px] h-[72px] border border-gray-200 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
              >
                 <Heart size={26} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- LIVE WEBSOCKET CHAT WINDOW --- */}
      {showChat && (
        <div 
          className="fixed bottom-6 right-6 min-w-[320px] max-w-[600px] w-80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border border-gray-100 overflow-hidden z-[100] animate-fade-in-up flex flex-col resize"
          style={{ height: '480px', direction: 'rtl' }}
        >
          <div className="flex flex-col h-full w-full" style={{ direction: 'ltr' }}>
            <div className="bg-gradient-to-r from-gray-900 to-black p-4 text-white flex justify-between items-center border-b border-gray-800">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                 <span className="font-bold text-sm tracking-wide">Store Manager</span>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:text-gold transition bg-white/10 p-1.5 rounded-lg"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fa] flex flex-col">
              {chatMessages.length === 0 && (
                  <div className="flex justify-center my-6"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
              )}
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.sender === 'bot' 
                    ? 'bg-white border border-gray-100 text-gray-800 self-start rounded-tl-sm' 
                    : 'bg-[#D4AF37] text-black font-semibold self-end rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                 <div className="self-start bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm text-gray-400 flex items-center gap-1.5 shadow-sm">
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t bg-white flex gap-2 items-center">
              <div className="relative flex-1">
                 <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm z-10 pointer-events-none">₹</span>
                 <input 
                   type="text" 
                   value={userBid} 
                   onChange={(e) => {
                       setUserBid(e.target.value);
                       resetHesitationTimer(); 
                   }}
                   onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                   placeholder={
                       dealStatus === 'accepted' ? "Deal Locked!" : 
                       (isTyping || onCooldown) ? "Manager is replying..." : 
                       "Your counter-offer..."
                   } 
                   disabled={dealStatus === 'accepted' || isTyping || onCooldown}
                   className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-gold transition shadow-inner bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed" 
                 />
              </div>
              <button 
                onClick={handleSendMessage} 
                disabled={isTyping || onCooldown || !userBid.trim() || dealStatus === 'accepted'}
                className={`p-3 rounded-xl transition shadow-md flex items-center justify-center ${
                    (!userBid.trim() || dealStatus === 'accepted' || isTyping || onCooldown) 
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                    : 'bg-black text-gold hover:bg-gray-800 hover:-translate-y-0.5'
                }`}
              >
                 <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;