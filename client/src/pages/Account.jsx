import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Package, LogOut, MapPin, Plus, Trash2, Heart, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Add/Edit Address
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // Tracks which address is being edited
  const [addressForm, setAddressForm] = useState({ full_name: '', phone: '', address: '', city: '', pincode: '' });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const fetchData = async () => {
    if (user && user.id) {
      try {
        const [ordersRes, addrRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/orders/my-orders/${user.id}`),
          axios.get(`http://localhost:5000/api/auth/addresses/${user.id}`)
        ]);
        setOrders(ordersRes.data || []);
        setAddresses(addrRes.data || []);
      } catch (err) {
        console.error("Failed to load account data");
      } finally {
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Prepare form for Adding
  const openAddForm = () => {
    setEditingId(null);
    setAddressForm({ full_name: '', phone: '', address: '', city: '', pincode: '' });
    setShowAddForm(true);
  };

  // Prepare form for Editing
  const openEditForm = (addr) => {
    setShowAddForm(false);
    setEditingId(addr.id);
    setAddressForm({ 
        full_name: addr.full_name, phone: addr.phone, 
        address: addr.address, city: addr.city, pincode: addr.pincode 
    });
  };

  // Handle Save (Both Add & Edit)
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Edit existing
        await axios.put(`http://localhost:5000/api/auth/addresses/${editingId}`, addressForm);
        toast.success("Address updated successfully!");
      } else {
        // Add new
        await axios.post('http://localhost:5000/api/auth/addresses', { ...addressForm, user_id: user.id });
        toast.success("New address added!");
      }
      setShowAddForm(false);
      setEditingId(null);
      fetchData(); 
    } catch (err) { 
        toast.error("Failed to save address"); 
    }
  };

  const handleDeleteAddress = async (id) => {
    if(window.confirm("Are you sure you want to delete this address?")) {
        try {
        await axios.delete(`http://localhost:5000/api/auth/addresses/${id}`);
        toast.success("Address removed");
        fetchData(); 
        } catch (err) { toast.error("Failed to delete address"); }
    }
  };

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* PROFILE HEADER */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-3xl text-black font-bold shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User size={30} />}
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">{user?.name || 'Valued Customer'}</h1>
              <p className="text-gray-500 font-mono text-sm mt-1">
                📱 {user?.phone || 'No Phone Number'} • ✉️ {user?.email || 'No Email'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* NEW: View Wishlist Button */}
            <Link to="/wishlist" className="flex items-center gap-2 text-gray-600 font-bold hover:bg-gray-100 px-4 py-2.5 rounded-lg transition border border-gray-200">
                <Heart size={18} className="text-red-500" /> Wishlist
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-lg transition">
                <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: ADDRESS BOOK */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MapPin className="text-gold" size={20}/> Saved Addresses</h2>
                 {!showAddForm && !editingId && (
                     <button onClick={openAddForm} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center gap-1">
                         <Plus size={16}/> Add New
                     </button>
                 )}
              </div>

              {/* Add/Edit Form Overlay */}
              {(showAddForm || editingId) && (
                <form onSubmit={handleSaveAddress} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-fade-in-up relative">
                   <button type="button" onClick={() => {setShowAddForm(false); setEditingId(null);}} className="absolute top-2 right-2 text-gray-400 hover:text-black"><X size={18}/></button>
                   <h3 className="font-bold text-sm text-gray-800 mb-2">{editingId ? 'Edit Address' : 'New Address'}</h3>
                   
                   <input required value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} placeholder="Recipient Name" className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gold outline-none" />
                   <input required value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} placeholder="Phone Number" className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gold outline-none" />
                   <textarea required value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})} placeholder="Full Address (Door No, Street)" className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gold outline-none" rows="2"></textarea>
                   <div className="flex gap-2">
                     <input required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} placeholder="City" className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gold outline-none" />
                     <input required value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} placeholder="Pincode" className="w-full p-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gold outline-none" />
                   </div>
                   <button type="submit" className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-gray-800 transition">
                       {editingId ? 'Update Address' : 'Save Address'}
                   </button>
                </form>
              )}

              {/* Address List */}
              {!showAddForm && !editingId && (
                  <div className="space-y-4">
                    {addresses.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No addresses saved yet.</p> : addresses.map(addr => (
                    <div key={addr.id} className="border border-gray-100 rounded-xl p-4 relative group hover:border-gold transition hover:shadow-sm bg-white">
                        {addr.is_default && <span className="absolute -top-2 left-4 bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm">DEFAULT</span>}
                        
                        {/* Edit & Delete Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEditForm(addr)} className="text-gray-400 hover:text-blue-500 bg-gray-50 p-1.5 rounded-md"><Edit2 size={14}/></button>
                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-500 bg-gray-50 p-1.5 rounded-md"><Trash2 size={14}/></button>
                        </div>
                        
                        <p className="font-bold text-gray-900 text-sm pr-16">{addr.full_name}</p>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{addr.address}</p>
                        <p className="text-xs text-gray-500 font-medium">{addr.city} - {addr.pincode}</p>
                        <p className="text-xs font-mono text-gray-600 mt-2 bg-gray-50 inline-block px-2 py-1 rounded">📞 {addr.phone}</p>
                    </div>
                    ))}
                  </div>
              )}
            </div>
          </div>

          {/* RIGHT: ORDER HISTORY */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="text-gold" />
                    <h2 className="text-xl font-bold text-gray-900">Purchase History</h2>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{orders.length} Orders</span>
              </div>

              {loading ? (
                <div className="p-16 flex justify-center"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div></div>
              ) : orders.length === 0 ? (
                <div className="p-16 text-center">
                    <Package size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6 text-lg">You haven't placed any orders yet.</p>
                    <Link to="/collections/all" className="bg-black text-gold px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition">Start Exploring</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <div key={order.id} className="p-6 hover:bg-gray-50/50 transition">
                      
                      <div className="flex flex-col md:flex-row justify-between md:items-start mb-5 gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                              <p className="font-bold text-gray-900">Order #{order.id}</p>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${
                                  order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                  order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border border-green-200' : 
                                  'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {order.status}
                              </span>
                          </div>
                          <p className="text-xs text-gray-500">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Total Amount</p>
                          <p className="font-bold text-2xl text-gray-900 tracking-tight">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b pb-2">Items in this order</h4>
                          <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm group">
                                  <div className="flex items-center gap-3">
                                      <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold">{item.quantity}x</span>
                                      <span className="font-medium text-gray-800 group-hover:text-gold transition cursor-default">{item.product_name}</span>
                                  </div>
                                  <span className="text-gray-500 font-medium">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                          </div>
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