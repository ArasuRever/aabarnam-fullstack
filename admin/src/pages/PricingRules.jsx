import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PricingRules = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [metalFilter, setMetalFilter] = useState('ALL');

  // Update States
  const [newWastage, setNewWastage] = useState('');
  const [newMakingCharge, setNewMakingCharge] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('FLAT');
  const [discountStart, setDiscountStart] = useState('');
  const [discountEnd, setDiscountEnd] = useState('');

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle Real-time Filtering
  useEffect(() => {
    const results = products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || p.item_type === typeFilter;
      const matchesMetal = metalFilter === 'ALL' || p.metal_type === metalFilter;
      return matchesSearch && matchesType && matchesMetal;
    });
    setFilteredProducts(results);
  }, [searchTerm, typeFilter, metalFilter, products]);

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (filteredProducts.length === 0) return alert("No products selected.");
    
    setUpdating(true);
    try {
      const productIds = filteredProducts.map(p => p.id);
      await axios.patch('http://localhost:5000/api/products/bulk-pricing', {
        ids: productIds,
        wastage_pct: newWastage || null,
        making_charge: newMakingCharge || null,
        discount_value: discountValue || null,
        discount_type: discountType,
        discount_start: discountStart || null,
        discount_end: discountEnd || null
      });

      alert("Campaign and pricing updated successfully! ✅");
      fetchProducts();
      // Reset inputs
      setNewWastage('');
      setNewMakingCharge('');
      setDiscountValue('');
      setDiscountStart('');
      setDiscountEnd('');
    } catch (err) {
      alert("Error updating items. Check console.");
    } finally {
      setUpdating(false);
    }
  };

  const handleImmediateRevoke = async () => {
    if (!window.confirm("Immediately stop all discounts for selected items?")) return;
    setUpdating(true);
    try {
      const productIds = filteredProducts.map(p => p.id);
      await axios.patch('http://localhost:5000/api/products/bulk-pricing', {
        ids: productIds,
        discount_start: '1970-01-01T00:00', // Set to past to deactivate
        discount_end: '1970-01-01T00:00'
      });
      alert("Discounts revoked successfully.");
      fetchProducts();
    } catch (err) {
      alert("Revocation failed.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500 font-bold">Loading Pricing Engine...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Global Pricing & Promotions</h1>
        <p className="text-gray-500">Search and fix wastage, making charges, or schedule automated discounts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step 1: Filter & Selection */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 text-blue-700 flex items-center">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
            Target Inventory
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input 
              type="text" 
              placeholder="Search Name or SKU..." 
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="p-2 border rounded-lg bg-gray-50" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Item Types</option>
              {[...new Set(products.map(p => p.item_type))].filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="p-2 border rounded-lg bg-gray-50" value={metalFilter} onChange={(e) => setMetalFilter(e.target.value)}>
              <option value="ALL">All Metals</option>
              <option value="22K_GOLD">22K Gold</option>
              <option value="SILVER">Silver</option>
            </select>
          </div>

          <div className="max-h-[500px] overflow-y-auto border rounded-lg">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 border-b font-bold text-gray-600">SKU / Name</th>
                  <th className="p-3 border-b font-bold text-gray-600">Current Wstg</th>
                  <th className="p-3 border-b font-bold text-gray-600">Current MC</th>
                  <th className="p-3 border-b font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 border-b">
                      <div className="font-bold text-gray-800">{p.sku}</div>
                      <div className="text-xs text-gray-500">{p.name}</div>
                    </td>
                    <td className="p-3 border-b">{p.wastage_pct}%</td>
                    <td className="p-3 border-b">₹{p.making_charge}</td>
                    <td className="p-3 border-b">
                      {p.is_discount_active ? (
                        <span className="text-red-600 font-bold animate-pulse">PROMO ACTIVE</span>
                      ) : (
                        <span className="text-gray-400">Regular</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm font-bold text-gray-600">
            Affected Items: {filteredProducts.length}
          </div>
        </div>

        {/* Step 2: Rules Config */}
        <div className="bg-gray-900 text-white p-6 rounded-xl shadow-xl h-fit sticky top-6">
          <h2 className="text-lg font-bold mb-6 text-yellow-500 flex items-center">
            <span className="bg-yellow-500 text-black w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
            Define Rules
          </h2>

          <form onSubmit={handleBulkUpdate} className="space-y-6">
            {/* Standard Pricing */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Base Charges</label>
              <div className="space-y-3">
                <input 
                  type="number" step="0.1" 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm" 
                  placeholder="Update Wastage %" 
                  value={newWastage}
                  onChange={(e) => setNewWastage(e.target.value)}
                />
                <input 
                  type="number" 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm" 
                  placeholder="Update Making Charge ₹" 
                  value={newMakingCharge}
                  onChange={(e) => setNewMakingCharge(e.target.value)}
                />
              </div>
            </div>

            {/* Campaign Scheduling */}
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50">
              <label className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-3">Automated Campaign</label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">START DATE</label>
                    <input 
                      type="datetime-local" 
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-[10px]" 
                      value={discountStart}
                      onChange={(e) => setDiscountStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">END DATE</label>
                    <input 
                      type="datetime-local" 
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-[10px]" 
                      value={discountEnd}
                      onChange={(e) => setDiscountEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded text-sm" 
                    placeholder="Discount Value" 
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                  <select 
                    className="w-24 p-2 bg-gray-700 border border-gray-600 rounded text-xs font-bold"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="FLAT">₹ FLAT</option>
                    <option value="PERCENTAGE">% PCT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                type="submit" 
                disabled={updating}
                className={`w-full py-4 rounded-lg font-bold transition-all shadow-lg ${
                  updating ? 'bg-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95'
                }`}
              >
                {updating ? 'Processing...' : `Update ${filteredProducts.length} Items`}
              </button>
              
              <button 
                type="button" 
                onClick={handleImmediateRevoke}
                disabled={updating}
                className="w-full py-2 bg-transparent border border-red-500 text-red-500 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs"
              >
                Immediate Revoke Selection
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PricingRules;