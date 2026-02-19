import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ShoppingBag, ShieldCheck, Truck, RotateCcw, 
  Heart, MapPin, Info, X, MessageCircle, Send 
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

  // AI Negotiation States
  const [showChat, setShowChat] = useState(false);
  const [userBid, setUserBid] = useState('');
  const [isBargaining, setIsBargaining] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Namaste! I am the manager here. This piece is exquisite. Would you like to discuss the price?' }
  ]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(res.data);
        setActiveImage(res.data.main_image_url);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching product details");
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // --- UPGRADED AI NEGOTIATION LOGIC (NOW WITH MEMORY) ---
  const handleBargain = async () => {
    if (!userBid.trim()) return;
    
    // Clean up input and add the user's message to the chat history locally
    const currentInput = userBid;
    const newUserMsg = { sender: 'user', text: currentInput };
    
    const updatedHistory = [...chatMessages, newUserMsg];
    setChatMessages(updatedHistory);
    setUserBid('');
    setIsBargaining(true);

    try {
        // Send the complete updated history to the backend so the AI remembers past offers
        const res = await axios.post('http://localhost:5000/api/bargain', { 
            product_id: id, 
            user_bid: currentInput,
            chat_history: updatedHistory 
        });
        
        // Add the bot's response to the chat
        setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.response_message }]);
        
        if (res.data.status === 'accepted') {
            setNegotiatedPrice(res.data.counter_offer);
            toast.success("Deal Accepted! Price updated.");
        }
    } catch (err) {
        toast.error("Manager is currently helping another client.");
    } finally {
        setIsBargaining(false);
    }
  };

  const handleAddToCart = () => {
    const finalPrice = negotiatedPrice || product.price_breakdown?.final_total_price;
    const productToCart = {
      ...product,
      price_breakdown: {
        ...product.price_breakdown,
        final_total_price: finalPrice
      }
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

  const displayPrice = negotiatedPrice || product.price_breakdown?.final_total_price;
  const breakdown = product.price_breakdown;

  return (
    <div className="bg-white pt-10 pb-20 animate-fade-in relative">
      
      {/* --- MODAL: PRICE BREAKDOWN --- */}
      {showBreakdown && breakdown && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Info size={18} className="text-gold"/> Transparent Pricing</h3>
                 <button onClick={() => setShowBreakdown(false)} className="text-gray-400 hover:text-black transition"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 text-sm">
                 <div className="flex justify-between text-gray-600">
                    <span>Gold Value <br/><span className="text-xs text-gray-400">({product.net_weight}g × ₹{breakdown.metal_rate}/g)</span></span>
                    <span className="font-medium">₹{breakdown.raw_metal_value}</span>
                 </div>
                 <div className="flex justify-between text-gray-600">
                    <span>Wastage <br/><span className="text-xs text-gray-400">({product.wastage_pct}%)</span></span>
                    <span className="font-medium">₹{breakdown.wastage_value}</span>
                 </div>
                 <div className="flex justify-between text-gray-600">
                    <span>Making Charges</span>
                    <span className="font-medium">₹{breakdown.making_charge}</span>
                 </div>
                 <div className="flex justify-between text-gray-600 border-b pb-4">
                    <span>GST (3%)</span>
                    <span className="font-medium">₹{breakdown.gst_amount}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 font-extrabold text-xl text-gray-900">
                    <span>Final Price</span>
                    <span className="text-gold-dark">₹{breakdown.final_total_price}</span>
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

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900 tracking-tight">₹{displayPrice}</span>
                {negotiatedPrice && (
                  <span className="text-xs text-green-600 font-bold mb-2 bg-green-100 px-2 py-1 rounded-full">
                    Special Negotiated Deal ✅
                  </span>
                )}
                {!negotiatedPrice && (
                   <span className="text-xs text-green-600 font-bold mb-2 bg-green-100 px-2 py-1 rounded-full animate-pulse">● Live Price</span>
                )}
              </div>
              <button 
                 onClick={() => setShowBreakdown(true)}
                 className="text-xs text-gold-dark font-bold hover:underline flex items-center gap-1 cursor-pointer mt-2"
              >
                 <span className="flex items-center gap-1"><Info size={14} /> View Price Breakdown</span>
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
                Add to Cart
              </button>
              
              <button 
                onClick={() => setShowChat(!showChat)}
                className="w-14 h-14 bg-gold rounded-full flex items-center justify-center text-black shadow-lg hover:scale-110 transition-all active:scale-95"
                title="Negotiate Price"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center border-t border-gray-100 pt-8">
               <div className="flex flex-col items-center gap-2">
                  <div className="bg-gray-100 p-3 rounded-full"><ShieldCheck size={20} className="text-gold" /></div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">BIS Hallmarked</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="bg-gray-100 p-3 rounded-full"><Truck size={20} className="text-gold" /></div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Insured Shipping</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="bg-gray-100 p-3 rounded-full"><RotateCcw size={20} className="text-gold" /></div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Lifetime Exchange</span>
               </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
               <h3 className="font-serif text-lg mb-4 text-gray-900">Description</h3>
               <p className="text-gray-600 leading-relaxed text-sm">
                 {product.description || `Experience the elegance of this handcrafted ${product.item_type.toLowerCase()}. Made with precision and care, this piece features authentic ${product.metal_type.replace('_', ' ')} and is perfect for both daily wear and special occasions.`}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- SCALABLE AI CHAT WINDOW --- */}
      {showChat && (
        <div 
          className="fixed bottom-6 right-6 min-w-[320px] max-w-[600px] w-80 bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden z-[100] animate-fade-in flex flex-col resize"
          style={{ height: '450px', direction: 'rtl' }}
        >
          <div className="flex flex-col h-full w-full" style={{ direction: 'ltr' }}>
            <div className="bg-black p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="font-bold text-sm tracking-wide">Aabarnam Negotiator</span>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:text-gold transition"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col">
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
              {isBargaining && (
                 <div className="self-start bg-white border p-2 rounded-lg text-[10px] animate-pulse">Manager is calculating...</div>
              )}
            </div>

            <div className="p-3 border-t bg-white flex gap-2 items-center">
              <div className="relative flex-1">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm z-10 pointer-events-none">₹</span>
                 <input 
                   type="text" 
                   value={userBid} 
                   onChange={(e) => setUserBid(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') handleBargain(); }}
                   placeholder="Type your offer..." 
                   className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold transition shadow-inner bg-gray-50 focus:bg-white" 
                 />
              </div>
              <button 
                onClick={handleBargain} 
                disabled={isBargaining || !userBid.trim()}
                className={`p-2.5 rounded-xl transition shadow-md ${!userBid.trim() ? 'bg-gray-100 text-gray-400' : 'bg-black text-gold hover:bg-gray-800'}`}
              >
                 <Send size={18} />
              </button>
            </div>
            <div className="bg-gray-50 px-4 py-2 text-[9px] text-center text-gray-400 border-t">
               Offers subject to manager approval. Deal valid for this session only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;