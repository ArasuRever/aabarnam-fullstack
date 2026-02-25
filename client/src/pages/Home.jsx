import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ArrowRight, ShieldCheck, Gem, TrendingUp, Sparkles, Truck, Bot, Send, Loader2 } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({ gold: '...', silver: '...' });

  // 🌟 NEW: AURA AI EXPLORER STATE
  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState(null);

  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/products?inStock=true');
        setProducts(res.data.slice(0, 4)); 
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setLoading(false);
      }
    };

    const fetchLiveRates = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/rates');
        const goldRate = res.data.find(r => r.metal_type === '22K_GOLD');
        const silverRate = res.data.find(r => r.metal_type === 'SILVER');
        setRates({
            gold: goldRate ? parseFloat(goldRate.rate_per_gram).toLocaleString('en-IN') : '...',
            silver: silverRate ? parseFloat(silverRate.rate_per_gram).toLocaleString('en-IN') : '...'
        });
      } catch(e) { console.error("Error loading rates:", e); }
    };

    fetchLatestProducts();
    fetchLiveRates();
  }, []);

  // 🌟 NEW: AURA AI SEARCH LOGIC (Frontend Simulation for now)
  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    
    setIsAiSearching(true);
    
    // Simulate AI processing delay
    setTimeout(async () => {
      try {
        // Fetch all products to search through
        const res = await axios.get('http://localhost:5000/api/products?inStock=true');
        const allItems = res.data;
        
        const query = aiQuery.toLowerCase();
        // Smart filtering based on user input
        const matches = allItems.filter(item => {
           const nameMatch = item.name.toLowerCase().includes(query);
           const typeMatch = item.item_type && query.includes(item.item_type.toLowerCase());
           const metalMatch = item.metal_type && query.includes(item.metal_type.split('_')[0].toLowerCase());
           
           // Simple price intent extraction (e.g., "under 50000")
           let priceMatch = true;
           if (query.includes('under')) {
               const maxPriceMatch = query.match(/under\s*(\d+)/);
               if (maxPriceMatch) {
                   const maxPrice = parseInt(maxPriceMatch[1]);
                   const itemPrice = parseFloat(item.price_breakdown?.final_total_price || 0);
                   priceMatch = itemPrice <= maxPrice;
               }
           }
           
           return (nameMatch || typeMatch || metalMatch) && priceMatch;
        });

        setAiResults(matches.slice(0, 3)); // Return top 3 suggestions
      } catch (error) {
        console.error("AI Search Failed", error);
        setAiResults([]);
      } finally {
        setIsAiSearching(false);
      }
    }, 1500); // 1.5s delay to mimic "Aura is typing..."
  };

  return (
    <div className="bg-white min-h-screen">
      
      {/* 1. CINEMATIC HERO SECTION */}
      <div className="relative w-full h-[80vh] bg-gray-900 overflow-hidden flex items-center justify-center">
        <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=2070&auto=format&fit=crop" alt="Luxury Jewelry Cover" className="absolute inset-0 w-full h-full object-cover opacity-50 object-center scale-105 animate-slow-pan" />
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
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light drop-shadow-md">Handcrafted masterpieces designed to celebrate your most precious moments.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/collections/gold" className="bg-gold text-black px-8 py-4 rounded-full font-bold hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]">Shop Gold</Link>
            <Link to="/collections/all" className="bg-transparent border border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-black transition-all">View All Collections</Link>
          </div>
        </div>
      </div>

      {/* 2. LIVE MARKET PULSE */}
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

      {/* 🌟 3. AURA EXPLORER (NEW SECTION) */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <span className="bg-gold/10 text-gold-dark px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">Powered by AI</span>
            <h2 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4 flex justify-center items-center gap-3">
               Explore with Aura <Sparkles className="text-gold" size={32} />
            </h2>
            <p className="text-gray-500 text-lg">Tell our intelligent assistant exactly what you desire. She will curate the vault for you.</p>
          </div>

          <form onSubmit={handleAiSearch} className="relative group max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Bot className="text-gray-400 group-focus-within:text-gold transition-colors" size={24} />
            </div>
            <input 
              type="text" 
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. 'I need a lightweight gold necklace under 80000'" 
              className="w-full pl-16 pr-16 py-5 bg-white border-2 border-gray-100 rounded-full text-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:shadow-[0_8px_30px_rgba(212,175,55,0.15)] focus:border-gold outline-none transition-all placeholder-gray-300"
            />
            <button 
              type="submit" 
              disabled={isAiSearching || !aiQuery.trim()}
              className="absolute inset-y-2 right-2 bg-black text-white px-6 rounded-full font-bold hover:bg-gold hover:text-black transition flex items-center gap-2 disabled:opacity-50"
            >
               {isAiSearching ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
            </button>
          </form>

          {/* AI Suggestions Popover */}
          {aiResults !== null && (
            <div className="mt-8 animate-fade-in-up">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Bot size={18} className="text-gold"/> Aura suggests...</h3>
                  <button onClick={() => setAiResults(null)} className="text-xs text-gray-400 hover:text-black">Clear</button>
                </div>
                
                {aiResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {aiResults.map(item => (
                      <div key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl cursor-pointer hover:border-gold hover:bg-gold/5 transition group">
                         <img src={`data:image/jpeg;base64,${item.main_image_url}`} alt={item.name} className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition" />
                         <div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.metal_type.replace('_', ' ')}</p>
                            <p className="text-gold-dark font-bold text-sm mt-1">₹{parseFloat(item.price_breakdown?.final_total_price || 0).toLocaleString()}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>I couldn't find exactly what you're looking for.</p>
                    <Link to="/collections/all" className="text-gold font-bold hover:underline mt-2 inline-block">Browse all collections instead</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. SHOP BY CATEGORY */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-serif text-gray-900 mb-4">Curated For You</h2>
           <p className="text-gray-500 max-w-2xl mx-auto">Explore our signature categories tailored for every occasion.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Link to="/collections/gold" className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer">
              <img src="https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?q=80&w=800&auto=format&fit=crop" alt="Gold" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                 <h3 className="text-3xl font-serif text-white mb-2">Pure Gold</h3>
                 <p className="text-gold font-bold flex items-center gap-2 text-sm uppercase tracking-wide">Explore <ArrowRight size={16}/></p>
              </div>
           </Link>
           <Link to="/collections/silver" className="group relative h-[400px] overflow-hidden rounded-2xl cursor-pointer">
              <img src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop" alt="Silver" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                 <h3 className="text-3xl font-serif text-white mb-2">Sterling Silver</h3>
                 <p className="text-gray-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wide group-hover:text-white transition">Explore <ArrowRight size={16}/></p>
              </div>
           </Link>
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

      {/* 5. NEW ARRIVALS */}
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
        </div>
      </section>

      {/* 6. BRAND PROMISE */}
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