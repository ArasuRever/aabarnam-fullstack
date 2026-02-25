import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, Sparkles, Flame, Crown } from 'lucide-react';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  // Simulated logic for Premium Badges
  // In a real app, 'isTrending' might come from your database (e.g., high view count)
  const isNew = new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); 
  const isHighValue = parseFloat(product.price_breakdown?.final_total_price || 0) > 100000;
  const isTrending = product.id % 4 === 0; // Demo logic: Shows 'Trending' on random items

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gold/10 transition-all duration-500 relative flex flex-col h-full">
      {/* Image Area */}
      <Link to={`/product/${product.id}`} className="relative aspect-[4/5] overflow-hidden bg-gray-50 block">
        <img 
          src={product.main_image_url || 'https://via.placeholder.com/400'} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        />
        
        {/* 🌟 PREMIUM MODERN BADGES */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10 items-start">
          
          {isNew && (
             <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black text-[10px] font-extrabold px-3 py-1 uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(251,191,36,0.5)] flex items-center gap-1.5 animate-pulse">
               <Sparkles size={12} className="text-black" /> Just Arrived
             </span>
          )}

          {isTrending && (
             <span className="bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5">
               <Flame size={12} className="text-orange-400" /> Trending
             </span>
          )}

          {isHighValue && !isNew && !isTrending && (
             <span className="bg-white/80 backdrop-blur-md border border-gold/30 text-gray-900 text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5">
               <Crown size={12} className="text-gold" /> Premium
             </span>
          )}
          
          {/* Default category badge if no other special badges apply */}
          {product.item_type && !isNew && !isHighValue && !isTrending && (
            <span className="bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200 text-[9px] font-bold px-2.5 py-1 uppercase tracking-widest rounded-full shadow-sm">
              {product.item_type}
            </span>
          )}
        </div>

        {/* Quick Buy Overlay Action (Glassmorphism effect) */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-center">
            <button 
               onClick={(e) => {
                 e.preventDefault(); 
                 navigate(`/product/${product.id}`); 
               }}
               className="bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 hover:bg-gold hover:text-black hover:border-gold transition-all shadow-xl w-full justify-center"
            >
               <Zap size={14} /> Quick View
            </button>
        </div>
      </Link>

      {/* Details Area */}
      <Link to={`/product/${product.id}`} className="p-5 flex flex-col flex-1 justify-between bg-white relative z-20">
        <div>
           <div className="flex justify-between items-start mb-2 gap-2">
             <h3 className="font-serif text-lg text-gray-900 leading-snug line-clamp-2 group-hover:text-gold transition-colors">{product.name}</h3>
             <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100 shrink-0 shadow-inner">
                 {product.metal_type === '22K_GOLD' ? '22K' : 'Silver'}
             </span>
           </div>
        </div>
        
        <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-50">
           <div>
             <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Live Price</span>
             <span className="text-gray-900 font-bold text-xl tracking-tight">
                 ₹{parseFloat(product.price_breakdown?.final_total_price || 0).toLocaleString('en-IN')}
             </span>
           </div>
           <button className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-gold group-hover:border-black transition-all shadow-sm hover:scale-110 active:scale-95">
              <ShoppingBag size={16} />
           </button>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;