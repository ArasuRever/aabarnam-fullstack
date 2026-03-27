import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Mail, Phone, MapPin, Package, Heart, X } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); 

  // 🌟 NEW: States for deep CRM data
  const [customerRelations, setCustomerRelations] = useState([]);
  const [customerAddresses, setCustomerAddresses] = useState([]);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users');
      setCustomers(res.data);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const viewCustomerDetails = async (id) => {
    try {
      // 🌟 NEW: Fetching all relevant data concurrently
      const [userRes, relRes, addrRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/users/${id}`),
          axios.get(`http://localhost:5000/api/users/${id}/relations`),
          axios.get(`http://localhost:5000/api/auth/addresses/${id}`)
      ]);
      setSelectedUser(userRes.data);
      setCustomerRelations(relRes.data);
      setCustomerAddresses(addrRes.data);
    } catch (err) { alert("Failed to fetch user details"); }
  };

  if (loading) return <div className="p-8 font-bold text-gray-400">Loading Customers...</div>;

  return (
    <div className="p-4 sm:p-8 animate-fade-in relative">
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end p-0 md:p-4 backdrop-blur-sm">
           <div className="bg-white w-full md:w-[600px] h-full md:h-[95vh] md:rounded-2xl shadow-2xl overflow-y-auto animate-slide-in-right flex flex-col">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="text-gold"/> Customer Profile</h2>
                 <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
              </div>

              <div className="p-6 flex-1 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gold text-black rounded-full flex items-center justify-center text-2xl font-bold">{selectedUser.profile.name.charAt(0)}</div>
                    <div>
                       <h3 className="text-2xl font-bold text-gray-900">{selectedUser.profile.name}</h3>
                       <p className="text-gray-500 text-sm flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><Phone size={12}/> {selectedUser.profile.phone}</span>
                          <span className="flex items-center gap-1"><Mail size={12}/> {selectedUser.profile.email}</span>
                       </p>
                    </div>
                 </div>

                 <div>
                    <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><Package size={16}/> Order History ({selectedUser.orders.length})</h4>
                    {selectedUser.orders.length === 0 ? <p className="text-sm text-gray-400">No orders yet.</p> : (
                       <div className="space-y-3">
                          {selectedUser.orders.map(order => (
                             <div key={order.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col text-sm">
                                <div className="flex justify-between mb-2 pb-2 border-b border-gray-200">
                                   <div><p className="font-bold text-gray-800">Order #{order.id}</p><p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p></div>
                                   <div className="text-right"><p className="font-bold text-gray-900">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p><p className={`text-[10px] font-bold ${order.status === 'DELIVERED' ? 'text-green-600' : 'text-blue-600'}`}>{order.status}</p></div>
                                </div>
                                <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1">
                                            <span className="text-gray-600 text-xs">{item.quantity}x {item.product_name}</span>
                                            <div className="text-right flex items-center">
                                                {parseFloat(item.discount) > 0 && (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold mr-2">
                                                        AI Saved Customer: ₹{parseFloat(item.discount).toFixed(0)}
                                                    </span>
                                                )}
                                                <span className="font-medium text-xs">₹{item.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>

                 <div>
                    <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><Heart size={16} className="text-red-500"/> Saved Items ({selectedUser.wishlist.length})</h4>
                    {selectedUser.wishlist.length === 0 ? <p className="text-sm text-gray-400">Wishlist is empty.</p> : (
                       <div className="grid grid-cols-2 gap-3">
                          {selectedUser.wishlist.map(item => (
                             <div key={item.id} className="bg-white border border-gray-200 p-3 rounded-lg text-sm">
                                <p className="font-bold text-gray-800 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>

                 {/* 🌟 NEW: CRM DATA - FAMILY VAULT */}
                 <div>
                    <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <Users size={16} className="text-gold" /> Family Vault (Relations)
                    </h4>
                    {customerRelations.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No family members added yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {customerRelations.map(rel => (
                                <div key={rel.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <p className="font-bold text-sm text-gray-800">{rel.name} <span className="bg-white border text-[10px] px-1.5 py-0.5 rounded ml-1 text-gray-500">{rel.relationship}</span></p>
                                    <p className="text-xs text-gray-600 mt-1">DOB: {rel.dob ? new Date(rel.dob).toLocaleDateString() : 'Unknown'}</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Sizes: Ring {rel.ring_size || '-'} | Bangle {rel.bangle_size || '-'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>

                 {/* 🌟 NEW: CRM DATA - ADDRESSES */}
                 <div className="pb-6">
                    <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <MapPin size={16} className="text-gold" /> Saved Addresses
                    </h4>
                    {customerAddresses.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No addresses saved.</p>
                    ) : (
                        <div className="space-y-3">
                            {customerAddresses.map(addr => (
                                <div key={addr.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700 relative">
                                    {addr.is_default && <span className="absolute top-3 right-3 text-[10px] bg-gold px-2 py-0.5 rounded font-bold text-black">DEFAULT</span>}
                                    <p className="font-bold text-gray-900 mb-1">{addr.full_name} <span className="text-gray-500 font-normal ml-1">({addr.phone})</span></p>
                                    <p>{addr.address}</p>
                                    <p>{addr.city} - {addr.pincode}</p>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>

              </div>
           </div>
        </div>
      )}

      <div className="mb-8"><h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900"><Users className="text-gold" /> Customer Directory</h1></div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600 text-sm">Customer</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Contact</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Joined</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="p-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gold/20 text-gold-dark rounded-full flex items-center justify-center font-bold text-xs">{user.name.charAt(0)}</div>
                      <span className="font-bold text-gray-900">{user.name}</span>
                   </div>
                </td>
                <td className="p-4">
                   <p className="text-sm text-gray-800 font-medium">{user.phone}</p><p className="text-xs text-gray-500">{user.email}</p>
                </td>
                <td className="p-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                   <button onClick={() => viewCustomerDetails(user.id)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;