import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // 1. Load cart & Auto-clean broken items
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('aabarnam_cart');
      if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          // MAGIC FIX: This line destroys the corrupted "Zero Price" items
          return parsedCart.filter(item => item.price_breakdown && item.price_breakdown.final_total_price);
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

  // 3. INCREASE QTY & STRIP IMAGES (Prevents QuotaExceededError)
  const addToCart = (product) => {
    // We separate the heavy images from the safe data
    const { main_image_url, gallery_images, ...safeProduct } = product;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === safeProduct.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === safeProduct.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...safeProduct, qty: 1 }]; // Save only lightweight data
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