import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home'; // <--- Import Home

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add more routes later (Product Details, Collections, etc.) */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;