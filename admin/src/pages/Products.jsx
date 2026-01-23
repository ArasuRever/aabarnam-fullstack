import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Products
  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 2. Handle Delete Product
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        // Refresh the list after deleting
        fetchProducts(); 
      } catch (error) {
        alert('Failed to delete product. Backend API needs to be updated.');
      }
    }
  };

  if (loading) return <div className="text-gray-500">Loading products...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Catalog</h1>
        <Link 
          to="/products/add" 
          className="bg-black text-gold px-4 py-2 rounded font-bold hover:bg-gray-800 transition shadow-md"
        >
          + Add New Product
        </Link>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-700">Image</th>
              <th className="p-4 font-semibold text-gray-700">SKU / Name</th>
              <th className="p-4 font-semibold text-gray-700">Metal</th>
              <th className="p-4 font-semibold text-gray-700">Net Wt.</th>
              <th className="p-4 font-semibold text-gray-700">LIVE PRICE</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Actions</th> {/* NEW COLUMN */}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-4">
                  <img src={product.main_image_url} alt={product.name} className="w-12 h-12 rounded object-cover border" />
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-800">{product.sku}</p>
                  <p className="text-sm text-gray-500">{product.name}</p>
                </td>
                <td className="p-4 text-sm font-medium">{product.metal_type.replace('_', ' ')}</td>
                <td className="p-4 text-sm">{product.net_weight} g</td>
                <td className="p-4 font-bold text-green-600">
                  ₹{product.price_breakdown.final_total_price}
                </td>
                <td className="p-4 text-center space-x-2">
                  {/* Edit Button */}
                  <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-semibold hover:bg-blue-200 transition">
                    Edit
                  </button>
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDelete(product.id, product.name)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm font-semibold hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;