import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- NEW

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Welcome back! 💎", {
            style: { border: '1px solid #D4AF37', padding: '16px', color: '#000', fontWeight: 'bold' },
            iconTheme: { primary: '#D4AF37', secondary: '#000' },
        });
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success("Account created successfully! 🎉", {
            style: { border: '1px solid #D4AF37', padding: '16px', color: '#000', fontWeight: 'bold' },
            iconTheme: { primary: '#D4AF37', secondary: '#000' },
        });
      }
      navigate('/'); 
    } catch (err) {
      toast.error(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Join Aabarnam'}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {isLogin ? 'Sign in to access your orders and wishlist.' : 'Create an account for faster checkout.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input required name="name" onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="Arasu K" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input required type="email" name="email" onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input required type="password" name="password" onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="••••••••" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-gold py-3.5 rounded-lg font-bold hover:bg-gray-800 transition shadow-md"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm font-bold text-gray-600 hover:text-black transition"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Auth;