import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ArrowRight, ShieldCheck, Gem, TrendingUp, Sparkles, Truck } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({ gold: '...', silver: '...' });

  useEffect(() => {
    // 1. Fetch In-Stock Products
    const fetchLatestProducts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/products?inStock=true');
        setProducts(res.data.slice(0, 4)); // Show only top 4 trending items
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setLoading(false);
      }
    };

    // 2. Fetch Live Market Rates
    const fetchLiveRates = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/rates');
        const goldRate = res.data.find(r => r.metal_type === '22K_GOLD');
        const silverRate = res.data.find(r => r.metal_type === 'SILVER');
        setRates({
            gold: goldRate ? parseFloat(goldRate.rate_per_gram).toLocaleString('en-IN') : '...',
            silver: silverRate ? parseFloat(silverRate.rate_per_gram).toLocaleString('en-IN') : '...'
        });
      } catch(e) { 
        console.error("Error loading rates:", e); 
      }
    };

    // Run both fetches when the page loads
    fetchLatestProducts();
    fetchLiveRates();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      
      {/* 1. CINEMATIC HERO SECTION */}
      <div className="relative w-full h-[80vh] bg-gray-900 overflow-hidden flex items-center justify-center">
        <img 
          src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Jewelry Cover" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 object-center scale-105 animate-slow-pan"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-6">
              <span className="w-12 h-[1px] bg-gold"></span>
              <span className="text-gold tracking-[0.4em] text-xs font-bold uppercase">Heritage Collection</span>
              <span className="w-12 h-[1px] bg-gold"></span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-6 leading-tight drop-shadow-lg">
            Where Tradition <br/> <span className="italic text-gray-200 font-light">Meets Elegance.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light drop-shadow-md">
            Handcrafted 22K Gold and Diamond masterpieces designed to celebrate your most precious moments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/collections/gold" className="bg-gold text-black px-8 py-4 rounded-full font-bold hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              Shop Gold
            </Link>
            <Link to="/collections/all" className="bg-transparent border border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-black transition-all">
              View All Collections
            </Link>
          </div>
        </div>
      </div>

      {/* 2. LIVE MARKET PULSE (TRUST BUILDER) */}
      <div className="bg-black text-white py-12 border-b-4 border-gold">
         <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
                <div className="bg-gold/20 p-3 rounded-full"><TrendingUp size={28} className="text-gold" /></div>
                <div>
                    <h3 className="font-serif text-2xl text-gold">Live Market Rates</h3>
                    <p className="text-gray-400 text-sm font-light">Transparent pricing, updated daily.</p>
                </div>
            </div>
            <div className="flex gap-8">
                <div className="text-center md:text-left border-r border-gray-700 pr-8">
                    <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">22K Gold (per gram)</p>
                    <p className="text-4xl font-mono font-bold text-white">₹{rates.gold}</p>
                </div>
                <div className="text-center md:text-left">
                    <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Silver (per gram)</p>
                    <p className="text-4xl font-mono font-bold text-white">₹{rates.silver}</p>
                </div>
            </div>
         </div>
      </div>

      {/* 3. SHOP BY CATEGORY */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-serif text-gray-900 mb-4">Curated For You</h2>
           <p className="text-gray-500 max-w-2xl mx-auto">Explore our signature categories tailored for every occasion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Gold Card */}
           <Link to="/collections/gold" className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer">
              <img src="https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?q=80&w=800&auto=format&fit=crop" alt="Gold" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                 <h3 className="text-3xl font-serif text-white mb-2">Pure Gold</h3>
                 <p className="text-gold font-bold flex items-center gap-2 text-sm uppercase tracking-wide">Explore <ArrowRight size={16}/></p>
              </div>
           </Link>

           {/* Silver Card */}
           <Link to="/collections/silver" className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer">
              <img src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop" alt="Silver" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                 <h3 className="text-3xl font-serif text-white mb-2">Sterling Silver</h3>
                 <p className="text-gray-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wide group-hover:text-white transition">Explore <ArrowRight size={16}/></p>
              </div>
           </Link>

           {/* Diamond Card */}
           <Link to="/collections/diamond" className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer">
              <img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800&auto=format&fit=crop" alt="Diamond" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                 <h3 className="text-3xl font-serif text-white mb-2">Diamonds</h3>
                 <p className="text-gray-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wide group-hover:text-white transition">Explore <ArrowRight size={16}/></p>
              </div>
           </Link>
        </div>
      </section>

      {/* 4. NEW ARRIVALS */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
               <div>
                 <span className="text-gold font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Sparkles size={14}/> Fresh from the Atelier</span>
                 <h2 className="text-4xl font-serif text-gray-900 mt-2">New Arrivals</h2>
               </div>
               <Link to="/collections/all" className="hidden md:flex items-center gap-2 font-bold text-gray-600 hover:text-gold transition">
                 View Entire Collection <ArrowRight size={18} />
               </Link>
            </div>

            {loading ? (
               <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div></div>
            ) : products.length === 0 ? (
               <div className="text-center text-gray-400 py-10 border-2 border-dashed rounded-xl">Inventory updating soon.</div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                 {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                 ))}
               </div>
            )}
            
            <div className="mt-8 text-center md:hidden">
                 <Link to="/collections/all" className="inline-block border border-gray-300 px-6 py-3 rounded-full font-bold text-gray-700">View All</Link>
            </div>
        </div>
      </section>

      {/* 5. BRAND PROMISE */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
           <div className="flex flex-col items-center pt-8 md:pt-0">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6"><ShieldCheck size={32} className="text-gold" /></div>
              <h3 className="font-serif text-xl mb-3 text-gray-900">100% Certified</h3>
              <p className="text-gray-500 text-sm leading-relaxed px-4">Every piece of gold is BIS Hallmarked, ensuring the highest standards of purity and authenticity.</p>
           </div>
           <div className="flex flex-col items-center pt-8 md:pt-0">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Truck size={32} className="text-gold" /></div>
              <h3 className="font-serif text-xl mb-3 text-gray-900">Insured Shipping</h3>
              <p className="text-gray-500 text-sm leading-relaxed px-4">Your precious items are fully insured during transit and delivered securely to your doorstep.</p>
           </div>
           <div className="flex flex-col items-center pt-8 md:pt-0">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Gem size={32} className="text-gold" /></div>
              <h3 className="font-serif text-xl mb-3 text-gray-900">Lifetime Exchange</h3>
              <p className="text-gray-500 text-sm leading-relaxed px-4">We offer a transparent lifetime exchange policy on all our gold and diamond jewelry.</p>
           </div>
        </div>
      </section>

    </div>
  );
};

export default Home;