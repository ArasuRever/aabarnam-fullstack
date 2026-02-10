import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Loader } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/products');
        // Take the first 4 items as "New Arrivals"
        setProducts(res.data.slice(0, 4));
        setLoading(false);
      } catch (err) {
        console.error("Error loading products");
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  return (
    <div className="bg-white">
      {/* 1. Hero Banner */}
      <Hero />

      {/* 2. New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-between items-end mb-10">
           <div>
             <span className="text-gold font-bold uppercase tracking-widest text-xs">Fresh from the Atelier</span>
             <h2 className="text-4xl font-serif text-gray-900 mt-2">New Arrivals</h2>
           </div>
           <a href="/collections/all" className="hidden md:flex items-center gap-2 font-bold hover:text-gold transition">
             View All <ArrowRight size={18} />
           </a>
        </div>

        {loading ? (
           <div className="flex justify-center py-20"><Loader className="animate-spin text-gold" /></div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
           </div>
        )}
      </section>

      {/* 3. Trust Factors (Static) */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
           <div>
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="font-bold text-lg mb-2">BIS Hallmarked</h3>
              <p className="text-gray-500 text-sm">100% Certified 916 Gold & Authentic Gemstones.</p>
           </div>
           <div>
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="font-bold text-lg mb-2">Insured Shipping</h3>
              <p className="text-gray-500 text-sm">Safe and secure delivery to your doorstep.</p>
           </div>
           <div>
              <div className="text-4xl mb-4">💎</div>
              <h3 className="font-bold text-lg mb-2">Lifetime Exchange</h3>
              <p className="text-gray-500 text-sm">Transparent policies for your peace of mind.</p>
           </div>
        </div>
      </section>
    </div>
  );
};

export default Home;