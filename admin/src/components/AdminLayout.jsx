import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react'; // Added Users Icon

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('adminUser'));
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // UPDATED: Added Customers
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Orders', path: '/orders', icon: '📦' },
    { name: 'Customers', path: '/customers', icon: '👥' }, // NEW
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
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-900 text-white flex flex-col transition-all duration-300 ease-in-out h-full z-20 shadow-2xl overflow-hidden shrink-0 border-r border-gray-800`}
      >
        <div className="p-6 min-w-[16rem] border-b border-gray-800">
           <h1 className="text-2xl font-bold text-gold tracking-tight">Aabarnam</h1>
           <p className="text-xs text-gray-500 tracking-widest uppercase mt-1">Admin Console</p>
        </div>

        <nav className="flex-grow mt-6 min-w-[16rem] px-2 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                location.pathname === item.path 
                ? 'bg-gray-800 text-gold border-l-4 border-gold shadow-lg' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-3 text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-semibold">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-800 min-w-[16rem] bg-gray-900/50">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-gold text-black flex items-center justify-center font-bold mr-3">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-200 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-green-500 flex items-center">● Online</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-red-600/10 border border-red-600/30 text-red-500 rounded font-bold hover:bg-red-600 hover:text-white transition-all duration-200 text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
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
              {menuItems.find(m => m.path === location.pathname)?.name || 'Control Panel'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
             <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-mono font-bold text-gray-600 border border-gray-200">
               v1.0.5
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
          <div className="w-full max-w-full mx-auto animate-fade-in"> 
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;