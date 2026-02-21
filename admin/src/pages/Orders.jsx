import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Truck, CheckCircle, Clock, Search, MapPin, Phone, Banknote, XCircle } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin Cancellation Modal States
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders", error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // Intercepts the status change to ask for a reason if cancelling/returning
  const handleStatusChange = (orderId, newStatus) => {
    if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
        setCancelModalOrder({ id: orderId, status: newStatus });
    } else {
        updateOrderStatus(orderId, newStatus, null, null);
    }
  };

  const updateOrderStatus = async (id, status, cancel_reason, cancelled_by) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${id}/status`, { 
          status, cancel_reason, cancelled_by 
      });
      fetchOrders();
      setCancelModalOrder(null);
      setCancelReason('');
    } catch (error) { alert('Failed to update status'); }
  };

  const updatePaymentStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${id}/payment`, { payment_status: newStatus });
      fetchOrders();
    } catch (error) { alert('Failed to update payment status'); }
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.id.toString().includes(searchTerm) ||
    order.phone_number.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-gray-500 font-bold">Loading Orders...</div>;

  return (
    <div className="p-4 sm:p-8 animate-fade-in relative pb-20">
      
      {/* CANCELLATION REASON MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2">
                    <XCircle className="text-red-500"/> Confirm {cancelModalOrder.status === 'RETURNED' ? 'Return' : 'Cancellation'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">Please provide a reason. This will be shown to the customer and the items will be sent to the Reshelving Queue.</p>
                <textarea 
                    value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g., Out of stock, Address unreachable..."
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 mb-4" rows="3"
                ></textarea>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setCancelModalOrder(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Abort</button>
                    <button onClick={() => updateOrderStatus(cancelModalOrder.id, cancelModalOrder.status, cancelReason, 'ADMIN')} className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md">Confirm</button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="text-gold" /> Order Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">Track fulfillment and payment verification.</p>
        </div>
        <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
                type="text" placeholder="Search ID, Name, Phone..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none bg-white shadow-sm"
            />
        </div>
      </div>

      <div className="space-y-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             
             {/* HEADER */}
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Order ID</span>
                    <p className="text-lg font-black text-gray-900">#{order.id}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Value</span>
                    <p className="text-xl font-black text-gold-dark">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</p>
                </div>
             </div>

             {/* BODY */}
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* 1. Customer Details */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Info</h4>
                    <p className="font-bold text-gray-800 text-sm">{order.customer_name}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {order.phone_number}</p>
                    <p className="text-sm text-gray-600 flex items-start gap-2 mt-2">
                        <MapPin size={16} className="mt-0.5 text-gray-400 flex-shrink-0" /> 
                        <span>{order.address}<br/>{order.city} - {order.pincode}</span>
                    </p>
                </div>

                {/* 2. Payment Info */}
                <div className="space-y-4 md:border-l md:border-r border-gray-100 md:px-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Banknote size={14}/> Payment Details</h4>
                    
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Mode of Payment</p>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded text-xs font-bold">
                            {order.payment_method === 'CASH_ON_DELIVERY' ? 'COD (Cash on Delivery)' : 'Digital Payment'}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 mb-1">Payment Confirmation</p>
                        <select 
                            value={order.payment_status || 'PENDING'} 
                            onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                            className={`text-sm font-bold p-2 border rounded-lg w-full outline-none transition shadow-inner ${
                                order.payment_status === 'PAID' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-orange-50 border-orange-300 text-orange-800'
                            }`}
                        >
                            <option value="PENDING">⚠️ Payment Pending</option>
                            <option value="PAID">✅ Payment Verified & Paid</option>
                        </select>
                    </div>
                </div>

                {/* 3. Delivery Status */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Truck size={14}/> Fulfillment Status</h4>
                    
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Order Status</p>
                        <select 
                            value={order.status} 
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-gold outline-none shadow-sm"
                        >
                            <option value="PENDING">Processing / Pending</option>
                            <option value="SHIPPED">Out for Delivery</option>
                            <option value="DELIVERED">Successfully Delivered</option>
                            <option value="RETURNED">Returned</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Dynamic Status Badges & Reason Display */}
                    <div className="flex flex-col gap-2 pt-2">
                        {order.status === 'DELIVERED' && <span className="flex w-fit items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded"><CheckCircle size={12}/> Delivered</span>}
                        {order.status === 'SHIPPED' && <span className="flex w-fit items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"><Truck size={12}/> Shipped</span>}
                        {order.status === 'PENDING' && <span className="flex w-fit items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded"><Clock size={12}/> Processing</span>}
                        
                        {(order.status === 'CANCELLED' || order.status === 'RETURNED') && (
                            <div className="bg-red-50 text-red-700 p-2 rounded text-xs border border-red-100 mt-1">
                                <strong>{order.status} by {order.cancelled_by === 'USER' ? 'Customer' : 'Admin'}</strong><br/>
                                Reason: {order.cancel_reason || 'No reason provided.'}
                            </div>
                        )}
                    </div>
                </div>

             </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">No orders found.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Orders;