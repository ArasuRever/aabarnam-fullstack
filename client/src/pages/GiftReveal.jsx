import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Gift, ShieldCheck, MailOpen, Eye, Heart, PartyPopper, Gem } from 'lucide-react';

const GiftReveal = () => {
  const { orderId } = useParams();
  const [giftData, setGiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  // Check if we are in preview mode
  const isPreview = orderId === 'preview';

  useEffect(() => {
    // 🌟 IF PREVIEW MODE
    if (isPreview) {
        const previewData = localStorage.getItem('aabarnam_gift_preview');
        if (previewData) {
            setGiftData(JSON.parse(previewData));
        } else {
            setGiftData({
                customer_name: "Recipient Name",
                gift_message: "Your personalized heartfelt message will beautifully display here when your loved one scans the QR code.",
                gift_sender: "Your Name",
                gift_occasion: "Birthday"
            });
        }
        setLoading(false);
        return;
    }

    // NORMAL MODE
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
  }, [orderId, isPreview]);

  // 🌟 Trigger animations when opened
  useEffect(() => {
      if (isOpen) {
          setShowEffects(true);
          const timer = setTimeout(() => setShowEffects(false), 5000); // Stop after 5s
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

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

  // 🌟 Determine Occasion Themes
  const occasion = (giftData.gift_occasion || '').toLowerCase();
  
  let ThemeIcon = Gift;
  let effectType = 'sparkles'; 
  let envelopeLabel = 'A Special Gift';

  if (occasion.includes('birthday')) {
      ThemeIcon = PartyPopper;
      effectType = 'balloons';
      envelopeLabel = 'Happy Birthday!';
  } else if (occasion.includes('annivers') || occasion.includes('valentin') || occasion.includes('love')) {
      ThemeIcon = Heart;
      effectType = 'hearts';
      envelopeLabel = 'With Love';
  } else if (occasion.includes('wedding') || occasion.includes('marriage')) {
      ThemeIcon = Gem;
      effectType = 'sparkles'; 
      envelopeLabel = 'Happy Wedding!';
  } else if (giftData.gift_occasion) {
      envelopeLabel = giftData.gift_occasion; 
  }

  // Generate random particles
  const particles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 3 + Math.random() * 3,
      scale: 0.5 + Math.random() * 0.8,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* 🌟 THE Z-INDEX FIX IS HERE (z-index: 50 & pointer-events: none) */}
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes floatUp {
                0% { transform: translateY(110vh) scale(var(--scale)); opacity: 1; }
                100% { transform: translateY(-20vh) scale(var(--scale)) rotate(25deg); opacity: 0; }
            }
            .effect-particle {
                position: absolute;
                bottom: -50px;
                animation: floatUp var(--duration) ease-in forwards;
                animation-delay: var(--delay);
                z-index: 50; /* Forces it OVER the black screen and card */
                pointer-events: none; /* Prevents balloons from blocking clicks */
            }
            .balloon {
                width: 40px; height: 50px;
                background: linear-gradient(to bottom right, #D4AF37, #FDE047);
                border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
                box-shadow: inset -5px -5px 10px rgba(0,0,0,0.2);
            }
            .balloon::after {
                content: ''; position: absolute; bottom: -8px; left: 18px;
                width: 4px; height: 10px; background: #D4AF37;
                clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            }
            .heart-shape { color: #e11d48; font-size: 40px; text-shadow: 0 0 10px rgba(225, 29, 72, 0.5); }
            .sparkle-shape { color: #D4AF37; font-size: 30px; }
        `}} />

        {/* 🌟 RENDER DYNAMIC EFFECTS OVER EVERYTHING */}
        {showEffects && particles.map(p => (
            <div 
                key={p.id} 
                className="effect-particle fixed"
                style={{
                    left: `${p.left}vw`,
                    '--duration': `${p.duration}s`,
                    '--delay': `${p.delay}s`,
                    '--scale': p.scale
                }}
            >
                {effectType === 'balloons' && <div className="balloon"></div>}
                {effectType === 'hearts' && <div className="heart-shape">❤</div>}
                {effectType === 'sparkles' && <div className="sparkle-shape">✨</div>}
            </div>
        ))}

        {/* PREVIEW BANNER */}
        {isPreview && (
            <div className="absolute top-0 left-0 w-full bg-gold text-black text-center py-2 text-xs font-bold uppercase tracking-widest z-50 flex items-center justify-center gap-2 shadow-lg">
                <Eye size={16} /> Live Preview Mode
            </div>
        )}

        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-[100px] z-0 pointer-events-none"></div>

        <div className="max-w-lg w-full relative z-10 mt-8">
            {!isOpen ? (
                // THE CLOSED ENVELOPE / BOX
                <div 
                    onClick={() => setIsOpen(true)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-12 rounded-3xl text-center cursor-pointer hover:bg-white/15 transition-all duration-500 hover:scale-105 shadow-2xl group relative z-20"
                >
                    <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gold transition-colors shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        <ThemeIcon size={32} className="text-gold group-hover:text-black transition-colors" />
                    </div>
                    <h2 className="text-3xl font-serif text-white mb-2">{envelopeLabel}</h2>
                    <p className="text-gold tracking-widest uppercase text-sm font-bold animate-pulse">Tap to Reveal</p>
                </div>
            ) : (
                // THE REVEALED MESSAGE
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-fade-in-up text-center relative overflow-hidden z-20">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-gold-dark via-gold to-yellow-200"></div>
                    
                    <ThemeIcon size={40} className="text-gold mx-auto mb-4" />
                    
                    {giftData.gift_occasion && (
                        <p className="text-gold-dark text-sm font-bold tracking-widest uppercase mb-4">{giftData.gift_occasion}</p>
                    )}

                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-2">A message for</p>
                    <h1 className="text-3xl font-serif text-black mb-8">{giftData.customer_name}</h1>
                    
                    <div className="relative">
                        <span className="absolute -top-6 -left-2 text-6xl text-gold/20 font-serif">"</span>
                        <p className="text-lg md:text-xl text-gray-800 leading-relaxed italic mb-8 relative z-10 px-4 whitespace-pre-line">
                            {giftData.gift_message}
                        </p>
                        <span className="absolute -bottom-10 -right-2 text-6xl text-gold/20 font-serif">"</span>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6 mb-8">
                        <p className="text-gray-400 text-sm">Sent with love by</p>
                        <p className="text-xl font-serif text-black mt-1">{giftData.gift_sender}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-3 border border-gray-100">
                        <ShieldCheck size={20} className="text-gold flex-shrink-0" />
                        <p className="text-xs text-gray-500 text-left">
                            This jewelry is <strong>100% BIS Hallmarked</strong>.<br/> Authenticity guaranteed by Aabarnam.
                        </p>
                    </div>

                    {!isPreview && (
                        <div className="mt-8 pt-6">
                            <Link to="/" className="text-xs font-bold text-gray-400 hover:text-gold uppercase tracking-widest transition-colors">
                                Explore Aabarnam
                            </Link>
                        </div>
                    )}
                    {isPreview && (
                        <div className="mt-8 pt-6">
                            <button onClick={() => window.close()} className="text-xs font-bold text-gray-400 hover:text-gold uppercase tracking-widest transition-colors relative z-50">
                                Close Preview
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default GiftReveal;