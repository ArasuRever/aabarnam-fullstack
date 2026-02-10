import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X } from 'lucide-react';
import RateTicker from './RateTicker';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="font-sans">
      {/* 1. Live Ticker */}
      <RateTicker />

      {/* 2. Main Navigation */}
      <nav className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-gray-600">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-3xl font-serif font-bold text-black tracking-tighter">
                Aabarnam<span className="text-gold">.</span>
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex space-x-8 items-center">
              <Link to="/" className="text-gray-900 hover:text-gold font-medium transition">Home</Link>
              <Link to="/collections/gold" className="text-gray-900 hover:text-gold font-medium transition">Gold</Link>
              <Link to="/collections/silver" className="text-gray-900 hover:text-gold font-medium transition">Silver</Link>
              <Link to="/collections/diamond" className="text-gray-900 hover:text-gold font-medium transition">Diamond</Link>
              <Link to="/about" className="text-gray-500 hover:text-gold font-medium transition">Our Story</Link>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-black transition">
                <Search size={20} />
              </button>
              <Link to="/account" className="p-2 text-gray-600 hover:text-black transition hidden sm:block">
                <User size={20} />
              </Link>
              <Link to="/cart" className="p-2 text-gray-600 hover:text-black transition relative">
                <ShoppingBag size={20} />
                <span className="absolute top-0 right-0 bg-gold text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50">Home</Link>
              <Link to="/collections/gold" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50">Gold</Link>
              <Link to="/collections/silver" className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50">Silver</Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;