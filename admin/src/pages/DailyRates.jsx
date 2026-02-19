import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, TrendingUp, TrendingDown, Settings, ShieldCheck, Save, Edit2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const DailyRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controls State
  const [syncing, setSyncing] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  
  // Configuration State
  const [premium, setPremium] = useState(3.0); 
  const [intervalHrs, setIntervalHrs] = useState(1);

  const fetchData = async () => {
    try {
      const [ratesRes, configRes] = await Promise.all([
         axios.get('http://localhost:5000/api/rates'),
         axios.get('http://localhost:5000/api/rates/config')
      ]);
      setRates(ratesRes.data);
      setIntervalHrs(configRes.data.interval);
      setPremium(configRes.data.premium);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load market data');
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Save Automation Settings
  const handleSaveConfig = async () => {
    const toastId = toast.loading('Updating background timer...');
    try {
      await axios.post('http://localhost:5000/api/rates/config', { 
         interval: intervalHrs, 
         premium: premium 
      });
      toast.success('Automation rules updated!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save settings.', { id: toastId });
    }
  };

  // Immediate API Sync
  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading('Connecting to Global Markets...');
    try {
      await axios.post('http://localhost:5000/api/rates/sync', { premium });
      await fetchData(); // Refresh table
      toast.success('Rates synced successfully!', { id: toastId });
    } catch (err) {
      toast.error('Sync failed. Please try again.', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  // Handle Manual Typing
  const handleRateChange = (index, newValue) => {
    const updatedRates = [...rates];
    updatedRates[index].rate_per_gram = newValue;
    setRates(updatedRates);
  };

  // Save Manual Edits
  const handleManualSave = async () => {
    setSavingManual(true);
    const toastId = toast.loading('Locking in custom rates...');
    
    const payloadRates = {};
    rates.forEach(r => { payloadRates[r.metal_type] = r.rate_per_gram; });

    try {
      await axios.post('http://localhost:5000/api/rates', { rates: payloadRates });
      await fetchData();
      toast.success('Custom rates locked & storefront updated!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save manual rates.', { id: toastId });
    } finally {
      setSavingManual(false);
    }
  };

  const getTrendIcon = (current, previous) => {
    if (!previous || parseFloat(current) === parseFloat(previous)) return <span className="text-gray-400 font-bold">-</span>;
    if (parseFloat(current) > parseFloat(previous)) return <TrendingUp size={16} className="text-red-500" />;
    return <TrendingDown size={16} className="text-green-500" />;
  };

  if (loading) return <div className="p-10 font-bold text-gray-400">Loading Market Data...</div>;

  const lastUpdated = rates.length > 0 ? new Date(rates[0].updated_at).toLocaleString() : 'Never';

  return (
    <div className="p-4 sm:p-8 animate-fade-in max-w-5xl mx-auto">
      <Toaster position="top-right" />
      
      {/* HEADER SECTION */}
      <div className="bg-gray-900 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10"><Activity size={200} /></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gold mb-2 flex items-center gap-3">
              <Activity /> Market Engine
            </h1>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              Sync automatically with the global market, configure background intervals, or manually override rates based on local wholesale pricing.
            </p>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-gray-700 backdrop-blur-md text-right">
             <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Last Updated</p>
             <p className="text-sm font-mono text-green-400">{lastUpdated}</p>
             <p className="text-[10px] text-gray-400 mt-1">
                Auto-Sync: {intervalHrs === 0 ? '⏸️ Paused' : `Every ${intervalHrs} hr(s)`}
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT CONTROL PANEL (AUTOMATION SYNC) */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h3 className="font-bold text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
                 <Settings size={18} className="text-gold" /> Automation Config
               </h3>
               
               <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Retail Premium (%)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2 focus-within:border-gold transition">
                     <span className="text-gray-400 px-3">+</span>
                     <input 
                        type="number" step="0.1" 
                        value={premium} 
                        onChange={(e) => setPremium(parseFloat(e.target.value))} 
                        className="w-full bg-transparent font-bold text-lg text-gray-900 outline-none" 
                     />
                     <span className="text-gray-400 px-3">%</span>
                  </div>
               </div>

               <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Background Timer</label>
                  <select 
                     value={intervalHrs} 
                     onChange={(e) => setIntervalHrs(parseFloat(e.target.value))} 
                     className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none font-bold text-gray-800 focus:border-gold transition"
                  >
                     <option value={0}>⏸️ Disabled (Manual Only)</option>
                     <option value={1}>⏱️ Every 1 Hour</option>
                     <option value={3}>⏱️ Every 3 Hours</option>
                     <option value={6}>⏱️ Every 6 Hours</option>
                     <option value={12}>⏱️ Every 12 Hours</option>
                     <option value={24}>⏱️ Every 24 Hours</option>
                  </select>
               </div>

               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSaveConfig} 
                    className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition border border-gray-200"
                  >
                    Save Rules
                  </button>
                  <button 
                    onClick={handleSync} 
                    disabled={syncing}
                    className="w-full bg-black text-gold py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> 
                    {syncing ? 'Fetching...' : 'Force Sync Now'}
                  </button>
               </div>
            </div>

            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5 text-sm text-blue-800 leading-relaxed">
               <ShieldCheck size={20} className="text-blue-600 mb-2" />
               If <strong>Background Timer</strong> is enabled, the server will fetch prices automatically even when you are offline.
            </div>
         </div>

         {/* RIGHT LIVE RATES BOARD (EDITABLE) */}
         <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
               
               <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                      <Edit2 size={14} className="text-gray-400"/> Active Storefront Rates
                  </span>
                  <button 
                     onClick={handleManualSave}
                     disabled={savingManual}
                     className="bg-gold text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-500 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                     <Save size={14}/> {savingManual ? 'Saving...' : 'Save Overrides'}
                  </button>
               </div>
               
               <div className="divide-y divide-gray-100 flex-1">
                  {rates.map((rate, index) => (
                    <div key={rate.metal_type} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition">
                       <div>
                          <div className="flex items-center gap-3 mb-1">
                             <h4 className="text-lg font-bold text-gray-900">
                                {rate.metal_type.replace('_', ' ')}
                             </h4>
                             {rate.metal_type === '22K_GOLD' && <span className="bg-gold/20 text-gold-dark text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Best Seller</span>}
                          </div>
                          <p className="text-xs text-gray-400 font-mono">Prev: ₹{parseFloat(rate.previous_rate || rate.rate_per_gram).toFixed(2)}</p>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          {getTrendIcon(rate.rate_per_gram, rate.previous_rate)}
                          
                          <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                             <input 
                                type="number" 
                                step="0.01"
                                value={rate.rate_per_gram}
                                onChange={(e) => handleRateChange(index, e.target.value)}
                                className="w-36 pl-8 pr-4 py-3 bg-white border-2 border-gray-200 rounded-lg font-mono font-bold text-lg text-gray-900 focus:border-gold focus:ring-0 outline-none transition text-right shadow-sm"
                             />
                          </div>
                       </div>
                    </div>
                  ))}
                  
                  {rates.length === 0 && !loading && (
                      <div className="p-10 text-center text-gray-500">No rates configured. Click Force Sync.</div>
                  )}
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default DailyRates;