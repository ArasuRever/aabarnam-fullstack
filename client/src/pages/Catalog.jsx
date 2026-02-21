import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Filter, SlidersHorizontal, Layers, Scale } from 'lucide-react';

const Catalog = () => {
  const { category } = useParams(); 
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Filter States
  const [priceRange, setPriceRange] = useState(500000); // Default to Max
  const [selectedMetal, setSelectedMetal] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // NEW: Item Type Filter
  const [selectedWeight, setSelectedWeight] = useState('ALL'); // NEW: Weight Filter
  const [sortBy, setSortBy] = useState('newest');

  // Dynamic Lists for the UI based on inventory
  const [availableTypes, setAvailableTypes] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // ONLY FETCH IN-STOCK ITEMS
        const response = await axios.get('http://localhost:5000/api/products?inStock=true');
        setProducts(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products", error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- FILTER ENGINE ---
  const filteredProducts = products.filter(product => {
    // 1. URL Category Match
    if (category === 'gold' && !product.metal_type.includes('GOLD')) return false;
    if (category === 'silver' && !product.metal_type.includes('SILVER')) return false;

    // 2. Sidebar Metal Match
    if (selectedMetal !== 'ALL' && product.metal_type !== selectedMetal) return false;

    // 3. Sidebar Type Match
    if (selectedType !== 'ALL' && product.item_type !== selectedType) return false;

    // 4. Sidebar Weight Match
    if (selectedWeight !== 'ALL') {
        const weight = parseFloat(product.gross_weight);
        if (selectedWeight === 'under5' && weight >= 5) return false;
        if (selectedWeight === '5to15' && (weight < 5 || weight > 15)) return false;
        if (selectedWeight === 'over15' && weight <= 15) return false;
    }

    // 5. Sidebar Price Match
    const price = parseFloat(product.price_breakdown?.final_total_price || 0);
    if (price > priceRange) return false;

    return true;
  }).sort((a, b) => {
    // Sorting Engine
    const priceA = parseFloat(a.price_breakdown?.final_total_price || 0);
    const priceB = parseFloat(b.price_breakdown?.final_total_price || 0);
    if (sortBy === 'price_low') return priceA - priceB;
    if (sortBy === 'price_high') return priceB - priceA;
    return new Date(b.created_at) - new Date(a.created_at); // Newest default
  });

  return (
    <div className="bg-white min-h-screen pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-gray-100 pb-6">
          <div>
            <span className="text-gold text-xs font-bold uppercase tracking-widest">Collections</span>
            <h1 className="text-4xl font-serif text-gray-900 mt-2 capitalize">{category} Jewelry</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
             <span className="text-sm text-gray-500">{filteredProducts.length} Results</span>
             <select 
               className="border border-gray-200 bg-gray-50 text-sm font-bold p-2.5 rounded-lg focus:ring-0 cursor-pointer outline-none"
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
             >
               <option value="newest">Newest Arrivals</option>
               <option value="price_low">Price: Low to High</option>
               <option value="price_high">Price: High to Low</option>
             </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* SIDEBAR FILTERS (Now Supercharged) */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 h-fit sticky top-28">
             
             <div className="flex justify-between items-center mb-2">
                 <h2 className="font-serif font-bold text-xl text-gray-900">Filters</h2>
                 <button 
                    onClick={() => {
                        setPriceRange(500000); setSelectedMetal('ALL'); 
                        setSelectedType('ALL'); setSelectedWeight('ALL');
                    }} 
                    className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500 transition"
                 >
                     Reset All
                 </button>
             </div>

             {/* 1. Metal Filter */}
             <div className="border-t border-gray-200 pt-6">
               <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                 <Filter size={14} /> Material
               </h3>
               <div className="space-y-3">
                 {['ALL', '22K_GOLD', 'SILVER'].map(type => (
                   <label key={type} className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMetal === type ? 'border-gold' : 'border-gray-300'}`}>
                        {selectedMetal === type && <div className="w-2 h-2 bg-gold rounded-full"></div>}
                     </div>
                     <span className={`text-sm ${selectedMetal === type ? 'text-black font-bold' : 'text-gray-600 group-hover:text-black transition'}`}>
                       {type === 'ALL' ? 'All Metals' : type.replace('_', ' ')}
                     </span>
                     <input type="radio" className="hidden" onClick={() => setSelectedMetal(type)} />
                   </label>
                 ))}
               </div>
             </div>

             {/* 2. Item Type Filter */}
             {availableTypes.length > 0 && (
             <div className="border-t border-gray-200 pt-6">
               <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                 <Layers size={14} /> Category
               </h3>
               <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                 <label className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedType === 'ALL' ? 'bg-black border-black text-white' : 'border-gray-300'}`}>
                        {selectedType === 'ALL' && <span className="text-[10px]">✓</span>}
                     </div>
                     <span className={`text-sm ${selectedType === 'ALL' ? 'text-black font-bold' : 'text-gray-600 group-hover:text-black transition'}`}>Any Style</span>
                     <input type="radio" className="hidden" onClick={() => setSelectedType('ALL')} />
                 </label>
                 {availableTypes.map(type => (
                   <label key={type} className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedType === type ? 'bg-black border-black text-white' : 'border-gray-300'}`}>
                        {selectedType === type && <span className="text-[10px]">✓</span>}
                     </div>
                     <span className={`text-sm ${selectedType === type ? 'text-black font-bold' : 'text-gray-600 group-hover:text-black transition'} capitalize`}>
                       {type.toLowerCase()}
                     </span>
                     <input type="radio" className="hidden" onClick={() => setSelectedType(type)} />
                   </label>
                 ))}
               </div>
             </div>
             )}

             {/* 3. Weight Filter */}
             <div className="border-t border-gray-200 pt-6">
               <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                 <Scale size={14} /> Gross Weight
               </h3>
               <div className="space-y-3">
                 {[
                     { id: 'ALL', label: 'Any Weight' },
                     { id: 'under5', label: 'Under 5g (Light)' },
                     { id: '5to15', label: '5g - 15g (Medium)' },
                     { id: 'over15', label: 'Over 15g (Heavy)' }
                 ].map(weight => (
                   <label key={weight.id} className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedWeight === weight.id ? 'border-gold' : 'border-gray-300'}`}>
                        {selectedWeight === weight.id && <div className="w-2 h-2 bg-gold rounded-full"></div>}
                     </div>
                     <span className={`text-sm ${selectedWeight === weight.id ? 'text-black font-bold' : 'text-gray-600 group-hover:text-black transition'}`}>
                       {weight.label}
                     </span>
                     <input type="radio" className="hidden" onClick={() => setSelectedWeight(weight.id)} />
                   </label>
                 ))}
               </div>
             </div>

             {/* 4. Price Range */}
             <div className="border-t border-gray-200 pt-6">
               <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                 <SlidersHorizontal size={14} /> Max Price
               </h3>
               <input 
                 type="range" 
                 min="5000" 
                 max="500000" 
                 step="5000" 
                 value={priceRange}
                 onChange={(e) => setPriceRange(e.target.value)}
                 className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
               />
               <div className="flex justify-between text-xs font-bold text-gray-800 mt-3">
                 <span className="bg-white border border-gray-200 px-2 py-1 rounded">₹5,000</span>
                 <span className="bg-gold/10 text-gold-dark border border-gold/30 px-2 py-1 rounded">₹{parseInt(priceRange).toLocaleString('en-IN')}</span>
               </div>
             </div>
          </div>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            {loading ? (
               <div className="text-center py-32 text-gray-400">
                  <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  Loading Collection...
               </div>
            ) : filteredProducts.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
               </div>
            ) : (
               <div className="text-center py-32 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500 text-lg mb-2">No products match your exact filters.</p>
                  <button 
                     onClick={() => {
                        setPriceRange(500000); setSelectedMetal('ALL'); 
                        setSelectedType('ALL'); setSelectedWeight('ALL');
                     }} 
                     className="mt-4 bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gold transition shadow-md"
                  >
                     Clear All Filters
                  </button>
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Catalog;