import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { CartProvider } from './context/CartContext.jsx'; // <--- Check this import path

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>  {/* <--- This WRAPPER is mandatory */}
      <App />
    </CartProvider>
  </React.StrictMode>,
)