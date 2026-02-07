import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DailyRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch Rates
  const fetchRates = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/rates');
      setRates(response.data);
      if (response.data.length > 0) {
        setLastUpdated(response.data[0].updated_at);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rates:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRateChange = (metalType, newRate) => {
    setRates(rates.map(rate => 
      rate.metal_type === metalType ? { ...rate, rate_per_gram: newRate } : rate
    ));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('http://localhost:5000/api/rates', { rates });
      alert('Market Rates Updated! All inventory prices have been adjusted. 📈');
      fetchRates(); // Refresh to calculate new trends
    } catch (error) {
      alert('Failed to update rates.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to render trend badge
  const renderTrend = (current, previous) => {
    const diff = current - previous;
    if (diff > 0) return <span className="text-green-500 text-xs font-bold flex items-center">▲ +₹{diff.toFixed(2)}</span>;
    if (diff < 0) return <span className="text-red-500 text-xs font-bold flex items-center">▼ -₹{Math.abs(diff).toFixed(2)}</span>;
    return <span className="text-gray-400 text-xs font-bold flex items-center">- No Change</span>;
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Connecting to Market...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Daily Market Rates</h1>
        <p className="text-gray-500">Set today's gold and silver prices. Updates reflect instantly across the platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* CONTROL PANEL */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Set Today's Rates</h2>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                Last Update: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'N/A'}
              </span>
           </div>

           <form onSubmit={handleSave} className="space-y-6">
              {rates.map((rate) => (
                <div key={rate.metal_type} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{rate.metal_type.replace('_', ' ')}</span>
                        <div className="mt-1">{renderTrend(rate.rate_per_gram, rate.previous_rate)}</div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xl font-bold text-gray-400 mr-2">₹</span>
                        <input
                            type="number"
                            step="0.01"
                            value={rate.rate_per_gram}
                            onChange={(e) => handleRateChange(rate.metal_type, e.target.value)}
                            className="w-32 text-right text-2xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-black outline-none transition-colors"
                        />
                      </div>
                   </div>
                   <div className="text-right text-xs text-gray-400 font-mono">
                      Prev: ₹{rate.previous_rate}
                   </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-4 rounded-lg font-bold text-lg shadow-md transition-all ${
                    saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-black text-gold hover:bg-gray-800 hover:scale-[1.02]'
                }`}
              >
                {saving ? 'Broadcasting Prices...' : 'UPDATE LIVE PRICES'}
              </button>
           </form>
        </div>

        {/* INFO WIDGET */}
        <div className="space-y-6">
            <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-gold font-bold text-lg mb-2">📢 System Impact</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">
                    Changing these rates will immediately recalculate the prices of all items in your <strong>Inventory Lookbook</strong>.
                </p>
                <div className="bg-blue-800/50 p-3 rounded-lg text-xs font-mono">
                    Example: A 10g Chain <br/>
                    Old Rate (₹6500) = ₹65,000 <br/>
                    New Rate (₹6600) = <span className="text-green-300 font-bold">₹66,000</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-100">
                        <span className="block text-xs text-gray-500 uppercase">Gold Trend</span>
                        <span className="font-bold text-yellow-700">Bullish ▲</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-100">
                        <span className="block text-xs text-gray-500 uppercase">Silver Trend</span>
                        <span className="font-bold text-gray-700">Stable -</span>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DailyRates;