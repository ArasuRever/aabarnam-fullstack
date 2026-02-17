import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Package, LogOut, MapPin, Plus, Trash2 } from 'lucide-react';

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for adding new address
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ full_name: '', phone: '', address: '', city: '', pincode: '' });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const fetchData = async () => {
    if (user) {
      try {
        const [ordersRes, addrRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/orders/my-orders/${user.id}`),
          axios.get(`http://localhost:5000/api/auth/addresses/${user.id}`)
        ]);
        setOrders(ordersRes.data);
        setAddresses(addrRes.data);
      } catch (err) {
        console.error("Failed to load account data");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/addresses', { ...newAddress, user_id: user.id });
      setShowAddForm(false);
      fetchData(); // Refresh list
    } catch (err) { alert("Failed to add address"); }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/auth/addresses/${id}`);
      fetchData(); // Refresh list
    } catch (err) { alert("Failed to delete address"); }
  };

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-3xl text-black font-bold shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 font-mono text-sm">📱 {user.phone} • ✉️ {user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition">
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Address Book (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MapPin className="text-gold" size={20}/> Address Book</h2>
                 <button onClick={() => setShowAddForm(!showAddForm)} className="text-gold hover:text-black transition p-1"><Plus size={20}/></button>
              </div>

              {showAddForm && (
                <form onSubmit={handleAddAddress} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                   <input required onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} placeholder="Recipient Name" className="w-full p-2 text-sm border rounded" />
                   <input required onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="Phone Number" className="w-full p-2 text-sm border rounded" />
                   <textarea required onChange={e => setNewAddress({...newAddress, address: e.target.value})} placeholder="Full Address" className="w-full p-2 text-sm border rounded" rows="2"></textarea>
                   <div className="flex gap-2">
                     <input required onChange={e => setNewAddress({...newAddress, city: e.target.value})} placeholder="City" className="w-full p-2 text-sm border rounded" />
                     <input required onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} placeholder="Pincode" className="w-full p-2 text-sm border rounded" />
                   </div>
                   <button type="submit" className="w-full bg-black text-white text-xs font-bold py-2 rounded hover:bg-gray-800">Save Address</button>
                </form>
              )}

              <div className="space-y-4">
                 {addresses.length === 0 ? <p className="text-sm text-gray-400">No addresses saved.</p> : addresses.map(addr => (
                   <div key={addr.id} className="border border-gray-100 rounded-lg p-4 relative group hover:border-gold transition">
                      {addr.is_default && <span className="absolute -top-2 right-4 bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-sm">DEFAULT</span>}
                      <button onClick={() => handleDeleteAddress(addr.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 hidden group-hover:block transition"><Trash2 size={16}/></button>
                      
                      <p className="font-bold text-gray-900 text-sm">{addr.full_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{addr.address}</p>
                      <p className="text-xs text-gray-500">{addr.city} - {addr.pincode}</p>
                      <p className="text-xs font-mono text-gray-400 mt-2">Ph: {addr.phone}</p>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Order History (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <Package className="text-gold" />
                <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
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
      </div>
    </div>
  );
};

export default Account;