import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Gift, ShieldCheck, MailOpen } from 'lucide-react';

const GiftReveal = () => {
  const { orderId } = useParams();
  const [giftData, setGiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false); // Controls the "Envelope Opening" animation

  useEffect(() => {
    const fetchGift = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/orders/gift/${orderId}`);
        setGiftData(res.data);
      } catch (err) {
        setError('Gift message not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchGift();
  }, [orderId]);

  if (loading) {
      return <div className="min-h-screen bg-black flex items-center justify-center"><Sparkles className="text-gold animate-spin" size={32}/></div>;
  }

  if (error) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
              <ShieldCheck size={48} className="text-gray-600 mb-4" />
              <h1 className="text-white text-2xl font-serif mb-2">Secure Vault</h1>
              <p className="text-gray-400">{error}</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-[100px]"></div>

        <div className="max-w-lg w-full relative z-10">
            {!isOpen ? (
                // THE CLOSED ENVELOPE / BOX
                <div 
                    onClick={() => setIsOpen(true)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-12 rounded-3xl text-center cursor-pointer hover:bg-white/15 transition-all duration-500 hover:scale-105 shadow-2xl group"
                >
                    <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gold transition-colors shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        <MailOpen size={32} className="text-gold group-hover:text-black transition-colors" />
                    </div>
                    <h2 className="text-3xl font-serif text-white mb-2">A Special Gift</h2>
                    <p className="text-gold tracking-widest uppercase text-sm font-bold animate-pulse">Tap to Reveal</p>
                </div>
            ) : (
                // THE REVEALED MESSAGE
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-fade-in-up text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-200"></div>
                    
                    <Gift size={40} className="text-gold mx-auto mb-6" />
                    
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4">A message for</p>
                    <h1 className="text-3xl font-serif text-black mb-8">{giftData.customer_name}</h1>
                    
                    <div className="relative">
                        <span className="absolute -top-6 -left-2 text-6xl text-gold/20 font-serif">"</span>
                        <p className="text-lg md:text-xl text-gray-800 leading-relaxed italic mb-8 relative z-10 px-4">
                            {giftData.gift_message}
                        </p>
                        <span className="absolute -bottom-10 -right-2 text-6xl text-gold/20 font-serif">"</span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6 mb-8">
                        <p className="text-gray-400 text-sm">Sent with love by</p>
                        <p className="text-xl font-serif text-black mt-1">{giftData.gift_sender}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-3 border border-gray-100">
                        <ShieldCheck size={20} className="text-gold" />
                        <p className="text-xs text-gray-500 text-left">
                            This jewelry is <strong>100% BIS Hallmarked</strong>.<br/> Authenticity guaranteed by Aabarnam.
                        </p>
                    </div>

                    <div className="mt-8 pt-6">
                        <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gold uppercase tracking-widest transition-colors">
                            Explore Aabarnam
                        </Link>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default GiftReveal;