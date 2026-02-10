import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const RateTicker = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/rates');
        setRates(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load rates");
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const getTrendIcon = (current, prev) => {
    if (current > prev) return <TrendingUp size={14} className="text-green-400 ml-1" />;
    if (current < prev) return <TrendingDown size={14} className="text-red-400 ml-1" />;
    return <Minus size={14} className="text-gray-400 ml-1" />;
  };

  if (loading || rates.length === 0) return null;

  return (
    <div className="bg-black text-white text-xs py-2 overflow-hidden border-b border-gray-800 relative z-50">
      <div className="flex justify-center items-center gap-8 animate-fade-in">
        <span className="text-gold font-bold uppercase tracking-widest hidden md:block">
          Today's Rate:
        </span>
        
        <div className="flex gap-6">
          {rates.map((rate) => (
            <div key={rate.metal_type} className="flex items-center gap-1">
              <span className="text-gray-400 uppercase">{rate.metal_type.replace('_', ' ')}</span>
              <span className="font-bold text-white text-sm">₹{rate.rate_per_gram}</span>
              {getTrendIcon(rate.rate_per_gram, rate.previous_rate)}
            </div>
          ))}
        </div>
        
        <span className="text-gray-600 hidden md:block">|</span>
        <span className="text-gray-400 hidden md:block">
          Making Charges starting from 8%
        </span>
      </div>
    </div>
  );
};

export default RateTicker;