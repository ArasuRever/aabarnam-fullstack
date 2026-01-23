import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('adminUser'));
  
  // State to control Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'bg-gray-800 text-gold' : 'hover:bg-gray-800';

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* Sidebar - Fixed to prevent layout breaking */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-black text-white flex flex-col transition-all duration-300 ease-in-out h-full z-20 shadow-xl overflow-hidden shrink-0`}
      >
        <div className="p-6 text-2xl font-bold text-gold border-b border-gray-800 min-w-[16rem]">
          Aabarnam
        </div>
        <nav className="flex-1 p-4 space-y-2 min-w-[16rem]">
          <Link to="/dashboard" className={`block w-full text-left px-4 py-3 rounded font-semibold transition ${isActive('/dashboard')}`}>
            Dashboard
          </Link>
          <Link to="/daily-rates" className={`block w-full text-left px-4 py-3 rounded font-semibold transition ${isActive('/daily-rates')}`}>
            Daily Rates
          </Link>
          <Link to="/products" className={`block w-full text-left px-4 py-3 rounded font-semibold transition ${isActive('/products')}`}>
            Products
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800 min-w-[16rem]">
          <p className="text-sm text-gray-400 mb-2 truncate">User: {user?.name}</p>
          <button 
            onClick={handleLogout}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded transition font-semibold"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header with Hamburger Icon */}
        <header className="bg-white border-b shadow-sm h-16 flex items-center px-4 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition focus:outline-none"
            title="Toggle Sidebar"
          >
            {/* SVG Hamburger Icon */}
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          <h2 className="ml-4 text-xl font-bold text-gray-800">Admin Control</h2>
        </header>

        {/* Scrollable Page Content */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-100">
          {children}
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;