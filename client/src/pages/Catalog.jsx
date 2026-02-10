import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Filter, SlidersHorizontal } from 'lucide-react';

const Catalog = () => {
  const { category } = useParams(); // e.g., 'gold', 'silver', 'all'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [priceRange, setPriceRange] = useState(200000); // Max Price
  const [selectedMetal, setSelectedMetal] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/api/products');
        setProducts(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading catalog");
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- FILTER LOGIC ---
  const filteredProducts = products.filter(product => {
    // 1. URL Category Filter (Gold/Silver/All)
    if (category === 'gold' && !product.metal_type.includes('GOLD')) return false;
    if (category === 'silver' && !product.metal_type.includes('SILVER')) return false;
    if (category === 'diamond' && !product.name.toLowerCase().includes('diamond')) return false;

    // 2. Sidebar Metal Filter
    if (selectedMetal !== 'ALL' && product.metal_type !== selectedMetal) return false;

    // 3. Price Filter
    const price = parseFloat(product.price_breakdown?.final_total_price || 0);
    if (price > priceRange) return false;

    return true;
  }).sort((a, b) => {
    // 4. Sorting
    const priceA = parseFloat(a.price_breakdown?.final_total_price || 0);
    const priceB = parseFloat(b.price_breakdown?.final_total_price || 0);
    
    if (sortBy === 'price_low') return priceA - priceB;
    if (sortBy === 'price_high') return priceB - priceA;
    return new Date(b.created_at) - new Date(a.created_at); // Newest
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
               className="border-none bg-gray-50 text-sm font-bold p-2 rounded focus:ring-0 cursor-pointer"
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
             >
               <option value="newest">Newest Arrivals</option>
               <option value="price_low">Price: Low to High</option>
               <option value="price_high">Price: High to Low</option>
             </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* SIDEBAR FILTERS */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
             {/* Metal Filter */}
             <div>
               <h3 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                 <Filter size={16} /> Metal Type
               </h3>
               <div className="space-y-2">
                 {['ALL', '22K_GOLD', 'SILVER'].map(type => (
                   <label key={type} className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMetal === type ? 'border-gold' : 'border-gray-300'}`}>
                        {selectedMetal === type && <div className="w-2 h-2 bg-gold rounded-full"></div>}
                     </div>
                     <span className={`text-sm ${selectedMetal === type ? 'text-black font-bold' : 'text-gray-500 group-hover:text-black transition'}`}>
                       {type.replace('_', ' ')}
                     </span>
                     <input type="radio" name="metal" className="hidden" onClick={() => setSelectedMetal(type)} />
                   </label>
                 ))}
               </div>
             </div>

             {/* Price Range */}
             <div>
               <h3 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                 <SlidersHorizontal size={16} /> Max Price
               </h3>
               <input 
                 type="range" 
                 min="5000" 
                 max="500000" 
                 step="5000" 
                 value={priceRange}
                 onChange={(e) => setPriceRange(e.target.value)}
                 className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
               />
               <div className="flex justify-between text-xs font-bold text-gray-600 mt-2">
                 <span>₹5k</span>
                 <span>₹{(priceRange/1000).toFixed(0)}k</span>
               </div>
             </div>
          </div>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            {loading ? (
               <div className="text-center py-20 text-gray-400">Loading Collection...</div>
            ) : filteredProducts.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
               </div>
            ) : (
               <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500">No products found matching your filters.</p>
                  <button onClick={() => {setPriceRange(500000); setSelectedMetal('ALL');}} className="mt-4 text-gold font-bold text-sm hover:underline">Clear Filters</button>
               </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Catalog;