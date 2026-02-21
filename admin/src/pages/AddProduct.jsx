import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Image as ImageIcon, Package, Tag, Calculator, Info, CheckCircle2 } from 'lucide-react';

const AddProduct = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [itemTypes, setItemTypes] = useState(['RING', 'CHAIN', 'NECKLACE', 'BANGLES', 'EARRINGS', 'BRACELET', 'HARAM', 'PENDANT']);
  const [commonNames, setCommonNames] = useState(['Bridal Haram', 'Singapore Chain', 'Stone Ring', 'Plain Bangles', 'Temple Necklace']);

  const defaultRow = {
    barcode: '', 
    image_files: [], 
    image_previews: [], 
    primary_image_index: 0,
    
    name: '', 
    description: '',
    item_type: 'RING', 
    metal_type: '22K_GOLD', 
    
    net_weight: '', 
    stone_weight: '', 
    gross_weight: '0.000', 
    
    // INWARD (WHOLESALE MATH)
    purchase_touch_pct: '92', 
    purchase_mc_type: 'PER_GRAM', 
    purchase_mc: '',
    
    // OUTWARD (RETAIL MATH)
    retail_price_type: 'DYNAMIC', 
    fixed_price: '',
    wastage_pct: '12', 
    making_charge_type: 'FLAT', 
    making_charge: '', 
    
    stock_quantity: '1'
  };

  const [rows, setRows] = useState([{ ...defaultRow }]);

  const handleAddNewType = () => {
    const newType = prompt("Enter new Item Type (e.g., ANKLET):");
    if (newType && !itemTypes.includes(newType.toUpperCase())) setItemTypes([...itemTypes, newType.toUpperCase()]);
  };

  const handleAddNewName = () => {
    const newName = prompt("Enter new Item Name (e.g., Antique Mala):");
    if (newName && !commonNames.includes(newName)) setCommonNames([...commonNames, newName]);
  };

  const generateBarcode = (row) => {
    if (!row.name || !row.gross_weight) return '';
    const metalCode = row.metal_type === '22K_GOLD' ? '22K' : row.metal_type === '24K_GOLD' ? '24K' : 'SLV';
    const typeCode = row.item_type.substring(0, 3).toUpperCase();
    const weightCode = Math.round(parseFloat(row.gross_weight) * 100) || 0;
    const randomHash = Math.random().toString(36).substring(2, 5).toUpperCase(); 
    return `${metalCode}-${typeCode}-${weightCode}-${randomHash}`;
  };

  const addRow = () => setRows([{ ...defaultRow }, ...rows]); // Add new row to the top
  const removeRow = (index) => { if (rows.length > 1) setRows(rows.filter((_, i) => i !== index)); };

  // --- IMAGE MANAGEMENT ---
  const handleImageUpload = (index, files) => {
    if (files && files.length > 0) {
      const updatedRows = [...rows];
      const fileArray = Array.from(files);
      
      updatedRows[index].image_files = [...updatedRows[index].image_files, ...fileArray];
      updatedRows[index].image_previews = [
          ...updatedRows[index].image_previews, 
          ...fileArray.map(f => URL.createObjectURL(f))
      ];
      setRows(updatedRows);
    }
  };

  const removeImage = (rowIndex, imgIndex) => {
      const updatedRows = [...rows];
      updatedRows[rowIndex].image_files.splice(imgIndex, 1);
      updatedRows[rowIndex].image_previews.splice(imgIndex, 1);
      
      if (updatedRows[rowIndex].primary_image_index === imgIndex) {
          updatedRows[rowIndex].primary_image_index = 0;
      } else if (updatedRows[rowIndex].primary_image_index > imgIndex) {
          updatedRows[rowIndex].primary_image_index--;
      }
      setRows(updatedRows);
  };

  const setPrimaryImage = (rowIndex, imgIndex) => {
      const updatedRows = [...rows];
      updatedRows[rowIndex].primary_image_index = imgIndex;
      setRows(updatedRows);
  };

  // --- MATH & CHANGE LOGIC ---
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === 'net_weight' || field === 'stone_weight') {
      const net = parseFloat(field === 'net_weight' ? value : updatedRows[index].net_weight) || 0;
      const stone = parseFloat(field === 'stone_weight' ? value : updatedRows[index].stone_weight) || 0;
      updatedRows[index].gross_weight = (net + stone).toFixed(3);
    }

    if (['name', 'metal_type', 'net_weight', 'item_type'].includes(field)) {
      updatedRows[index].barcode = generateBarcode(updatedRows[index]);
    }
    setRows(updatedRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = rows.map(row => {
        const formData = new FormData();
        formData.append('sku', row.barcode);
        formData.append('name', row.name);
        formData.append('item_type', row.item_type);
        formData.append('metal_type', row.metal_type);
        formData.append('gross_weight', row.gross_weight);
        formData.append('stone_weight', row.stone_weight || 0);
        formData.append('net_weight', row.net_weight);
        formData.append('description', row.description || `Handcrafted ${row.item_type}...`);
        
        formData.append('purchase_touch_pct', row.purchase_touch_pct);
        formData.append('purchase_mc_type', row.purchase_mc_type);
        formData.append('purchase_mc', row.purchase_mc || 0);
        
        formData.append('retail_price_type', row.retail_price_type);
        formData.append('fixed_price', row.fixed_price || 0);
        formData.append('wastage_pct', row.wastage_pct);
        formData.append('making_charge_type', row.making_charge_type);
        formData.append('making_charge', row.making_charge || 0);
        
        formData.append('stock_quantity', row.stock_quantity);
        
        if (row.image_files && row.image_files.length > 0) {
            const mainFile = row.image_files[row.primary_image_index || 0];
            const otherFiles = row.image_files.filter((_, i) => i !== (row.primary_image_index || 0));
            
            formData.append('images', mainFile);
            otherFiles.forEach(file => formData.append('images', file));
        }
        
        return axios.post('http://localhost:5000/api/products', formData);
      });
      
      await Promise.all(promises);
      alert(`${rows.length} Product(s) saved! ✅`);
      navigate('/products');
    } catch (err) {
      console.error(err);
      alert('Error saving products. Please check for missing data or duplicate SKUs.');
    } finally { setSaving(false); }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 animate-fade-in">
      
      {/* HEADER STICKY BAR */}
      <div className="sticky top-0 z-40 bg-[#faf9f6]/90 backdrop-blur-md pb-4 pt-2 mb-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-gold" /> Bulk Inventory Upload
                </h1>
                <p className="text-gray-500 text-sm mt-1">Smart pricing and auto-calculating ledgers enabled.</p>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={handleAddNewType} className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm">+ New Type</button>
                <button type="button" onClick={handleAddNewName} className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm">+ New Name</button>
                <button type="button" onClick={addRow} className="text-sm font-bold text-black bg-gold border border-gold-dark px-5 py-2 rounded-xl hover:bg-yellow-400 transition shadow-md flex items-center gap-2">
                    <Plus size={18} /> Add Product Block
                </button>
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {rows.map((row, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative group">
            
            {/* CARD HEADER */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{rows.length - index}</span>
                    <h3 className="font-bold text-gray-800 text-lg">{row.name || "Untitled Item"}</h3>
                    {row.barcode && <span className="bg-white border border-gray-200 text-gray-500 text-[10px] px-2 py-1 rounded font-mono shadow-sm">{row.barcode}</span>}
                </div>
                {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition flex items-center gap-1 text-sm font-bold">
                        <Trash2 size={16} /> Remove
                    </button>
                )}
            </div>

            {/* CARD BODY */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: PHOTOS & BASICS (Cols 1-4) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Image Upload Area */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><ImageIcon size={14}/> Product Images</h4>
                        <label className="cursor-pointer block mb-3 group/dropzone">
                            <div className="bg-white border-dashed border-2 border-gray-300 rounded-xl p-6 text-center transition group-hover/dropzone:border-gold group-hover/dropzone:bg-gold/5">
                                <Plus className="mx-auto text-gray-400 mb-2 group-hover/dropzone:text-gold transition" size={24} />
                                <span className="text-sm font-bold text-gray-600 group-hover/dropzone:text-black">Upload Photos</span>
                                <p className="text-[10px] text-gray-400 mt-1">First selected becomes Main Image</p>
                            </div>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files)} />
                        </label>
                        
                        {/* Image Previews */}
                        {row.image_previews.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {row.image_previews.map((src, i) => (
                                    <div key={i} className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition ${row.primary_image_index === i ? 'border-gold shadow-md scale-105' : 'border-gray-200'}`}>
                                        <img src={src} className="w-full h-full object-cover" alt="preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex flex-col justify-between p-1">
                                            <div className="flex justify-between w-full">
                                                <button type="button" onClick={() => setPrimaryImage(index, i)} className={`text-xs p-1 rounded-full ${row.primary_image_index === i ? 'bg-gold text-black' : 'bg-white/20 text-white hover:bg-gold hover:text-black'}`} title="Set as Main">★</button>
                                                <button type="button" onClick={() => removeImage(index, i)} className="text-xs p-1 bg-red-500 text-white rounded-full hover:bg-red-600" title="Delete">✖</button>
                                            </div>
                                        </div>
                                        {row.primary_image_index === i && <div className="absolute bottom-0 left-0 w-full bg-gold text-black text-[9px] font-bold text-center py-0.5 uppercase">Main</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Basic Item Details */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Item Type</label>
                                <select value={row.item_type} onChange={(e) => handleChange(index, 'item_type', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-gold outline-none">
                                    {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Metal</label>
                                <select value={row.metal_type} onChange={(e) => handleChange(index, 'metal_type', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-gold outline-none">
                                    <option value="22K_GOLD">22K Gold</option><option value="24K_GOLD">24K Gold</option><option value="SILVER">Silver</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Item Name</label>
                            <input list={`names-${index}`} placeholder="e.g. Bridal Choker" value={row.name} onChange={(e) => handleChange(index, 'name', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-gold outline-none" />
                            <datalist id={`names-${index}`}>{commonNames.map(name => <option key={name} value={name} />)}</datalist>
                        </div>
                    </div>
                </div>

                {/* MIDDLE: WEIGHTS & INWARD MATH (Cols 5-8) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Weights Block */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Calculator size={14}/> Physical Weights</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Net Weight (g)</label>
                                <input type="number" step="0.001" placeholder="0.000" value={row.net_weight} onChange={(e) => handleChange(index, 'net_weight', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-gold outline-none bg-white" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stone Wt (g)</label>
                                <input type="number" step="0.001" placeholder="0.000" value={row.stone_weight} onChange={(e) => handleChange(index, 'stone_weight', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gold outline-none bg-white" />
                            </div>
                        </div>
                        <div className="bg-white border-2 border-gray-200 border-dashed rounded-lg p-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase">Calculated Gross</span>
                            <span className="text-lg font-bold text-gray-900">{row.gross_weight} <span className="text-sm text-gray-500">g</span></span>
                        </div>
                    </div>

                    {/* Wholesale Block (RED) */}
                    <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Tag size={14}/> Inward Math (Cost)</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">Purchase Touch %</label>
                                <input type="number" step="0.1" value={row.purchase_touch_pct} onChange={(e) => handleChange(index, 'purchase_touch_pct', e.target.value)} className="w-full p-2.5 border border-red-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-red-400 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">MC Mode</label>
                                    <select value={row.purchase_mc_type} onChange={(e) => handleChange(index, 'purchase_mc_type', e.target.value)} className="w-full p-2.5 border border-red-200 rounded-lg text-[11px] font-bold bg-white focus:ring-2 focus:ring-red-400 outline-none">
                                        <option value="PER_GRAM">Per Gram</option><option value="FIXED_PIECE">Fixed Flat</option><option value="BUNDLED_RATE">Bundled /g</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">MC Amount (₹)</label>
                                    <input type="number" placeholder="e.g. 150" value={row.purchase_mc} onChange={(e) => handleChange(index, 'purchase_mc', e.target.value)} className="w-full p-2.5 border border-red-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-red-400 outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: OUTWARD MATH & INVENTORY (Cols 9-12) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Retail Block (GREEN) */}
                    <div className="bg-green-50/50 rounded-xl p-5 border border-green-200 shadow-inner">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={14}/> Outward Math (Sell)</h4>
                            <select value={row.retail_price_type} onChange={(e) => handleChange(index, 'retail_price_type', e.target.value)} className="bg-white border border-green-300 text-green-800 text-[10px] font-bold rounded p-1 outline-none">
                                <option value="DYNAMIC">LIVE DYNAMIC</option>
                                <option value="FIXED">FIXED STICKER</option>
                            </select>
                        </div>

                        {row.retail_price_type === 'DYNAMIC' ? (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-[11px] font-bold text-green-700 uppercase mb-1 flex items-center justify-between">Customer Wastage (VA) % <Info size={12} className="text-green-500 cursor-help" title="AI Negotiator will start here and drop down."/></label>
                                    <input type="number" step="0.1" value={row.wastage_pct} onChange={(e) => handleChange(index, 'wastage_pct', e.target.value)} className="w-full p-2.5 border border-green-300 rounded-lg text-lg font-black text-green-900 bg-white focus:ring-2 focus:ring-green-400 outline-none shadow-sm" />
                                </div>
                                <div className="bg-white/50 p-3 rounded-lg border border-green-100">
                                    <label className="block text-[11px] font-bold text-green-700 uppercase mb-2">Customer Making Charge</label>
                                    <div className="flex gap-2">
                                        <select value={row.making_charge_type} onChange={(e) => handleChange(index, 'making_charge_type', e.target.value)} className="w-1/2 p-2 border border-green-200 rounded text-[11px] font-bold bg-white focus:outline-none">
                                            <option value="FLAT">Flat (₹)</option>
                                            <option value="PER_GRAM">Per Gram (₹)</option>
                                        </select>
                                        <input type="number" placeholder="Amount" value={row.making_charge} onChange={(e) => handleChange(index, 'making_charge', e.target.value)} className="w-1/2 p-2 border border-green-200 rounded text-sm font-bold bg-white focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in py-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-green-700 uppercase mb-2">Fixed Retail Price (₹)</label>
                                    <input type="number" placeholder="e.g. 15000" value={row.fixed_price} onChange={(e) => handleChange(index, 'fixed_price', e.target.value)} className="w-full p-4 border-2 border-green-400 rounded-xl text-2xl font-black text-green-900 bg-white focus:ring-4 focus:ring-green-300 outline-none shadow-inner" />
                                    <p className="text-[10px] text-green-600 mt-2 font-medium">AI will negotiate based on this fixed ceiling, but will never drop below wholesale landing cost.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Inventory Block */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Initial Stock Qty</label>
                        <input type="number" min="1" value={row.stock_quantity} onChange={(e) => handleChange(index, 'stock_quantity', e.target.value)} className="w-24 p-2 border border-gray-300 rounded-lg text-center font-bold text-lg bg-gray-50 focus:bg-white outline-none" />
                    </div>
                </div>

            </div>
          </div>
        ))}

        {/* SUBMIT FOOTER */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8">
                <span className="text-sm font-bold text-gray-500 hidden md:inline-block">You are about to add <span className="text-black">{rows.length}</span> items to your live inventory.</span>
                <button type="submit" disabled={saving} className={`px-10 py-4 rounded-xl font-bold text-lg transition shadow-xl flex items-center gap-2 ${saving ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-black text-gold hover:bg-gray-900 hover:-translate-y-1'}`}>
                    {saving ? <><Loader2 className="animate-spin" size={20}/> Encrypting...</> : `Upload ${rows.length} Product${rows.length > 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;