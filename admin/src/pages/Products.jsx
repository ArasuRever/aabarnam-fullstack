import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const results = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || p.item_type === typeFilter;
      return matchesSearch && matchesType;
    });
    setFilteredProducts(results);
  }, [searchTerm, typeFilter, products]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        fetchProducts(); 
      } catch (error) {
        alert('Failed to delete product.');
      }
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading inventory...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Available Inventory</h1>
          <p className="text-gray-500">Manage your jewelry stock and live prices.</p>
        </div>
        <Link 
          to="/products/add" 
          className="bg-black text-gold px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg"
        >
          + Add New Stock
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-col md:flex-row gap-4">
        <input 
          type="text" 
          placeholder="Search by SKU or Name..." 
          className="flex-grow p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="p-2 border rounded bg-gray-50 font-bold"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Item Types</option>
          <option value="RING">Rings</option>
          <option value="CHAIN">Chains</option>
          <option value="NECKLACE">Necklaces</option>
          <option value="BANGLES">Bangles</option>
          <option value="EARRINGS">Earrings</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-700">Image</th>
              <th className="p-4 font-semibold text-gray-700">Type</th>
              <th className="p-4 font-semibold text-gray-700">SKU / Name</th>
              <th className="p-4 font-semibold text-gray-700">Metal</th>
              <th className="p-4 font-semibold text-gray-700">Net Wt.</th>
              <th className="p-4 font-semibold text-gray-700">LIVE PRICE</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-4">
                  <img src={product.main_image_url || 'https://via.placeholder.com/50'} alt={product.name} className="w-12 h-12 rounded object-cover border" />
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-100 text-xs font-bold rounded uppercase text-gray-600">
                    {product.item_type || 'General'}
                  </span>
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-800 text-sm">{product.sku}</p>
                  <p className="text-sm text-gray-500">{product.name}</p>
                </td>
                <td className="p-4 text-xs font-medium">{product.metal_type.replace('_', ' ')}</td>
                <td className="p-4 text-sm font-mono">{product.net_weight}g</td>
                <td className="p-4 font-bold text-green-600">
                  ₹{product.price_breakdown.final_total_price}
                </td>
                <td className="p-4 text-center space-x-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold hover:bg-blue-200">Edit</button>
                  <button 
                    onClick={() => handleDelete(product.id, product.name)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-gray-400">No matching products found in inventory.</div>
        )}
      </div>
    </div>
  );
};

export default Products;