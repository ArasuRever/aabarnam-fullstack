import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import Account from './pages/Account'; // <--- BROUGHT THIS BACK!
import Wishlist from './pages/Wishlist'; 

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white font-sans text-gray-900">
        <Toaster position="top-center" reverseOrder={false} />
        <Navbar />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/collections/:category" element={<Catalog />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/account" element={<Account />} /> {/* <--- BROUGHT THIS BACK! */}
          <Route path="/wishlist" element={<Wishlist />} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App;