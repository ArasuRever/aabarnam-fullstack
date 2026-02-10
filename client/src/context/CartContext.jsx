import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // 1. Safety Shield: Load cart with error handling
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('aabarnam_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Corrupt cart data found, resetting.", e);
      return [];
    }
  });

  // 2. Safety Shield: Save cart with error handling
  useEffect(() => {
    try {
      localStorage.setItem('aabarnam_cart', JSON.stringify(cart));
    } catch (error) {
      console.error("Storage Full! Could not save cart.", error);
    }
  }, [cart]);

  // INCREASE QTY (With Image Stripping)
  const addToCart = (product) => {
    // 3. SANITIZATION: Remove heavy images before saving
    // We only keep the ID, name, price, etc.
    const { main_image_url, gallery_images, ...safeProduct } = product;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === safeProduct.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === safeProduct.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...safeProduct, qty: 1 }];
    });
  };

  // DECREASE QTY
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

  // REMOVE COMPLETELY
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