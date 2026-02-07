import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/dashboard/stats');
        setStats(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Loading Command Center...</div>;

  const { overview, category_breakdown } = stats;

  // Formatter for Currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Command Center</h1>
          <p className="text-gray-500 text-sm">Real-time inventory valuation based on live rates.</p>
        </div>
        <div className="text-right">
           <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Inventory Value</p>
           <h2 className="text-4xl font-extrabold text-gold text-shadow-sm">
             {formatCurrency(overview.total_valuation)}
           </h2>
        </div>
      </div>

      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* GOLD CARD */}
        <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-6xl">🏆</span>
            </div>
            <h3 className="text-yellow-800 font-bold text-sm uppercase tracking-wider mb-2">Gold Reserves</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{overview.total_gold_weight_g}</span>
                <span className="text-sm text-gray-500 font-medium">grams</span>
            </div>
            <div className="mt-4 pt-4 border-t border-yellow-100 flex justify-between items-center">
               <span className="text-xs text-yellow-700 font-bold bg-yellow-100 px-2 py-1 rounded">22K & 24K</span>
               <Link to="/products" className="text-xs font-bold text-yellow-700 hover:underline">View Stock →</Link>
            </div>
        </div>

        {/* SILVER CARD */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-6xl">⚪</span>
            </div>
            <h3 className="text-gray-600 font-bold text-sm uppercase tracking-wider mb-2">Silver Reserves</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{overview.total_silver_weight_g}</span>
                <span className="text-sm text-gray-500 font-medium">grams</span>
            </div>
             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">92.5 & Fine</span>
               <Link to="/products" className="text-xs font-bold text-gray-600 hover:underline">View Stock →</Link>
            </div>
        </div>

        {/* TOTAL ITEMS CARD */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-6xl">📦</span>
            </div>
            <h3 className="text-blue-800 font-bold text-sm uppercase tracking-wider mb-2">Total SKU Count</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{overview.total_items}</span>
                <span className="text-sm text-gray-500 font-medium">Unique Items</span>
            </div>
             <div className="mt-4 pt-4 border-t border-blue-100 flex justify-between items-center">
               <Link to="/products/add" className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded shadow-md hover:bg-blue-700 transition">
                  + Add Stock
               </Link>
            </div>
        </div>
      </div>

      {/* 2. CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6">Inventory Distribution</h3>
            <div className="space-y-4">
                {category_breakdown.map((cat, index) => (
                    <div key={cat.item_type} className="flex items-center">
                        <div className="w-32 text-sm font-bold text-gray-500">{cat.item_type || 'Uncategorized'}</div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden mx-4">
                            <div 
                                className="h-full bg-gray-800 rounded-full" 
                                style={{ width: `${(cat.count / overview.total_items) * 100}%` }}
                            ></div>
                        </div>
                        <div className="w-12 text-right text-sm font-bold text-gray-800">{cat.count}</div>
                    </div>
                ))}
            </div>
         </div>

         {/* QUICK ACTIONS */}
         <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center">
            <div className="mb-4 text-5xl">🚀</div>
            <h3 className="text-xl font-bold text-gold mb-2">Ready to Sell?</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">Your inventory is live and priced. You can now start managing orders or update daily rates.</p>
            <div className="flex gap-4">
                <Link to="/daily-rates" className="px-6 py-3 bg-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition">
                    Update Rates
                </Link>
                <Link to="/products" className="px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition">
                    View Inventory
                </Link>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;