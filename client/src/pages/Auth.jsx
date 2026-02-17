import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- 1. Imported toast

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    identifier: '', 
    name: '', email: '', phone: '', password: '', 
    address: '', city: '', pincode: '' 
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.identifier, formData.password);
        // <--- 2. Replaced success alert with a styled toast --->
        toast.success("Welcome back! 💎", {
            style: { border: '1px solid #D4AF37', padding: '16px', color: '#000', fontWeight: 'bold' },
            iconTheme: { primary: '#D4AF37', secondary: '#000' },
        });
      } else {
        await register(formData);
        // <--- 3. Replaced success alert with a styled toast --->
        toast.success("Account created successfully! 🎉", {
            style: { border: '1px solid #D4AF37', padding: '16px', color: '#000', fontWeight: 'bold' },
            iconTheme: { primary: '#D4AF37', secondary: '#000' },
        });
      }
      navigate('/');
    } catch (err) {
      // <--- 4. Replaced error alert with a toast --->
      toast.error(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 animate-fade-in">
      <div className={`w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100 ${isLogin ? 'max-w-md' : 'max-w-2xl'}`}>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-gray-500 text-sm mt-2">{isLogin ? 'Login with your Phone Number or Email.' : 'Set up your profile and delivery address.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isLogin ? (
            /* --- LOGIN FORM --- */
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input required name="identifier" onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="e.g. 9876543210" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input required type="password" name="password" onChange={handleChange} className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gold outline-none transition" placeholder="••••••••" />
                </div>
              </div>
            </>
          ) : (
            /* --- REGISTER FORM (Split into 2 columns) --- */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 border-b pb-2">Personal Details</h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input required name="name" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="Arasu K" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number (Login ID)</label>
                    <input required name="phone" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input required type="email" name="email" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Create Password</label>
                    <input required type="password" name="password" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="••••••••" />
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 border-b pb-2">Primary Delivery Address</h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address</label>
                    <textarea required name="address" onChange={handleChange} rows="3" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="Door No, Street Name, Landmark"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                      <input required name="city" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="Salem" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pincode</label>
                      <input required name="pincode" onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-gold outline-none" placeholder="636001" />
                    </div>
                  </div>
               </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full mt-6 bg-black text-gold py-4 rounded-lg font-bold hover:bg-gray-800 transition shadow-md">
            {loading ? 'Processing...' : (isLogin ? 'Sign In Securely' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-gray-600 hover:text-black transition">
            {isLogin ? "New here? Create an Account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;