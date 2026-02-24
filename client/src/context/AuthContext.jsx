import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // 🛡️ THE FIX: Synchronously read from localStorage on the very first frame.
  // This prevents the "null" flicker that kicks you out on refresh!
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('aabarnam_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // 1. Updated to use "identifier" (Phone or Email) instead of just email
  const login = async (identifier, password) => {
    const res = await axios.post('http://localhost:5000/api/auth/login', { identifier, password });
    setUser(res.data.user);
    localStorage.setItem('aabarnam_token', res.data.token);
    localStorage.setItem('aabarnam_user', JSON.stringify(res.data.user));
  };

  // 2. Updated to accept the full data object (including phone, address, city, pincode)
  const register = async (userData) => {
    const res = await axios.post('http://localhost:5000/api/auth/register', userData);
    setUser(res.data.user);
    localStorage.setItem('aabarnam_token', res.data.token);
    localStorage.setItem('aabarnam_user', JSON.stringify(res.data.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aabarnam_token');
    localStorage.removeItem('aabarnam_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};