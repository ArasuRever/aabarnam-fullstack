import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('adminUser'));
  
  // State for sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Inventory', path: '/products', icon: '💎' },
    { name: 'Daily Rates', path: '/daily-rates', icon: '📈' },
    { name: 'Pricing Rules', path: '/pricing-rules', icon: '⚙️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* Sidebar - Transitioning width */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-900 text-white flex flex-col transition-all duration-300 ease-in-out h-full z-20 shadow-2xl overflow-hidden shrink-0`}
      >
        {/* Brand Header */}
        <div className="p-6 text-2xl font-bold border-b border-gray-800 text-gold min-w-[16rem]">
          Aabarnam Admin
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow mt-4 min-w-[16rem]">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-4 transition-all duration-200 ${
                location.pathname === item.path 
                ? 'bg-gray-800 border-r-4 border-gold text-gold' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="font-semibold">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile & Logout Section */}
        <div className="p-6 border-t border-gray-800 min-w-[16rem] bg-gray-900">
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Logged in as</p>
            <p className="text-sm font-bold text-gray-200 truncate">{user?.name || 'Administrator'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-red-600/10 border border-red-600/50 text-red-500 rounded font-bold hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            Logout 🚪
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Top Header with Hamburger Icon */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              title="Toggle Menu"
            >
              <svg 
                className={`w-6 h-6 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="ml-4 text-xl font-bold text-gray-800">
              {menuItems.find(m => m.path === location.pathname)?.name || 'Admin Control'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold px-2 py-1 bg-gold/10 text-gold rounded border border-gold/20">
              LIVE SYSTEM
            </span>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;