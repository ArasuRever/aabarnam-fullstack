import React, { useEffect, useState, useMemo } from 'react';
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

  // 🌟 Trigger animations when envelope is clicked
  useEffect(() => {
      if (isOpen) {
          setShowEffects(true);
          // Let the animation run for 8 seconds before cleaning up the DOM elements
          const timer = setTimeout(() => setShowEffects(false), 8000); 
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  // 🌟 Memoize particles so they don't randomly jump around on re-renders
  const particles = useMemo(() => {
      return Array.from({ length: 35 }).map((_, i) => ({
          id: i,
          left: Math.floor(Math.random() * 100), // Random position from 0vw to 100vw
          delay: (Math.random() * 1.5).toFixed(2), // Staggered start times
          duration: (3 + Math.random() * 4).toFixed(2), // Random speed between 3s and 7s
          scale: (0.4 + Math.random() * 0.8).toFixed(2), // Random sizes
      }));
  }, []); // Empty array means this runs only once

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

  // 🌟 Determine Occasion Themes & Dynamic Background Colors
  const occasion = (giftData.gift_occasion || '').toLowerCase();
  
  let ThemeIcon = Gift;
  let effectType = 'sparkles'; 
  let envelopeLabel = 'A Special Gift';
  // Default dark luxury background
  let bgGradient = 'from-gray-900 via-gray-800 to-black';

  if (occasion.includes('birthday')) {
      ThemeIcon = PartyPopper;
      effectType = 'balloons';
      envelopeLabel = 'Happy Birthday!';
      bgGradient = 'from-indigo-900 via-purple-900 to-black'; // Festive Purple/Blue
  } else if (occasion.includes('annivers') || occasion.includes('valentin') || occasion.includes('love')) {
      ThemeIcon = Heart;
      effectType = 'hearts';
      envelopeLabel = 'With Love';
      bgGradient = 'from-rose-900 via-red-950 to-black'; // Romantic Red
  } else if (occasion.includes('wedding') || occasion.includes('marriage')) {
      ThemeIcon = Gem;
      effectType = 'sparkles'; 
      envelopeLabel = 'Happy Wedding!';
      bgGradient = 'from-amber-900 via-stone-900 to-black'; // Elegant Gold/Stone
  } else if (giftData.gift_occasion) {
      envelopeLabel = giftData.gift_occasion; 
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-1000`}>
        
        {/* 🌟 ROBUST Z-INDEX FIX AND ANIMATION CSS */}
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes floatUpAnim {
                0% { transform: translateY(100vh) scale(var(--scale)) rotate(-10deg); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-20vh) scale(var(--scale)) rotate(20deg); opacity: 0; }
            }
            .particle-layer {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                pointer-events: none; /* Let clicks pass through to the buttons */
                z-index: 9999; /* Massive Z-Index to stay on top of everything */
            }
            .effect-particle {
                position: absolute;
                bottom: -100px; /* Start securely off the bottom of the screen */
                animation: floatUpAnim var(--duration) linear forwards;
                animation-delay: var(--delay);
                opacity: 0;
            }
            .balloon-shape {
                width: 40px; height: 50px;
                background: linear-gradient(to bottom right, #D4AF37, #FDE047);
                border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
                box-shadow: inset -5px -5px 10px rgba(0,0,0,0.2), 0 5px 15px rgba(0,0,0,0.3);
                position: relative;
            }
            .balloon-shape::after {
                content: ''; position: absolute; bottom: -8px; left: 18px;
                width: 4px; height: 10px; background: #D4AF37;
                clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            }
            .heart-shape { color: #e11d48; font-size: 45px; filter: drop-shadow(0 0 10px rgba(225, 29, 72, 0.6)); }
            .sparkle-shape { color: #D4AF37; font-size: 40px; filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.8)); }
        `}} />

        {/* 🌟 RENDER THE FOREGROUND EFFECTS LAYER */}
        {showEffects && (
            <div className="particle-layer">
                {particles.map(p => (
                    <div 
                        key={p.id} 
                        className="effect-particle"
                        style={{
                            left: `${p.left}vw`,
                            '--duration': `${p.duration}s`,
                            '--delay': `${p.delay}s`,
                            '--scale': p.scale
                        }}
                    >
                        {effectType === 'balloons' && <div className="balloon-shape"></div>}
                        {effectType === 'hearts' && <div className="heart-shape">❤</div>}
                        {effectType === 'sparkles' && <div className="sparkle-shape">✨</div>}
                    </div>
                ))}
            </div>
        )}

        {/* PREVIEW BANNER */}
        {isPreview && (
            <div className="fixed top-0 left-0 w-full bg-gold text-black text-center py-2 text-xs font-bold uppercase tracking-widest z-[10000] flex items-center justify-center gap-2 shadow-lg">
                <Eye size={16} /> Live Preview Mode
            </div>
        )}

        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] z-0 pointer-events-none"></div>

        <div className="max-w-lg w-full relative z-10 mt-8">
            {!isOpen ? (
                // THE CLOSED ENVELOPE / BOX
                <div 
                    onClick={() => setIsOpen(true)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-12 rounded-3xl text-center cursor-pointer hover:bg-white/15 transition-all duration-500 hover:scale-105 shadow-2xl group"
                >
                    <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gold transition-colors shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                        <ThemeIcon size={32} className="text-gold group-hover:text-black transition-colors" />
                    </div>
                    <h2 className="text-3xl font-serif text-white mb-2">{envelopeLabel}</h2>
                    <p className="text-gold tracking-widest uppercase text-sm font-bold animate-pulse mt-4">Tap to Reveal</p>
                </div>
            ) : (
                // THE REVEALED MESSAGE
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in-up text-center relative overflow-hidden">
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
                            <button onClick={() => window.close()} className="text-xs font-bold text-gray-400 hover:text-gold uppercase tracking-widest transition-colors">
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