import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders');
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${id}/status`, { status: newStatus });
      fetchOrders(); // Refresh list after update
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-8">Loading orders...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="text-gold" /> Orders Management
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600 text-sm">Order ID</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Date</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Customer</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Total</th>
              <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-sm"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No orders yet.</td></tr>
            ) : orders.map((order) => (
              <React.Fragment key={order.id}>
                {/* Main Row */}
                <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <td className="p-4 font-mono text-sm font-bold">#{order.id}</td>
                  <td className="p-4 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                     <p className="font-bold text-sm">{order.customer_name}</p>
                     <p className="text-xs text-gray-500">{order.phone_number}</p>
                  </td>
                  <td className="p-4 font-bold text-gray-900">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onClick={(e) => e.stopPropagation()} // Prevent row click
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border-none cursor-pointer outline-none ${getStatusColor(order.status)}`}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-400">
                     {expandedId === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </td>
                </tr>

                {/* Expanded Details Row */}
                {expandedId === order.id && (
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <td colSpan="6" className="p-6">
                      <div className="grid grid-cols-2 gap-8">
                        {/* Shipping Info */}
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> Shipping Address</h4>
                          <div className="bg-white p-4 rounded border text-sm text-gray-600">
                            <p className="font-bold text-black">{order.customer_name}</p>
                            <p>{order.address}</p>
                            <p>{order.city} - {order.pincode}</p>
                            <p className="mt-2 text-xs font-mono">Phone: {order.phone_number}</p>
                          </div>
                        </div>
                        {/* Items Info */}
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><Package size={16} className="text-gray-400" /> Purchased Items</h4>
                          <div className="bg-white rounded border overflow-hidden">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 text-sm">
                                <div>
                                  <p className="font-bold text-gray-800">{item.product_name}</p>
                                  <p className="text-xs text-gray-500">{item.metal_type?.replace('_', ' ')} • Qty: {item.quantity}</p>
                                </div>
                                <span className="font-bold text-gray-900">₹{parseFloat(item.price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;