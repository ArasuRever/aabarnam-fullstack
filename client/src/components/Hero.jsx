import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative w-full h-[600px] bg-gray-900 overflow-hidden">
      {/* Background Image */}
      <img 
        src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=2075&auto=format&fit=crop" 
        alt="Luxury Jewelry" 
        className="w-full h-full object-cover opacity-60"
      />
      
      {/* Text Overlay */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 animate-fade-in-up">
        <span className="text-gold tracking-[0.3em] text-sm font-bold uppercase mb-4">
          Timeless Elegance
        </span>
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 leading-tight">
          Pure Gold.<br />
          Pure Emotion.
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mb-10 font-light">
          Discover our handcrafted 22K Gold and Diamond collection, designed to celebrate your most precious moments.
        </p>
        
        <Link 
          to="/collections/all" 
          className="group bg-gold text-black px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-white transition-all duration-300 transform hover:scale-105"
        >
          Explore Collection 
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default Hero;