import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, Truck, RotateCcw, Star, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext'; // Import Cart Hook

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart(); // Get Add function
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

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

  const handleAddToCart = () => {
    addToCart(product);
    alert(`Successfully added ${product.name} to your bag! 🛍️`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gold font-bold text-xl animate-pulse">Loading treasure...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center text-gray-500">Product not found.</div>;

  const price = product.price_breakdown?.final_total_price;

  return (
    <div className="bg-white pt-10 pb-20 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEFT: IMAGE GALLERY */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 relative group">
              <img 
                src={activeImage || 'https://via.placeholder.com/600'} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4">
                 <span className="bg-black/80 backdrop-blur-sm text-gold text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-sm shadow-sm">
                    {product.item_type}
                 </span>
              </div>
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-5 gap-3">
              {/* Main Thumb */}
              <button 
                onClick={() => setActiveImage(product.main_image_url)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImage === product.main_image_url ? 'border-gold opacity-100 ring-1 ring-gold' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={product.main_image_url} className="w-full h-full object-cover" alt="main thumb" />
              </button>
              
              {/* Gallery Thumbs */}
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

            {/* Price Block */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900 tracking-tight">₹{price}</span>
                <span className="text-xs text-green-600 font-bold mb-2 bg-green-100 px-2 py-1 rounded-full animate-pulse">● Live Price</span>
              </div>
              <p className="text-xs text-gray-500">
                Includes GST and Hallmarking charges. Price updated based on today's gold rate.
              </p>
            </div>

            {/* Specifications Grid */}
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

            {/* Action Buttons */}
            <div className="flex gap-4 mb-10">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
              >
                <ShoppingBag size={20} className="group-hover:text-gold transition-colors" /> 
                Add to Cart
              </button>
              <button className="w-14 h-14 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95">
                 <Heart size={20} />
              </button>
            </div>

            {/* Trust Badges */}
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

            {/* Description Accordion (Simplified) */}
            <div className="mt-8 pt-8 border-t border-gray-100">
               <h3 className="font-serif text-lg mb-4 text-gray-900">Description</h3>
               <p className="text-gray-600 leading-relaxed text-sm">
                 {product.description || `Experience the elegance of this handcrafted ${product.item_type.toLowerCase()}. Made with precision and care, this piece features authentic ${product.metal_type.replace('_', ' ')} and is perfect for both daily wear and special occasions.`}
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;