import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, LogOut, MapPin, Plus, Trash2, Heart, Edit2, X, 
  Ruler, Calendar, ShieldCheck, Save, Users, Gift, Bot, Timer
} from 'lucide-react';
import toast from 'react-hot-toast';
import OTPModal from '../components/OTPModal';

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [activeDeals, setActiveDeals] = useState([]); // 🌟 NEW: Deal Locker State
  const [loading, setLoading] = useState(true);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');
  const [vaultForm, setVaultForm] = useState({
    name: user?.name || '', gender: user?.gender || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    ring_size: user?.ring_size || '', bangle_size: user?.bangle_size || '',
    secondary_phone: user?.secondary_phone || ''
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addressForm, setAddressForm] = useState({ full_name: '', phone: '', address: '', city: '', pincode: '' });

  const [showRelationForm, setShowRelationForm] = useState(false);
  const [editingRelationId, setEditingRelationId] = useState(null);
  const [relationForm, setRelationForm] = useState({ name: '', relationship: '', gender: '', dob: '', ring_size: '', bangle_size: '' });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const fetchData = async () => {
    if (user?.id) {
      try {
        const [ordersRes, addrRes, relRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/orders/my-orders/${user.id}`),
          axios.get(`http://localhost:5000/api/auth/addresses/${user.id}`),
          axios.get(`http://localhost:5000/api/users/${user.id}/relations`) 
        ]);
        setOrders(ordersRes.data || []);
        setAddresses(addrRes.data || []);
        setRelations(relRes.data || []);

        // 🌟 Fetch Active Deals (Graceful fallback if endpoint doesn't exist yet)
        try {
           const dealsRes = await axios.get(`http://localhost:5000/api/bargain/user/${user.id}`);
           setActiveDeals(dealsRes.data || []);
        } catch (e) {
           console.log("Deal locker endpoint not ready, skipping...");
           setActiveDeals([]);
        }

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

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSaveVault = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/users/profile/${user.id}`, vaultForm);
      toast.success("Jewelry Vault updated! ✨");
      setIsEditingProfile(false);
    } catch (err) { toast.error("Failed to update vault details"); }
  };

  // Address Handlers
  const openAddForm = () => { setEditingId(null); setAddressForm({ full_name: '', phone: '', address: '', city: '', pincode: '' }); setShowAddForm(true); };
  const openEditForm = (addr) => { setShowAddForm(false); setEditingId(addr.id); setAddressForm({ full_name: addr.full_name, phone: addr.phone, address: addr.address, city: addr.city, pincode: addr.pincode }); };
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/auth/addresses/${editingId}`, addressForm);
        toast.success("Address updated!");
      } else {
        await axios.post('http://localhost:5000/api/auth/addresses', { ...addressForm, user_id: user.id });
        toast.success("New address added!");
      }
      setShowAddForm(false); setEditingId(null); fetchData(); 
    } catch (err) { toast.error("Failed to save address"); }
  };
  const handleDeleteAddress = async (id) => {
    if(window.confirm("Delete this address?")) {
        try { await axios.delete(`http://localhost:5000/api/auth/addresses/${id}`); toast.success("Address removed"); fetchData(); } 
        catch (err) { toast.error("Failed to delete address"); }
    }
  };

  // Relation Handlers
  const openAddRelationForm = () => { setEditingRelationId(null); setRelationForm({ name: '', relationship: '', gender: '', dob: '', ring_size: '', bangle_size: '' }); setShowRelationForm(true); };
  const openEditRelationForm = (rel) => { setShowRelationForm(false); setEditingRelationId(rel.id); setRelationForm({ name: rel.name, relationship: rel.relationship, gender: rel.gender, dob: rel.dob ? new Date(rel.dob).toISOString().split('T')[0] : '', ring_size: rel.ring_size || '', bangle_size: rel.bangle_size || '' }); };
  
  const handleSaveRelation = async (e) => {
    e.preventDefault();
    try {
      if (editingRelationId) {
        await axios.put(`http://localhost:5000/api/users/relations/${editingRelationId}`, relationForm);
      } else {
        await axios.post(`http://localhost:5000/api/users/${user.id}/relations`, relationForm);
      }
      setShowRelationForm(false); setEditingRelationId(null); fetchData(); toast.success("Family Vault Updated!");
    } catch (err) { toast.error("Failed to save"); }
  };
  const handleDeleteRelation = async (id) => {
    if(window.confirm("Remove this person?")) {
        try { await axios.delete(`http://localhost:5000/api/users/relations/${id}`); fetchData(); } catch (err) {}
    }
  };

  // OTP Handlers
  const triggerOTP = async (target) => {
    setOtpTarget(target);
    try {
      await axios.post('http://localhost:5000/api/otp/send', { userId: user.id, target });
      setShowOTP(true); toast.success("Security code sent!");
    } catch (err) { toast.error("Failed to send code"); }
  };
  const handleVerifyOTP = async (code) => {
    try {
      const res = await axios.post('http://localhost:5000/api/otp/verify', { userId: user.id, otpCode: code });
      if (res.data.success) { setShowOTP(false); toast.success("Verified!"); }
    } catch (err) { toast.error("Invalid Code."); }
  };

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 animate-fade-in">
      <OTPModal isOpen={showOTP} onClose={() => setShowOTP(false)} targetValue={otpTarget} onVerify={handleVerifyOTP} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* PROFILE HEADER */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center text-4xl text-black font-bold shadow-md border-4 border-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-serif font-bold text-gray-900">{user?.name}</h1>
                <ShieldCheck size={20} className="text-blue-500" />
              </div>
              <p className="text-gray-500 font-mono text-sm mt-1 flex items-center gap-3">
                <span>📱 {user?.phone} <button onClick={() => triggerOTP(user?.phone)} className="text-blue-500 text-xs hover:underline ml-1">Edit</button></span> 
                • 
                <span>✉️ {user?.email} <button onClick={() => triggerOTP(user?.email)} className="text-blue-500 text-xs hover:underline ml-1">Edit</button></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/wishlist" className="flex items-center gap-2 text-gray-600 font-bold hover:bg-gray-100 px-4 py-2.5 rounded-lg transition border border-gray-200">
                <Heart size={18} className="text-red-500" /> Wishlist
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-lg transition">
                <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: VAULTS & ADDRESSES */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* MY JEWELRY VAULT */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Ruler className="text-gold" size={20}/> My Sizes</h2>
                 <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-xs font-bold text-gold hover:underline">
                   {isEditingProfile ? 'Cancel' : 'Edit Sizes'}
                 </button>
              </div>

              <form onSubmit={handleSaveVault} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Gender</label>
                    <select disabled={!isEditingProfile} value={vaultForm.gender} onChange={e => setVaultForm({...vaultForm, gender: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-sm outline-none focus:border-gold">
                      <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Birthday</label>
                    <input type="date" disabled={!isEditingProfile} value={vaultForm.dob} onChange={e => setVaultForm({...vaultForm, dob: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-sm outline-none focus:border-gold"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ring Size</label>
                    <input disabled={!isEditingProfile} value={vaultForm.ring_size} onChange={e => setVaultForm({...vaultForm, ring_size: e.target.value})} placeholder="e.g. 12" className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-sm outline-none focus:border-gold"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Bangle Size</label>
                    <input disabled={!isEditingProfile} value={vaultForm.bangle_size} onChange={e => setVaultForm({...vaultForm, bangle_size: e.target.value})} placeholder="e.g. 2.4" className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-sm outline-none focus:border-gold"/>
                  </div>
                </div>
                {isEditingProfile && (<button type="submit" className="w-full bg-black text-gold text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition"><Save size={14}/> Save Updates</button>)}
              </form>
            </div>

            {/* FAMILY & GIFTING VAULT */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Users className="text-gold" size={20}/> Family Vault</h2>
                 {!showRelationForm && !editingRelationId && (
                     <button onClick={openAddRelationForm} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"><Plus size={16}/> Add</button>
                 )}
              </div>

              {(showRelationForm || editingRelationId) && (
                <form onSubmit={handleSaveRelation} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 relative">
                   <button type="button" onClick={() => {setShowRelationForm(false); setEditingRelationId(null);}} className="absolute top-2 right-2 text-gray-400 hover:text-black"><X size={18}/></button>
                   <div className="grid grid-cols-2 gap-2">
                     <input required value={relationForm.name} onChange={e => setRelationForm({...relationForm, name: e.target.value})} placeholder="Name" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                     <input required value={relationForm.relationship} onChange={e => setRelationForm({...relationForm, relationship: e.target.value})} placeholder="Relation" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <select required value={relationForm.gender} onChange={e => setRelationForm({...relationForm, gender: e.target.value})} className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold">
                        <option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option>
                     </select>
                     <input type="date" value={relationForm.dob} onChange={e => setRelationForm({...relationForm, dob: e.target.value})} className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <input value={relationForm.ring_size} onChange={e => setRelationForm({...relationForm, ring_size: e.target.value})} placeholder="Ring Size" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                     <input value={relationForm.bangle_size} onChange={e => setRelationForm({...relationForm, bangle_size: e.target.value})} placeholder="Bangle Size" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   </div>
                   <button type="submit" className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-gray-800 transition">Save Details</button>
                </form>
              )}

              <div className="space-y-4">
                {relations.map(rel => (
                  <div key={rel.id} className="border border-gray-100 rounded-xl p-4 relative group hover:border-gold transition bg-white shadow-sm overflow-hidden">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                          <button onClick={() => openEditRelationForm(rel)} className="text-gray-400 hover:text-blue-500 bg-white p-1 rounded-full"><Edit2 size={14}/></button>
                          <button onClick={() => handleDeleteRelation(rel.id)} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-full"><Trash2 size={14}/></button>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">{rel.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{rel.name} <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-1">{rel.relationship}</span></p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Ring: {rel.ring_size || 'N/A'} | Bangle: {rel.bangle_size || 'N/A'}</p>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/collections/all?for=${rel.name}&gender=${rel.gender}&ring=${rel.ring_size}`)} className="w-full bg-gold/10 text-gold-dark font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gold hover:text-black transition">
                        <Gift size={14} /> Shop for {rel.name}
                      </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SAVED ADDRESSES */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MapPin className="text-gold" size={20}/> Saved Addresses</h2>
                 {!showAddForm && !editingId && (<button onClick={openAddForm} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"><Plus size={16}/></button>)}
              </div>
              {(showAddForm || editingId) && (
                <form onSubmit={handleSaveAddress} className="mb-6 bg-gray-50 p-4 rounded-xl space-y-3 relative">
                   <button type="button" onClick={() => {setShowAddForm(false); setEditingId(null);}} className="absolute top-2 right-2 text-gray-400"><X size={18}/></button>
                   <input required value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} placeholder="Name" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   <input required value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} placeholder="Phone" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   <textarea required value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})} placeholder="Address" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" rows="2"></textarea>
                   <div className="flex gap-2">
                     <input required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} placeholder="City" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                     <input required value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} placeholder="Pincode" className="w-full p-2.5 text-sm border rounded outline-none focus:border-gold" />
                   </div>
                   <button type="submit" className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-gray-800 transition">Save Address</button>
                </form>
              )}
              <div className="space-y-4">
                {addresses.map(addr => (
                  <div key={addr.id} className="border border-gray-100 rounded-xl p-4 relative group hover:border-gold transition">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEditForm(addr)} className="text-gray-400 hover:text-blue-500"><Edit2 size={14}/></button>
                          <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{addr.full_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{addr.address}</p>
                      <p className="text-xs text-gray-500">{addr.city} - {addr.pincode}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DEAL LOCKER & ORDER HISTORY */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 🌟 NEW: AURA DEAL LOCKER */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-lg border border-gray-800 overflow-hidden text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
              
              <div className="p-6 border-b border-gray-800 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <Bot className="text-gold" size={24}/>
                    <h2 className="text-xl font-bold font-serif flex items-center gap-2">Aura Deal Locker</h2>
                </div>
                <span className="bg-gold/20 text-gold text-xs font-bold px-3 py-1 rounded-full border border-gold/30">Active Bargains</span>
              </div>

              <div className="p-6 relative z-10">
                {activeDeals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm mb-4">You have no active negotiated prices.</p>
                    <Link to="/collections/all" className="text-gold text-sm font-bold hover:underline">Start bargaining with Aura →</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeDeals.map((deal, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center backdrop-blur-sm hover:border-gold/50 transition">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                               <Gift className="text-gold" />
                            </div>
                            <div>
                               <p className="font-bold text-gray-100">{deal.product_name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs text-gray-400 line-through">₹{deal.original_price}</span>
                                 <span className="text-sm font-bold text-gold">₹{deal.negotiated_price}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right flex flex-col items-end gap-2">
                            <span className="text-[10px] text-gray-400 flex items-center gap-1"><Timer size={10}/> Expires in {deal.expires_in}</span>
                            <button onClick={() => navigate(`/product/${deal.product_id}`)} className="bg-gold text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-white transition">Claim Deal</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ORDER HISTORY */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3"><Package className="text-gold" /><h2 className="text-xl font-bold text-gray-900">Purchase History</h2></div>
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
              ) : orders.map(order => (
                <div key={order.id} className="p-6 border-b last:border-0 hover:bg-gray-50/50 transition">
                  <div className="flex flex-col md:flex-row justify-between md:items-start mb-5 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-gray-900">Order #{order.id}</p>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-gray-900 tracking-tight">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-800">{item.quantity}x {item.product_name}</span>
                          <span className="text-gray-500 font-medium">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Account;