import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { TrendingUp, Package, IndianRupee, Eye } from 'lucide-react';

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

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Loading Command Center...</div>;

  const { overview, category_breakdown, recent_orders } = stats;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time store analytics and live inventory valuation.</p>
        </div>
        <div className="text-left md:text-right bg-gray-50 p-4 rounded-xl border border-gray-100">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
             <TrendingUp size={12} className="text-green-500" /> Total Inventory Value
           </p>
           <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
             {formatCurrency(overview.total_valuation)}
           </h2>
        </div>
      </div>

      {/* ROW 1: SALES & CORE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <IndianRupee size={64} className="text-green-600" />
            </div>
            <h3 className="text-green-800 font-bold text-sm uppercase tracking-wider mb-2">Total Sales Revenue</h3>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
               {formatCurrency(overview.total_revenue)}
            </div>
            <p className="text-xs text-green-600 font-medium mt-4 bg-green-100 inline-block px-2 py-1 rounded">Lifetime Earnings</p>
        </div>

        {/* Orders Card */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Package size={64} className="text-blue-600" />
            </div>
            <h3 className="text-blue-800 font-bold text-sm uppercase tracking-wider mb-2">Total Orders Placed</h3>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
               {overview.total_orders}
            </div>
            <Link to="/orders" className="text-xs font-bold text-blue-600 mt-4 hover:underline flex items-center gap-1">Manage Orders →</Link>
        </div>

        {/* SKU Card */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <span className="text-6xl">💎</span>
            </div>
            <h3 className="text-purple-800 font-bold text-sm uppercase tracking-wider mb-2">Total Unique SKUs</h3>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
               {overview.total_items}
            </div>
            <Link to="/products" className="text-xs font-bold text-purple-600 mt-4 hover:underline flex items-center gap-1">View Inventory →</Link>
        </div>

      </div>

      {/* ROW 2: INVENTORY RESERVES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Physical Gold Reserves</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-800">{overview.total_gold_weight_g}</span>
                    <span className="text-sm text-gray-500 font-medium">grams (22K & 24K)</span>
                </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-xl shadow-inner">🏆</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Physical Silver Reserves</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-800">{overview.total_silver_weight_g}</span>
                    <span className="text-sm text-gray-500 font-medium">grams (92.5)</span>
                </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xl shadow-inner">⚪</div>
        </div>
      </div>

      {/* ROW 3: TRANSACTIONS & CATEGORIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Recent Orders (Takes 2/3 width) */}
         <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Recent Transactions</h3>
              <Link to="/orders" className="text-xs font-bold text-gold hover:underline">View All</Link>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Customer</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {recent_orders.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No orders placed yet.</td></tr>
                ) : (
                  recent_orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-mono font-bold text-gray-600">#{order.id}</td>
                      <td className="p-4 font-medium text-gray-900">{order.customer_name}</td>
                      <td className="p-4 font-bold text-gray-900">{formatCurrency(order.total_amount)}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         </div>

         {/* Category Breakdown (Takes 1/3 width) */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">Inventory by Category</h3>
            <div className="space-y-5">
                {category_breakdown.length === 0 ? <p className="text-sm text-gray-400">No products added yet.</p> : null}
                {category_breakdown.map((cat) => (
                    <div key={cat.item_type}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-gray-600">{cat.item_type || 'Uncategorized'}</span>
                            <span className="font-bold text-gray-900">{cat.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gold rounded-full" 
                                style={{ width: `${(cat.count / overview.total_items) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
         </div>

      </div>
    </div>
  );
};

export default Dashboard;