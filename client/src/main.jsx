import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { CartProvider } from './context/CartContext.jsx'; // <--- 1. Add this import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>  {/* <--- 2. Add this opening tag */}
      <App />
    </CartProvider> {/* <--- 3. Add this closing tag */}
  </React.StrictMode>,
)