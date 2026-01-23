import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DailyRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Fetch current rates on load
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/rates');
        setRates(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching rates:', error);
      }
    };
    fetchRates();
  }, []);

  // 2. Handle input changes locally
  const handleRateChange = (metalType, newRate) => {
    setRates(rates.map(rate => 
      rate.metal_type === metalType ? { ...rate, rate_per_gram: newRate } : rate
    ));
  };

  // 3. Save new rates to the database
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await axios.put('http://localhost:5000/api/rates', { rates });
      setMessage('✅ Live rates updated successfully!');
      setTimeout(() => setMessage(''), 3000); // clear message after 3s
    } catch (error) {
      setMessage('❌ Failed to update rates.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading rates...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Daily Metal Rates</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-gold max-w-2xl">
        <p className="text-gray-500 mb-6">
          Update the per-gram rates below. Changes will immediately affect all product prices on the customer site.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {rates.map((rate) => (
            <div key={rate.metal_type} className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-700">{rate.metal_type.replace('_', ' ')}</h3>
                <span className="text-xs text-gray-400">Last updated: {new Date(rate.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-bold mr-2">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={rate.rate_per_gram}
                  onChange={(e) => handleRateChange(rate.metal_type, e.target.value)}
                  className="w-32 p-2 border border-gray-300 rounded font-semibold text-right focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded font-bold text-white transition ${saving ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`}
          >
            {saving ? 'Updating Live Prices...' : 'SAVE DAILY RATES'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DailyRates;