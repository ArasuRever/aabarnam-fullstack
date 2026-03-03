import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, Heart, MapPin, Info, X, MessageCircle, Send, Loader2, Maximize2, 
  ChevronLeft, ChevronRight, Star, ShieldCheck, CreditCard as CreditCardIcon, Scan, CircleDashed 
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

  const [allImages, setAllImages] = useState([]);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const [reviews, setReviews] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState({ canReview: false, hasPurchased: false, hasReviewed: false });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const socketRef = useRef(null);
  const hesitationTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const proactiveOffersCount = useRef(0); 
  const lastExitIntentTime = useRef(0);   
  
  const [showChat, setShowChat] = useState(false);
  const showChatRef = useRef(showChat); 
  const [unreadCount, setUnreadCount] = useState(0);

  const [userBid, setUserBid] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onCooldown, setOnCooldown] = useState(false); 
  const [liveBreakdown, setLiveBreakdown] = useState(null); 
  const [dealStatus, setDealStatus] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);

  const [sizer, setSizer] = useState({ show: false, step: 1, type: 'ring', cardPx: 280, circlePx: 120 });

  const CHAT_STORAGE_KEY = `aabarnam_chat_${id}`;
  const [isChatFrozen, setIsChatFrozen] = useState(false);

  // 🌟 NEW: Lock background scrolling when ANY modal is open
  useEffect(() => {
    if (sizer.show || showFullscreen || showBreakdown || showChat) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [sizer.show, showFullscreen, showBreakdown, showChat]);

  useEffect(() => {
      const savedStr = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedStr) {
          const savedData = JSON.parse(savedStr);
          if (Date.now() - savedData.lastActivity > 10 * 60 * 1000) {
              setIsChatFrozen(true);
              setChatMessages(savedData.messages); 
          } else {
              setChatMessages(savedData.messages);
              if (savedData.dealStatus) setDealStatus(savedData.dealStatus);
              if (savedData.liveBreakdown) setLiveBreakdown(savedData.liveBreakdown);
          }
      }
  }, [id]);

  useEffect(() => {
      if (chatMessages.length > 0 && !isChatFrozen) {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
              messages: chatMessages,
              dealStatus,
              liveBreakdown,
              lastActivity: Date.now()
          }));
      }
  }, [chatMessages, dealStatus, liveBreakdown, isChatFrozen]);

  const handleRestartChat = () => {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      window.location.reload(); 
  };

  useEffect(() => { showChatRef.current = showChat; if (showChat) setUnreadCount(0); }, [showChat]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(prodRes.data);
        
        const images = [prodRes.data.main_image_url, ...(prodRes.data.gallery_images?.map(img => img.url) || [])].filter(Boolean);
        setAllImages(images);

        if (prodRes.data.price_breakdown && !liveBreakdown) {
            setLiveBreakdown({
                ...prodRes.data.price_breakdown,
                wastage_pct: prodRes.data.price_breakdown.wastage_pct !== undefined ? prodRes.data.price_breakdown.wastage_pct : prodRes.data.wastage_pct,
                final_total_price: Math.round(prodRes.data.price_breakdown.final_total_price)
            });
        }

        const reviewsRes = await axios.get(`http://localhost:5000/api/products/${id}/reviews`);
        setReviews(reviewsRes.data);

        if (user) {
            const eligRes = await axios.get(`http://localhost:5000/api/products/${id}/eligibility/${user.id}`);
            setReviewEligibility(eligRes.data);
        }
        setLoading(false);
      } catch (err) { setLoading(false); }
    };
    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (!socketRef.current && !isChatFrozen) {
      socketRef.current = io('http://localhost:5000');
      
      socketRef.current.on('connect', () => {
          const savedStr = localStorage.getItem(CHAT_STORAGE_KEY);
          const history = savedStr ? JSON.parse(savedStr).messages : [];
          socketRef.current.emit('start_negotiation', { product_id: id, history });
      });

      socketRef.current.on('system_message', (data) => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.text }]);
          if (!showChatRef.current) setUnreadCount(prev => prev + 1); 
          resetHesitationTimer();
      });

      socketRef.current.on('ai_typing', (status) => setIsTyping(status));
      
      socketRef.current.on('price_update', (data) => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
          if (!showChatRef.current) setUnreadCount(prev => prev + 1); 
          
          if (data.status === 'accepted') {
              setDealStatus('accepted');
              toast.success("Deal Accepted! Price locked in.", { icon: '🤝' });
          }
          
          setLiveBreakdown(prev => ({
              ...prev,
              wastage_pct: data.newBreakdown.wastage_pct !== undefined ? data.newBreakdown.wastage_pct : prev.wastage_pct,
              making_charge: data.newBreakdown.making_charge !== undefined ? data.newBreakdown.making_charge : prev.making_charge,
              wastage_value: data.newBreakdown.wastage_value !== undefined ? data.newBreakdown.wastage_value : prev.wastage_value,
              final_total_price: data.newBreakdown.final_total_price,
              deal_token: data.deal_token || prev?.deal_token
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
  }, [id, isChatFrozen]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isTyping, showChat]);

  const resetHesitationTimer = () => {
      if (hesitationTimerRef.current) clearTimeout(hesitationTimerRef.current);
      if (dealStatus === 'accepted') return; 
      
      hesitationTimerRef.current = setTimeout(() => {
          if (socketRef.current && dealStatus !== 'accepted' && proactiveOffersCount.current < 1) {
              socketRef.current.emit('user_hesitating');
              proactiveOffersCount.current += 1; 
          }
      }, 60000); 
  };

  useEffect(() => {
      const triggerExitIntent = () => {
          const now = Date.now();
          if (now - lastExitIntentTime.current < 10000) return; 
          if (dealStatus !== 'accepted' && socketRef.current && proactiveOffersCount.current < 2) {
              socketRef.current.emit('user_leaving');
              proactiveOffersCount.current += 1;
              lastExitIntentTime.current = now;
              resetHesitationTimer();
          }
      };
      const handleVisibilityChange = () => { if (document.hidden) triggerExitIntent(); };
      const handleMouseLeave = (e) => { if (e.clientY <= 5) triggerExitIntent(); };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          document.removeEventListener("mouseleave", handleMouseLeave);
      };
  }, [dealStatus]);

  const handleSendMessage = () => {
    if (!userBid.trim() || !socketRef.current || isTyping || onCooldown || dealStatus === 'accepted') return;
    setOnCooldown(true);
    setTimeout(() => setOnCooldown(false), 3000);
    proactiveOffersCount.current = 0; 
    setChatMessages(prev => [...prev, { sender: 'user', text: userBid }]);
    socketRef.current.emit('send_message', { text: userBid });
    setUserBid('');
    resetHesitationTimer();
  };

  const handleAddToCart = () => {
    const finalPrice = liveBreakdown?.final_total_price || product.price_breakdown?.final_total_price;
    const originalPrice = product.price_breakdown?.final_total_price;
    const discount = originalPrice - finalPrice;
    
    const productToCart = { 
        ...product, 
        deal_token: liveBreakdown?.deal_token || null,
        chat_transcript: chatMessages,
        price_breakdown: { 
            ...liveBreakdown, 
            original_price: originalPrice, 
            negotiated_discount: discount > 0 ? discount : 0 
        } 
    };
    
    addToCart(productToCart);
    toast.success(
        (t) => (
            <div>
                <span className="font-bold text-gray-900">Added {product.name} at ₹{finalPrice}! 🛍️</span>
                <p className="text-sm mt-1.5 text-gray-700 leading-snug">Your negotiated price is locked for <span className="font-extrabold text-red-600">30 minutes</span>.</p>
            </div>
        ), 
        { duration: 5000, style: { border: '1px solid #D4AF37', padding: '16px', backgroundColor: '#fff' } }
    );
  };

  const checkPincode = async () => {
    if (pincode.length !== 6) return toast.error("Please enter a valid 6-digit Pincode");
    setCheckingPincode(true);
    try {
        const res = await axios.get(`http://localhost:5000/api/pincodes/${pincode}`);
        setPincodeResult({ success: true, message: res.data.message });
    } catch (err) {
        setPincodeResult({ success: false, message: err.response?.data?.message || "Delivery not available" });
    } finally { setCheckingPincode(false); }
  };

  const toggleWishlist = async () => {
    if(!user) return toast.error("Please login to save to wishlist!");
    try {
        const res = await axios.post('http://localhost:5000/api/wishlist/toggle', { user_id: user.id, product_id: product.id });
        toast.success(res.data.message, { icon: res.data.status === 'added' ? '❤️' : '💔' });
    } catch (e) { toast.error("Error updating wishlist"); }
  };

  const submitReview = async (e) => {
      e.preventDefault();
      if (!reviewForm.comment.trim()) return toast.error("Please write a comment.");
      setSubmittingReview(true);
      try {
          await axios.post(`http://localhost:5000/api/products/${id}/reviews`, {
              user_id: user.id,
              rating: reviewForm.rating,
              comment: reviewForm.comment
          });
          toast.success("Review published successfully!");
          const reviewsRes = await axios.get(`http://localhost:5000/api/products/${id}/reviews`);
          setReviews(reviewsRes.data);
          const eligRes = await axios.get(`http://localhost:5000/api/products/${id}/eligibility/${user.id}`);
          setReviewEligibility(eligRes.data);
      } catch (err) {
          toast.error("Failed to post review");
      } finally { setSubmittingReview(false); }
  };

  const nextImg = (e) => { e?.stopPropagation(); setCurrentImgIndex((prev) => (prev + 1) % allImages.length); };
  const prevImg = (e) => { e?.stopPropagation(); setCurrentImgIndex((prev) => (prev - 1 + allImages.length) % allImages.length); };
  
  const handleMouseMove = (e) => {
    if (!showFullscreen) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  // 🌟 REFINED MATH: Indian Standard Size = Circumference - 40
  const pxPerMm = sizer.cardPx / 85.6; 
  const currentMm = sizer.circlePx / pxPerMm;
  const currentCircumference = currentMm * Math.PI;
  const calculatedRingSize = Math.max(1, Math.min(35, Math.round(currentCircumference - 40))); 
  
  const calculatedBangleSize = currentMm < 55.5 ? '2.2' : currentMm < 58.7 ? '2.4' : currentMm < 61.9 ? '2.6' : currentMm < 65.1 ? '2.8' : '2.10';

  if (loading) return <div className="h-screen flex items-center justify-center text-gold font-bold text-xl animate-pulse">Loading treasure...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center text-gray-500">Product not found.</div>;

  const displayPrice = liveBreakdown?.final_total_price;
  const dynamicSubtotal = parseFloat(displayPrice) / 1.03;
  const dynamicGst = parseFloat(displayPrice) - dynamicSubtotal;
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="bg-[#faf9f6] min-h-screen pt-10 pb-20 animate-fade-in relative font-sans">
      
      {/* 🌟 ENHANCED SIZER MODAL (Scrollable & Larger) */}
      {sizer.show && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh] overflow-hidden">
                  
                  {/* Fixed Header */}
                  <div className="bg-gradient-to-r from-gray-900 to-black p-4 flex justify-between items-center text-white border-b border-gold/30 shrink-0">
                      <h3 className="font-serif font-bold text-lg text-gold flex items-center gap-2">
                          <Scan size={20} /> Aabarnam Digital Sizer
                      </h3>
                      <button onClick={() => setSizer({...sizer, show: false})} className="text-gray-400 hover:text-white transition"><X size={20}/></button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="overflow-y-auto p-6 md:p-8 flex flex-col items-center text-center custom-scrollbar">
                      {sizer.step === 1 && (
                          <div className="w-full max-w-lg mx-auto">
                              <h4 className="font-bold text-gray-900 mb-2 text-xl">Step 1: Calibrate Screen</h4>
                              <p className="text-sm text-gray-500 mb-8">Place a standard Debit/Credit Card flat against your screen. Adjust the slider until the blue box exactly matches your physical card.</p>
                              
                              <div className="w-full h-[350px] bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mb-8 shadow-inner overflow-hidden relative">
                                  <div 
                                    style={{ width: `${sizer.cardPx}px`, height: `${sizer.cardPx * (53.98 / 85.6)}px` }} 
                                    className="bg-blue-600 rounded-xl shadow-lg border-2 border-white/50 flex flex-col justify-between p-4 transition-all duration-75"
                                  >
                                      <div className="flex justify-between items-center opacity-30">
                                          <div className="w-12 h-8 bg-yellow-400 rounded-md"></div>
                                          <CreditCardIcon className="text-white" size={32} />
                                      </div>
                                      <div className="w-3/4 h-3 bg-white/30 rounded mt-auto"></div>
                                  </div>
                              </div>

                              <input type="range" min="150" max="600" value={sizer.cardPx} onChange={(e) => setSizer({...sizer, cardPx: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black mb-6" />
                              <button onClick={() => setSizer({...sizer, step: 2})} className="w-full bg-black text-gold py-4 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">Confirm Calibration</button>
                          </div>
                      )}

                      {sizer.step === 2 && (
                          <div className="w-full max-w-lg mx-auto">
                              <h4 className="font-bold text-gray-900 mb-2 text-xl">Step 2: Find Your Size</h4>
                              
                              {/* 🌟 Warning Notice about Inside Edge */}
                              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg mb-6 text-sm flex items-start gap-2 text-left shadow-sm">
                                 <Info className="flex-shrink-0 mt-0.5 text-orange-600" size={18} />
                                 <p><strong>Crucial:</strong> Place your existing jewelry on the screen. The dotted circle must touch the <b>INSIDE EDGE</b> of your ring/bangle. Do not measure the outside thickness!</p>
                              </div>
                              
                              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg mb-6 justify-center w-fit mx-auto">
                                  <button onClick={() => setSizer({...sizer, type: 'ring', circlePx: 120})} className={`px-6 py-2 rounded-md text-sm font-bold transition ${sizer.type === 'ring' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}>💍 Ring</button>
                                  <button onClick={() => setSizer({...sizer, type: 'bangle', circlePx: 250})} className={`px-6 py-2 rounded-md text-sm font-bold transition ${sizer.type === 'bangle' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}>⭕ Bangle</button>
                              </div>

                              <div className="w-full h-[350px] bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                      <div className="w-px h-full bg-black"></div><div className="w-full h-px bg-black absolute"></div>
                                  </div>
                                  <div 
                                    style={{ width: `${sizer.circlePx}px`, height: `${sizer.circlePx}px` }} 
                                    className="rounded-full border-[3px] border-dashed border-gold flex items-center justify-center bg-gold/10 transition-all duration-75 relative"
                                  >
                                      <span className="text-[10px] text-gold-dark font-bold font-mono bg-white/90 px-2 py-0.5 rounded shadow-sm border border-gold/20">{currentMm.toFixed(1)} mm</span>
                                  </div>
                              </div>

                              <input type="range" min="30" max="400" value={sizer.circlePx} onChange={(e) => setSizer({...sizer, circlePx: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black mb-6" />
                              
                              <div className="bg-green-50 w-full p-4 rounded-xl border border-green-200 mb-6 shadow-inner">
                                  <p className="text-xs text-green-800 uppercase tracking-widest font-bold">Estimated Standard Size</p>
                                  <p className="text-3xl font-serif text-green-900 mt-1">{sizer.type === 'ring' ? `Size ${calculatedRingSize}` : `Size ${calculatedBangleSize}`}</p>
                              </div>

                              <div className="flex gap-3 w-full pb-4">
                                  <button onClick={() => setSizer({...sizer, step: 1})} className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Back</button>
                                  <button onClick={() => setSizer({...sizer, show: false})} className="flex-[2] bg-black text-gold py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg">Done</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showFullscreen && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center backdrop-blur-md transition-opacity duration-300">
           <button onClick={() => setShowFullscreen(false)} className="absolute top-8 right-8 text-white hover:text-gold transition bg-white/10 p-3 rounded-full z-50"><X size={28} /></button>
           {allImages.length > 1 && (
             <>
                <button onClick={prevImg} className="absolute left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 z-50"><ChevronLeft size={48}/></button>
                <button onClick={nextImg} className="absolute right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 z-50"><ChevronRight size={48}/></button>
             </>
           )}
           <div 
              className="relative w-[80vw] h-[80vh] cursor-crosshair overflow-hidden flex items-center justify-center"
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
           >
               <img 
                 src={allImages[currentImgIndex]} 
                 style={isZooming ? { transform: `scale(2.5)`, transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
                 className="max-w-full max-h-full object-contain transition-transform duration-150 ease-out pointer-events-none" 
                 alt="Fullscreen View" 
               />
           </div>
        </div>
      )}

      {showBreakdown && liveBreakdown && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up transition-all duration-500 border border-gold/30">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Info size={20} className="text-gold"/> Transparent Pricing</h3>
                 <button onClick={() => setShowBreakdown(false)} className="text-gray-400 hover:text-black transition p-1"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 text-sm bg-white">
                 <div className="flex justify-between text-gray-600">
                    <span>Gold Value <br/><span className="text-[11px] text-gray-400">({product.net_weight}g × ₹{liveBreakdown.metal_rate}/g)</span></span>
                    <span className="font-medium">₹{parseFloat(liveBreakdown.raw_metal_value).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500">
                    <span>Value Addition (VA) <br/>
                        <span className="text-[11px] text-gray-400">
                            ({liveBreakdown.wastage_pct !== undefined ? parseFloat(liveBreakdown.wastage_pct).toFixed(1) : parseFloat(product.wastage_pct).toFixed(1)}% Dynamic)
                        </span>
                    </span>
                    <span className="font-medium text-blue-600">₹{parseFloat(liveBreakdown.wastage_value).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 transition-colors duration-500 border-b border-gray-100 pb-4">
                    <span>Making Charges <br/><span className="text-[11px] text-gray-400">(Fixed)</span></span>
                    <span className="font-medium">₹{parseFloat(liveBreakdown.making_charge).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-gray-800 font-bold pt-2">
                    <span>Product Price <span className="text-xs text-gray-400 font-normal">(Subtotal)</span></span>
                    <span className="text-lg">₹{dynamicSubtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-4">
                    <span>GST (3%)</span>
                    <span className="font-medium">₹{dynamicGst.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 font-extrabold text-xl text-gray-900">
                    <span>Total Payable Value</span>
                    <span className="text-gold-dark text-3xl transition-all duration-700">₹{displayPrice}</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main UI starts here */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          <div className="space-y-6">
            <div className="relative w-full aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer" onClick={() => setShowFullscreen(true)}>
              <img src={allImages[currentImgIndex]} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {allImages.length > 1 && (
                 <>
                    <button onClick={prevImg} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition duration-300 z-10"><ChevronLeft size={24}/></button>
                    <button onClick={nextImg} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition duration-300 z-10"><ChevronRight size={24}/></button>
                 </>
              )}
              <div className="absolute top-5 left-5 z-10">
                 <span className="bg-black/80 backdrop-blur-md text-gold text-[10px] font-bold px-4 py-1.5 uppercase tracking-widest rounded-full shadow-sm border border-gold/20">
                    {product.item_type.replace('_', ' ')}
                 </span>
              </div>
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                 <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-gray-800 font-bold text-xs flex items-center gap-2"><Maximize2 size={16} /> Fullscreen</div>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {allImages.map((src, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentImgIndex(idx)}
                  className={`w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${currentImgIndex === idx ? 'border-gold opacity-100 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 bg-white'}`}
                >
                  <img src={src} className="w-full h-full object-cover" alt={`thumb ${idx}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col h-full py-4">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-6">
                 <p className="text-gray-500 text-sm font-mono bg-gray-100 px-3 py-1 rounded-md tracking-wider">SKU: {product.sku}</p>
                 <div className="flex text-gold text-sm tracking-widest items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < Math.round(avgRating) ? "currentColor" : "none"} className={i < Math.round(avgRating) ? "text-gold" : "text-gray-300"} />
                    ))}
                    <span className="text-gray-500 ml-2 tracking-normal text-xs font-bold font-sans">({reviews.length} Reviews)</span>
                 </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 relative">
              <div className="flex items-end gap-4 mb-2">
                <span className="text-5xl font-bold text-gray-900 tracking-tight transition-all duration-700">₹{displayPrice}</span>
                {liveBreakdown?.final_total_price < Math.round(product.price_breakdown?.final_total_price) && (
                    <span className="text-xl text-gray-400 line-through font-medium">₹{Math.round(product.price_breakdown.final_total_price)}</span>
                )}
              </div>
              
              {dealStatus === 'accepted' ? (
                <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-xl animate-fade-in">
                    <h4 className="font-bold text-green-800 flex items-center gap-2">🎉 Deal Struck!</h4>
                    <p className="text-green-700 text-sm mt-1">
                        You successfully negotiated <b>₹{Math.round(product.price_breakdown.final_total_price - liveBreakdown.final_total_price)}</b> off the original price!
                    </p>
                </div>
              ) : (
                <button onClick={() => setShowBreakdown(true)} className="text-sm text-gold-dark font-semibold hover:text-black transition flex items-center gap-1.5 mt-3">
                   <Info size={16} /> View Transparent Pricing Math
                </button>
              )}
            </div>

            {parseFloat(product.stone_weight) > 0.200 ? (
                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div className="p-5 border border-gray-100 rounded-2xl bg-white flex flex-col justify-center shadow-sm hover:shadow-md transition">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Total Item Weight (Gross)</span>
                      <span className="font-bold text-gray-900 text-lg">{product.gross_weight} g</span>
                   </div>
                   <div className="p-5 border border-gray-100 rounded-2xl bg-white flex justify-between shadow-sm hover:shadow-md transition bg-gold/5">
                      <div className="flex flex-col">
                         <span className="text-[11px] text-gold-dark uppercase tracking-widest mb-1 font-semibold">Stone Wt.</span>
                         <span className="font-bold text-gray-900 text-sm">{product.stone_weight} g</span>
                      </div>
                      <div className="w-px bg-gold/20 mx-2"></div>
                      <div className="flex flex-col text-right">
                         <span className="text-[11px] text-gold-dark uppercase tracking-widest mb-1 font-semibold">Metal (Net)</span>
                         <span className="font-bold text-gray-900 text-lg">{product.net_weight} g</span>
                      </div>
                   </div>
                </div>
            ) : (
                <div className="mb-4 p-5 border border-gray-100 rounded-2xl bg-white flex justify-between items-center shadow-sm hover:shadow-md transition">
                   <span className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-2">Total Item Weight (Gross)</span>
                   <span className="font-bold text-gray-900 text-2xl">{product.gross_weight} g</span>
                </div>
            )}

            {(product.item_type.toLowerCase().includes('ring') || product.item_type.toLowerCase().includes('bangle')) && (
               <div className="mb-8 flex items-center justify-between bg-gold/5 border border-gold/30 p-4 rounded-xl shadow-sm">
                   <div>
                       <p className="font-bold text-gray-900 text-sm">Not sure about the size?</p>
                       <p className="text-xs text-gray-600">Measure instantly using your screen.</p>
                   </div>
                   <button onClick={() => setSizer({...sizer, show: true, step: 1})} className="bg-black text-gold text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-gray-800 transition flex items-center gap-2 shadow-md">
                       <CircleDashed size={14}/> Find My Fit
                   </button>
               </div>
            )}

            <div className="mb-10 bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
               <label className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <MapPin size={18} className="text-gold" /> Check Delivery Availability
               </label>
               <div className="flex gap-3">
                  <input type="text" maxLength="6" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} className="flex-1 border border-gray-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-gold outline-none transition bg-gray-50 focus:bg-white" placeholder="Enter 6-digit Pincode" />
                  <button onClick={checkPincode} disabled={checkingPincode} className="bg-gray-900 text-white px-8 font-bold text-sm rounded-xl hover:bg-black transition shadow-md">
                     {checkingPincode ? <Loader2 size={18} className="animate-spin" /> : 'Verify'}
                  </button>
               </div>
               {pincodeResult && <p className={`text-xs font-bold mt-4 flex items-center gap-1.5 bg-gray-50 p-2.5 rounded-lg ${pincodeResult.success ? 'text-green-700' : 'text-red-600'}`}>{pincodeResult.message}</p>}
            </div>

            <div className="flex gap-4 mt-auto">
              <button onClick={handleAddToCart} className="flex-1 bg-black text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(212,175,55,0.3)] active:scale-[0.98] group">
                <ShoppingBag size={22} className="text-gold group-hover:scale-110 transition-transform" /> Add to Cart — ₹{displayPrice}
              </button>
              
              <button onClick={() => { setShowChat(!showChat); if (!showChat) { setShowBreakdown(true); setUnreadCount(0); } }} className={`relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 border ${showChat ? 'bg-black text-gold border-black' : 'bg-white text-black border-gray-200 hover:border-gold'}`} title="Bargain with Manager">
                 <MessageCircle size={28} />
                 {unreadCount > 0 && !showChat && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full animate-bounce shadow-md border-2 border-white">{unreadCount}</span>}
              </button>
              <button onClick={toggleWishlist} className="w-[72px] h-[72px] border border-gray-200 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 shadow-sm"><Heart size={26} /></button>
            </div>
          </div>
        </div>

        <div className="mt-24 pt-16 border-t border-gray-200">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8 flex items-center gap-3">Customer Reviews <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-sans">{reviews.length}</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                        <div className="mb-6 pb-6 border-b border-gray-100 text-center">
                            <span className="text-5xl font-bold text-gray-900">{avgRating}</span><span className="text-gray-400 text-xl">/5</span>
                            <div className="flex text-gold justify-center mt-2">
                                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={20} fill={i < Math.round(avgRating) ? "currentColor" : "none"} className={i < Math.round(avgRating) ? "text-gold" : "text-gray-300"} />)}
                            </div>
                        </div>

                        {!user ? (
                            <p className="text-sm text-gray-500 text-center font-medium">Please login to write a review.</p>
                        ) : reviewEligibility.hasReviewed ? (
                            <p className="text-sm text-green-700 bg-green-50 p-4 rounded-xl text-center font-bold flex flex-col items-center gap-2"><ShieldCheck size={24}/> You have already reviewed this item. Thank you!</p>
                        ) : !reviewEligibility.hasPurchased ? (
                            <p className="text-sm text-gray-500 text-center font-medium">Only verified buyers who have ordered this item can leave a review.</p>
                        ) : reviewEligibility.canReview && (
                            <form onSubmit={submitReview} className="space-y-4">
                                <h4 className="font-bold text-gray-900 text-sm">Write a Review</h4>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Rating</label>
                                    <div className="flex gap-2">
                                        {[1,2,3,4,5].map(num => (
                                            <button type="button" key={num} onClick={() => setReviewForm({...reviewForm, rating: num})} className="text-gold hover:scale-110 transition">
                                                <Star size={24} fill={num <= reviewForm.rating ? "currentColor" : "none"} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Your Comment</label>
                                    <textarea required rows="4" className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gold outline-none bg-gray-50 focus:bg-white transition" placeholder="How was the quality?" value={reviewForm.comment} onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}></textarea>
                                </div>
                                <button type="submit" disabled={submittingReview} className="w-full bg-black text-gold font-bold py-3 rounded-xl hover:bg-gray-800 transition">
                                    {submittingReview ? 'Publishing...' : 'Publish Review'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {reviews.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">No reviews yet. Be the first to share your experience!</div>
                    ) : (
                        reviews.map(review => (
                            <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center font-bold">{review.user_name.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                                {review.user_name} 
                                                <ShieldCheck size={14} className="text-green-500" title="Verified Buyer" />
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{new Date(review.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex text-gold">
                                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-gold" : "text-gray-200"} />)}
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mt-2">{review.comment}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>

      {showChat && (
        <div className="fixed bottom-6 right-6 min-w-[320px] max-w-[600px] w-80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border border-gray-100 overflow-hidden z-[100] animate-fade-in-up flex flex-col resize" style={{ height: '480px', direction: 'rtl' }}>
          <div className="flex flex-col h-full w-full" style={{ direction: 'ltr' }}>
            <div className="bg-gradient-to-r from-gray-900 to-black p-4 text-white flex justify-between items-center border-b border-gray-800">
              <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div><span className="font-bold text-sm tracking-wide">Aura of Aabarnam</span></div>
              <button onClick={() => setShowChat(false)} className="hover:text-gold transition bg-white/10 p-1.5 rounded-lg"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fa] flex flex-col">
              {chatMessages.length === 0 && !isChatFrozen && <div className="flex justify-center my-6"><Loader2 className="animate-spin text-gray-300" size={28} /></div>}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.sender === 'bot' ? 'bg-white border border-gray-100 text-gray-800 self-start rounded-tl-sm' : 'bg-[#D4AF37] text-black font-semibold self-end rounded-tr-sm'}`}>{msg.text}</div>
              ))}
              {isTyping && !isChatFrozen && (
                 <div className="self-start bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm text-gray-400 flex items-center gap-1.5 shadow-sm">
                     <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t bg-white">
                {isChatFrozen ? (
                    <div className="text-center pb-2">
                        <p className="text-xs text-red-500 font-bold mb-3">Session expired due to inactivity.</p>
                        <button onClick={handleRestartChat} className="w-full bg-black text-gold py-3 rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition">
                            Start New Negotiation
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm z-10 pointer-events-none">₹</span>
                            <input type="text" value={userBid} onChange={(e) => { setUserBid(e.target.value); resetHesitationTimer(); }} onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }} placeholder={dealStatus === 'accepted' ? "Deal Locked!" : (isTyping || onCooldown) ? "Aura is replying..." : "Your counter-offer..."} disabled={dealStatus === 'accepted' || isTyping || onCooldown} className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-gold transition shadow-inner bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed" />
                        </div>
                        <button onClick={handleSendMessage} disabled={isTyping || onCooldown || !userBid.trim() || dealStatus === 'accepted'} className={`p-3 rounded-xl transition shadow-md flex items-center justify-center ${(!userBid.trim() || dealStatus === 'accepted' || isTyping || onCooldown) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-black text-gold hover:bg-gray-800 hover:-translate-y-0.5'}`}><Send size={20} /></button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;