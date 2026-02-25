import React, { useState, useRef, useEffect } from 'react';
import { Shield, X, RefreshCw } from 'lucide-react';

const OTPModal = ({ isOpen, onClose, targetValue, onVerify }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black transition">
            <X size={20} />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Shield size={32} />
          </div>
          
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Secure Verification</h2>
          <p className="text-gray-500 text-sm mb-8">
            We've sent a 6-digit code to <br/>
            <span className="font-bold text-gray-800">{targetValue}</span>
          </p>

          <div className="flex justify-center gap-2 mb-8">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={el => inputRefs.current[idx] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-12 h-14 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:border-gold focus:ring-0 outline-none transition-all"
              />
            ))}
          </div>

          <button 
            onClick={() => onVerify(otp.join(''))}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all mb-4"
          >
            Verify & Proceed
          </button>

          <div className="flex items-center justify-center gap-2 text-sm">
            {timer > 0 ? (
              <p className="text-gray-400">Resend code in <span className="text-gray-900 font-bold">{timer}s</span></p>
            ) : (
              <button onClick={() => setTimer(30)} className="text-gold font-bold flex items-center gap-1 hover:underline">
                <RefreshCw size={14} /> Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;