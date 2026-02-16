import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X } from 'lucide-react';
import RateTicker from './RateTicker';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; 

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { cartCount } = useCart();

  if (location.pathname === '/auth' || location.pathname === '/checkout') {
      return (
          <div className="bg-white py-6 flex justify-center border-b border-gray-100">
              <Link to="/" className="text-3xl font-serif font-bold text-black tracking-tighter hover:opacity-80 transition">
                 Aabarnam<span className="text-gold">.</span>
              </Link>
          </div>
      );
  }

  return (
    <div className="font-sans">
      {/* 1. Live Ticker */}
      <RateTicker />

      {/* 2. Main Navigation */}
      <nav className="bg-white sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="md:hidden p-2 text-gray-600 hover:text-black transition"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <span className="text-3xl font-serif font-bold text-black tracking-tighter group-hover:opacity-80 transition">
                Aabarnam<span className="text-gold">.</span>
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex space-x-8 items-center">
              <Link to="/" className="text-gray-900 hover:text-gold font-medium transition text-sm uppercase tracking-wide">Home</Link>
              <Link to="/collections/gold" className="text-gray-900 hover:text-gold font-medium transition text-sm uppercase tracking-wide">Gold</Link>
              <Link to="/collections/silver" className="text-gray-900 hover:text-gold font-medium transition text-sm uppercase tracking-wide">Silver</Link>
              <Link to="/collections/diamond" className="text-gray-900 hover:text-gold font-medium transition text-sm uppercase tracking-wide">Diamond</Link>
              <Link to="/about" className="text-gray-500 hover:text-gold font-medium transition text-sm uppercase tracking-wide">Our Story</Link>
            </div>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-black transition hover:scale-110 hidden sm:block">
                <Search size={20} />
              </button>
              
              {/* User Account / Login Icon */}
              <button 
                onClick={() => user ? navigate('/account') : navigate('/auth')} 
                className="p-2 text-gray-600 hover:text-gold transition hover:scale-110"
              >
                <User size={20} />
              </button>
              
              {/* Cart Icon with Live Badge */}
              <Link to="/cart" className="p-2 text-gray-600 hover:text-gold transition relative group hover:scale-110">
                <ShoppingBag size={20} className="group-hover:text-gold transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-fade-in">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="md:hidden bg-white border-t animate-fade-in-up">
            <div className="px-4 pt-4 pb-6 space-y-2">
              <Link to="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded">Home</Link>
              <Link to="/collections/gold" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded">Gold Collection</Link>
              <Link to="/collections/silver" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded">Silver Collection</Link>
              <Link to="/cart" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded">
                My Bag ({cartCount})
              </Link>
              <button 
                onClick={() => { setIsOpen(false); user ? navigate('/account') : navigate('/auth'); }}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gold bg-gray-50 rounded"
              >
                {user ? 'My Account' : 'Sign In / Register'}
              </button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;