import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  
  const [newThumbnail, setNewThumbnail] = useState(null); 
  const [newThumbnailPreview, setNewThumbnailPreview] = useState(null); 
  
  const [galleryImages, setGalleryImages] = useState([]); 
  const [deletedGalleryIds, setDeletedGalleryIds] = useState([]); 
  const [newGalleryFiles, setNewGalleryFiles] = useState([]); 
  const [newGalleryPreviews, setNewGalleryPreviews] = useState([]); 

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    const results = products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || p.item_type === typeFilter;
      return matchesSearch && matchesType;
    });
    setFilteredProducts(results);
  }, [searchTerm, typeFilter, products]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}" permanently?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        fetchProducts(); 
      } catch (error) { alert('Failed to delete.'); }
    }
  };
  
  const openEditModal = async (productSummary) => {
    setEditLoading(true);
    setIsEditModalOpen(true);
    try {
        const response = await axios.get(`http://localhost:5000/api/products/${productSummary.id}`);
        setEditingProduct(response.data);
        setGalleryImages(response.data.gallery_images || []);
        
        setNewThumbnail(null);
        setNewThumbnailPreview(null);
        setDeletedGalleryIds([]);
        setNewGalleryFiles([]);
        setNewGalleryPreviews([]);
    } catch (err) {
        alert("Could not fetch product details.");
        setIsEditModalOpen(false);
    } finally { setEditLoading(false); }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setNewThumbnail(file);
        setNewThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        setNewGalleryFiles([...newGalleryFiles, ...files]);
        setNewGalleryPreviews([...newGalleryPreviews, ...files.map(f => URL.createObjectURL(f))]);
    }
  };

  const markGalleryImageForDeletion = (id) => {
    setDeletedGalleryIds([...deletedGalleryIds, id]);
    setGalleryImages(galleryImages.filter(img => img.id !== id));
  };

  const removeNewGalleryUpload = (index) => {
    setNewGalleryFiles(newGalleryFiles.filter((_, i) => i !== index));
    setNewGalleryPreviews(newGalleryPreviews.filter((_, i) => i !== index));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    // Core Fields
    formData.append('name', editingProduct.name);
    formData.append('item_type', editingProduct.item_type);
    formData.append('metal_type', editingProduct.metal_type);
    formData.append('gross_weight', editingProduct.gross_weight);
    formData.append('stone_weight', editingProduct.stone_weight || 0);
    formData.append('net_weight', editingProduct.net_weight);
    
    // Inward Logic
    formData.append('purchase_touch_pct', editingProduct.purchase_touch_pct || 91.6);
    formData.append('purchase_mc_type', editingProduct.purchase_mc_type || 'PER_GRAM');
    formData.append('purchase_mc', editingProduct.purchase_mc || 0);

    // Outward Logic
    formData.append('retail_price_type', editingProduct.retail_price_type || 'DYNAMIC');
    formData.append('fixed_price', editingProduct.fixed_price || 0);
    formData.append('wastage_pct', editingProduct.wastage_pct);
    formData.append('making_charge', editingProduct.making_charge);

    if (newThumbnail) formData.append('thumbnail', newThumbnail);
    newGalleryFiles.forEach(file => formData.append('new_gallery_images', file));
    formData.append('deleted_gallery_ids', JSON.stringify(deletedGalleryIds));

    try {
        await axios.put(`http://localhost:5000/api/products/${editingProduct.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Product Updated Successfully! ✅");
        setIsEditModalOpen(false);
        fetchProducts();
    } catch (err) { alert("Update Failed."); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Inventory...</div>;

  return (
    <div className="relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div><h1 className="text-3xl font-bold text-gray-800">Inventory Lookbook</h1><p className="text-gray-500 text-sm">Manage your jewelry collection visually.</p></div>
        <div className="flex items-center gap-3">
            <div className="bg-white border rounded-lg p-1 flex shadow-sm">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>
            <Link to="/products/add" className="bg-black text-gold px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition shadow-md flex items-center">
                <span>+ Add Product</span>
            </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="p-2 border rounded-lg bg-gray-50 font-bold text-gray-700 w-full md:w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {[...new Set(products.map(p => p.item_type))].filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border overflow-hidden relative">
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img src={product.main_image_url || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-gold px-3 py-1 rounded-full text-xs font-bold shadow-sm">₹{product.price_breakdown?.final_total_price}</div>
                    <div className="absolute top-2 left-2 bg-white/90 text-gray-800 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{product.item_type || 'JEWELRY'}</div>
                </div>
                <div className="p-4">
                    <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mb-2">{product.sku}</p>
                    <div className="flex gap-2 pt-2 border-t border-dashed border-gray-200">
                        <button onClick={() => openEditModal(product)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 transition">Edit</button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 transition">Remove</button>
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-700">Image</th>
                <th className="p-4 font-semibold text-gray-700">Type</th>
                <th className="p-4 font-semibold text-gray-700">SKU / Name</th>
                <th className="p-4 font-semibold text-gray-700">Metal</th>
                <th className="p-4 font-semibold text-gray-700">Price</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-4"><img src={product.main_image_url} alt={product.name} className="w-12 h-12 rounded object-cover border" /></td>
                    <td className="p-4"><span className="px-2 py-1 bg-gray-100 text-xs font-bold rounded uppercase text-gray-600">{product.item_type || 'General'}</span></td>
                    <td className="p-4"><p className="font-bold text-gray-800">{product.sku}</p><p className="text-sm text-gray-500">{product.name}</p></td>
                    <td className="p-4 text-sm font-medium">{product.metal_type.replace('_', ' ')}</td>
                    <td className="p-4 font-bold text-green-600">₹{product.price_breakdown?.final_total_price}</td>
                    <td className="p-4 text-center space-x-2">
                        <button onClick={() => openEditModal(product)} className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold hover:bg-blue-200">Edit</button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200">Delete</button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}

      {/* --- ADVANCED EDIT MODAL --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] overflow-y-auto">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg">Edit Inventory: {editingProduct.sku}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            {editLoading ? <div className="p-12 text-center font-bold text-gray-500">Loading full ledger...</div> : (
                <form onSubmit={saveEdit} className="p-6 space-y-6">
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input className="w-full p-2 border rounded font-bold" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Type</label>
                            <select className="w-full p-2 border rounded bg-white" value={editingProduct.item_type} onChange={(e) => setEditingProduct({...editingProduct, item_type: e.target.value})}>
                                {['RING', 'CHAIN', 'NECKLACE', 'BANGLES', 'EARRINGS', 'BRACELET', 'HARAM', 'PENDANT'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Metal</label>
                            <select className="w-full p-2 border rounded" value={editingProduct.metal_type} onChange={(e) => setEditingProduct({...editingProduct, metal_type: e.target.value})}>
                                <option value="22K_GOLD">22K Gold</option><option value="24K_GOLD">24K Gold</option><option value="SILVER">Silver</option>
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gross Wt</label><input type="number" step="0.001" className="w-full p-2 border rounded" value={editingProduct.gross_weight} onChange={(e) => setEditingProduct({...editingProduct, gross_weight: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stone Wt</label><input type="number" step="0.001" className="w-full p-2 border rounded" value={editingProduct.stone_weight || 0} onChange={(e) => setEditingProduct({...editingProduct, stone_weight: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Net Wt</label><input type="number" step="0.001" className="w-full p-2 border rounded font-bold text-green-700 bg-gray-50" value={editingProduct.net_weight} onChange={(e) => setEditingProduct({...editingProduct, net_weight: e.target.value})} /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* INWARD (RED) */}
                        <div className="border border-red-200 rounded-lg p-4 bg-red-50/30">
                            <h4 className="text-red-800 font-bold text-sm mb-3 uppercase tracking-wide border-b border-red-200 pb-2">Wholesale / Inward Math</h4>
                            <div className="space-y-3">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Purchase Touch %</label><input type="number" step="0.1" className="w-full p-2 border rounded" value={editingProduct.purchase_touch_pct} onChange={(e) => setEditingProduct({...editingProduct, purchase_touch_pct: e.target.value})} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Making Charge Type</label>
                                    <select className="w-full p-2 border rounded" value={editingProduct.purchase_mc_type} onChange={(e) => setEditingProduct({...editingProduct, purchase_mc_type: e.target.value})}>
                                        <option value="PER_GRAM">Per Gram</option><option value="FIXED_PIECE">Fixed / Piece</option><option value="BUNDLED_RATE">Bundled Rate/g</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">MC Amount (₹)</label><input type="number" className="w-full p-2 border rounded" value={editingProduct.purchase_mc} onChange={(e) => setEditingProduct({...editingProduct, purchase_mc: e.target.value})} /></div>
                            </div>
                        </div>

                        {/* OUTWARD (GREEN) */}
                        <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                            <h4 className="text-green-800 font-bold text-sm mb-3 uppercase tracking-wide border-b border-green-200 pb-2">Retail / Outward Math</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Retail Price Mode</label>
                                    <select className="w-full p-2 border border-green-300 rounded font-bold" value={editingProduct.retail_price_type} onChange={(e) => setEditingProduct({...editingProduct, retail_price_type: e.target.value})}>
                                        <option value="DYNAMIC">Dynamic (Live Rates)</option>
                                        <option value="FIXED">Fixed Sticker Price</option>
                                    </select>
                                </div>
                                
                                {editingProduct.retail_price_type === 'DYNAMIC' ? (
                                    <>
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Customer Wastage (VA) %</label><input type="number" step="0.1" className="w-full p-2 border rounded" value={editingProduct.wastage_pct} onChange={(e) => setEditingProduct({...editingProduct, wastage_pct: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Customer Making Charge (₹)</label><input type="number" className="w-full p-2 border rounded" value={editingProduct.making_charge} onChange={(e) => setEditingProduct({...editingProduct, making_charge: e.target.value})} /></div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Fixed Price (₹)</label>
                                        <input type="number" className="w-full p-2 border border-green-400 rounded text-green-800 font-bold shadow-inner" placeholder="E.g. 2500" value={editingProduct.fixed_price} onChange={(e) => setEditingProduct({...editingProduct, fixed_price: e.target.value})} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Image Management */}
                    <div className="border p-4 rounded bg-gray-50 flex gap-6">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Main Thumbnail</label>
                            <img src={newThumbnailPreview || editingProduct.main_image_url} className="w-full h-32 object-cover rounded border border-gray-300 mb-2" alt="thumbnail" />
                            <label className="cursor-pointer bg-white border border-gray-300 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-100 block text-center">
                                Change
                                <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                            </label>
                        </div>
                        <div className="flex-1 border-l pl-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gallery Images</label>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {galleryImages.map(img => (
                                    <div key={img.id} className="relative group">
                                        <img src={img.url} className="w-full h-16 object-cover rounded border" alt="gallery" />
                                        <button type="button" onClick={() => markGalleryImageForDeletion(img.id)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl opacity-0 group-hover:opacity-100 transition">×</button>
                                    </div>
                                ))}
                                {newGalleryPreviews.map((src, i) => (
                                    <div key={`new-${i}`} className="relative group">
                                        <img src={src} className="w-full h-16 object-cover rounded border border-green-400" alt="new upload" />
                                        <button type="button" onClick={() => removeNewGalleryUpload(i)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl">×</button>
                                    </div>
                                ))}
                            </div>
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-3 py-1.5 rounded text-xs font-bold border border-blue-200 hover:bg-blue-100 inline-block">
                                + Add More
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                            </label>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-black text-gold py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition shadow-lg">
                        Save Ledger Changes
                    </button>
                </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;