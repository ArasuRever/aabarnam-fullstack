import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // NEW: 30 Min Base + 3 Min Grace Period
  const TOTAL_LOCK_DURATION = 33 * 60 * 1000;

  // 1. Load cart & Auto-clean broken/expired items on boot
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('aabarnam_cart');
      if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const now = Date.now();
          
          return parsedCart.filter(item => {
              const hasPrice = item.price_breakdown && item.price_breakdown.final_total_price;
              const isNotExpired = item.locked_at ? (now - item.locked_at < TOTAL_LOCK_DURATION) : true;
              return hasPrice && isNotExpired;
          });
      }
      return [];
    } catch (e) {
      console.error("Corrupt cart data, resetting.");
      return [];
    }
  });

  // 2. Safe Save Shield
  useEffect(() => {
    try {
      localStorage.setItem('aabarnam_cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Storage Full! Could not save cart.", error);
    }
  }, [cart]);

  // 3. BACKGROUND CART MONITOR (Auto-evicts expired deals)
  useEffect(() => {
      if (cart.length === 0) return;

      const interval = setInterval(() => {
          const now = Date.now();
          let hasExpiredItems = false;

          const updatedCart = cart.filter(item => {
              if (item.locked_at && (now - item.locked_at > TOTAL_LOCK_DURATION)) {
                  hasExpiredItems = true;
                  toast.error(`Price lock for ${item.name} expired! It has been removed from your bag.`, { duration: 6000, icon: '⏱️' });
                  return false; 
              }
              return true; 
          });

          if (hasExpiredItems) setCart(updatedCart); 
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
  }, [cart]);

  // 4. ADD TO CART (Injects the timestamp)
  const addToCart = (product) => {
    const { main_image_url, gallery_images, ...safeProduct } = product;
    const lockedAt = Date.now(); // Record exact time of addition

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === safeProduct.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === safeProduct.id ? { ...item, qty: item.qty + 1, locked_at: lockedAt } : item
        );
      }
      return [...prevCart, { ...safeProduct, qty: 1, locked_at: lockedAt }];
    });
  };

  const decrementFromCart = (id) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === id);
      if (existingItem.qty === 1) {
        return prevCart.filter((item) => item.id !== id);
      }
      return prevCart.map((item) =>
        item.id === id ? { ...item, qty: item.qty - 1 } : item
      );
    });
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  
  const cartTotal = cart.reduce((acc, item) => {
    const price = parseFloat(item.price_breakdown?.final_total_price || 0);
    return acc + (price * item.qty);
  }, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, decrementFromCart, removeFromCart, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};