import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCcw, PackageX, CheckCircle, AlertCircle } from 'lucide-react';

const Reshelf = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingItems = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/inventory/reshelf');
      setItems(res.data);
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  useEffect(() => { fetchPendingItems(); }, []);

  const actionReshelf = async (itemId, actionType) => {
    try {
        await axios.put(`http://localhost:5000/api/orders/inventory/reshelf/${itemId}`, { action: actionType });
        fetchPendingItems(); // Refresh list
    } catch (err) { alert("Failed to apply action"); }
  };

  if (loading) return <div className="p-8 text-gray-500 font-bold">Checking Warehouse Queue...</div>;

  return (
    <div className="p-4 sm:p-8 animate-fade-in relative pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><RefreshCcw className="text-gold" /> Reshelving Queue</h1>
        <p className="text-gray-500 text-sm mt-1">Review items from cancelled or returned orders before returning them to live inventory.</p>
      </div>

      {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
              <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
              <p className="text-gray-500 font-bold">Queue is empty. All inventory is accounted for!</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="p-4 flex gap-4 border-b border-gray-100 bg-gray-50">
                          <img src={item.main_image_url || 'https://via.placeholder.com/100'} className="w-16 h-16 rounded object-cover border" alt="product"/>
                          <div>
                              <p className="font-bold text-gray-900 text-sm">{item.product_name}</p>
                              <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                              <p className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1 inline-block uppercase">From: {item.order_status}</p>
                          </div>
                      </div>
                      <div className="p-4 bg-white flex-1">
                          <p className="text-xs text-gray-500 mb-1">Customer: <span className="font-bold text-gray-800">{item.customer_name}</span></p>
                          <p className="text-xs text-gray-500">Order ID: <span className="font-mono">#{item.order_id}</span></p>
                      </div>
                      <div className="flex border-t border-gray-100">
                          <button onClick={() => actionReshelf(item.id, 'HOLD')} className="flex-1 py-3 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition flex justify-center items-center gap-1"><AlertCircle size={14}/> Do Not List</button>
                          <button onClick={() => actionReshelf(item.id, 'RESTOCK')} className="flex-1 py-3 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 transition flex justify-center items-center gap-1 border-l border-gray-100"><RefreshCcw size={14}/> Restock Inventory</button>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default Reshelf;