import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Package, LogOut, MapPin } from 'lucide-react';

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // If not logged in, kick them to auth page
  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      const fetchMyOrders = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/orders/my-orders/${user.id}`);
          setOrders(res.data);
          setLoading(false);
        } catch (err) {
          console.error("Failed to load orders");
          setLoading(false);
        }
      };
      fetchMyOrders();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-3xl text-black font-bold shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 font-mono text-sm">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition">
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
             <Package className="text-gold" />
             <h2 className="text-xl font-bold text-gray-900">My Order History</h2>
          </div>

          {loading ? (
             <div className="p-12 text-center text-gray-400">Loading your treasures...</div>
          ) : orders.length === 0 ? (
             <div className="p-12 text-center">
                <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                <button onClick={() => navigate('/')} className="text-gold font-bold hover:underline">Start Shopping</button>
             </div>
          ) : (
             <div className="divide-y divide-gray-100">
               {orders.map(order => (
                 <div key={order.id} className="p-6 hover:bg-gray-50 transition">
                   <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                     <div>
                       <p className="font-mono text-xs text-gray-400 mb-1">Order #{order.id} • {new Date(order.created_at).toLocaleDateString()}</p>
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                       }`}>
                         {order.status}
                       </span>
                     </div>
                     <div className="text-right">
                       <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                       <p className="font-bold text-xl text-gray-900">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                     </div>
                   </div>

                   <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Items Purchased</h4>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                          <span className="font-medium text-gray-800">{item.quantity}x {item.product_name}</span>
                          <span className="text-gray-500">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Account;