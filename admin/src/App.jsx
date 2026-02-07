import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyRates from './pages/DailyRates';
import AdminLayout from './components/AdminLayout';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import PricingRules from './pages/PricingRules'; // Import the new page

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? <AdminLayout>{children}</AdminLayout> : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/daily-rates" element={<ProtectedRoute><DailyRates /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/products/add" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
        {/* Register the new pricing route */}
        <Route path="/pricing-rules" element={<ProtectedRoute><PricingRules /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;