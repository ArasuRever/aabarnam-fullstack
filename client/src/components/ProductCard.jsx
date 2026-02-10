import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const ProductCard = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="block">
        <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
        {/* Image Area */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
            <img 
            src={product.main_image_url || 'https://via.placeholder.com/400'} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.item_type && (
                <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 uppercase tracking-wide rounded-sm">
                {product.item_type}
                </span>
            )}
            </div>

            {/* Quick Add Button */}
            <button className="absolute bottom-3 right-3 bg-white p-3 rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gold hover:text-black">
            <ShoppingBag size={20} />
            </button>
        </div>

        {/* Details Area */}
        <div className="p-4">
            <div className="flex justify-between items-start mb-2">
            <h3 className="font-serif text-lg text-gray-900 truncate pr-2">{product.name}</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {product.metal_type === '22K_GOLD' ? '22K' : 'Silver'}
            </span>
            </div>
            
            <div className="flex items-end gap-2">
            <span className="text-gold-dark font-bold text-xl">
                ₹{product.price_breakdown?.final_total_price}
            </span>
            <span className="text-xs text-gray-400 mb-1 line-through decoration-red-400">
                {/* We can show original price here if discount exists */}
            </span>
            </div>
        </div>
        </div>
    </Link>
  );
};

export default ProductCard;