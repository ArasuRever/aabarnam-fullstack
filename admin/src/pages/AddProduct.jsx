import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AddProduct = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Dynamic lists
  const [itemTypes, setItemTypes] = useState(['RING', 'CHAIN', 'NECKLACE', 'BANGLES', 'EARRINGS', 'BRACELET', 'HARAM', 'PENDANT']);
  const [commonNames, setCommonNames] = useState(['Bridal Haram', 'Singapore Chain', 'Stone Ring', 'Plain Bangles', 'Temple Necklace']);

  const defaultRow = {
    barcode: '', 
    image_files: [], 
    image_previews: [], 
    name: '',
    description: '', // <--- NEW: Added Description State
    item_type: 'RING',
    metal_type: '22K_GOLD',
    gross_weight: '',
    stone_weight: '0',
    net_weight: '',
    purchase_touch_pct: '91.6', 
    purchase_mc: '0',
    wastage_pct: '12', 
    making_charge_type: 'FLAT',
    making_charge: '1500', 
    stock_quantity: '1'
  };

  const [rows, setRows] = useState([defaultRow]);

  const handleAddNewType = () => {
    const newType = prompt("Enter new Item Type (e.g., ANKLET):");
    if (newType && !itemTypes.includes(newType.toUpperCase())) {
      setItemTypes([...itemTypes, newType.toUpperCase()]);
    }
  };

  const handleAddNewName = () => {
    const newName = prompt("Enter new Item Name (e.g., Antique Mala):");
    if (newName && !commonNames.includes(newName)) {
      setCommonNames([...commonNames, newName]);
    }
  };

  const generateBarcode = (row) => {
    if (!row.name || !row.gross_weight) return '';
    const metalCode = row.metal_type === '22K_GOLD' ? '22K' : row.metal_type === '24K_GOLD' ? '24K' : 'SLV';
    const typeCode = row.item_type.substring(0, 3).toUpperCase();
    const weightCode = Math.round(parseFloat(row.gross_weight) * 100);
    const randomHash = Math.random().toString(36).substring(2, 5).toUpperCase(); 
    return `${metalCode}-${typeCode}-${weightCode}-${randomHash}`;
  };

  const addRow = () => setRows([...rows, defaultRow]);
  const removeRow = (index) => { if (rows.length > 1) setRows(rows.filter((_, i) => i !== index)); };

  const handleImageUpload = (index, files) => {
    if (files && files.length > 0) {
      const updatedRows = [...rows];
      const fileArray = Array.from(files);
      updatedRows[index].image_files = fileArray;
      updatedRows[index].image_previews = fileArray.map(file => URL.createObjectURL(file));
      setRows(updatedRows);
    }
  };

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === 'gross_weight' || field === 'stone_weight') {
      const gross = parseFloat(updatedRows[index].gross_weight) || 0;
      const stone = parseFloat(updatedRows[index].stone_weight) || 0;
      updatedRows[index].net_weight = (gross - stone).toFixed(3);
    }

    if (['name', 'metal_type', 'gross_weight', 'item_type'].includes(field)) {
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
        formData.append('stone_weight', row.stone_weight);
        formData.append('net_weight', row.net_weight);
        formData.append('making_charge_type', row.making_charge_type);
        formData.append('making_charge', row.making_charge);
        formData.append('wastage_pct', row.wastage_pct);
        formData.append('description', row.description || `Handcrafted ${row.item_type}...`);
        
        // NEW: Send Wholesale Data
        formData.append('purchase_touch_pct', row.purchase_touch_pct);
        formData.append('purchase_mc', row.purchase_mc);
        // If you added purchase_type to state, add it here too
        
        if (row.image_files && row.image_files.length > 0) {
            row.image_files.forEach(file => { formData.append('images', file); });
        }
        return axios.post('http://localhost:5000/api/products', formData);
      });
      await Promise.all(promises);
      alert(`${rows.length} Product(s) saved! ✅`);
      navigate('/products');
    } catch (err) {
      console.error(err);
      alert('Error saving products. Duplicate SKU detected or missing data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Batch Stock Entry</h1>
          <p className="text-gray-500 text-sm">Multi-image support enabled.</p>
        </div>
        <div className="flex gap-2">
            <button type="button" onClick={handleAddNewType} className="bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-bold border border-blue-200">+ New Type</button>
            <button type="button" onClick={handleAddNewName} className="bg-green-50 text-green-700 px-3 py-2 rounded text-xs font-bold border border-green-200">+ New Name</button>
            <button type="button" onClick={addRow} className="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-black transition">+ Add Row</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-sm font-bold text-gray-700 w-64">Photos</th>
                <th className="p-3 text-sm font-bold text-gray-700 w-64">Item Details</th> {/* Widened column for description */}
                <th className="p-3 text-sm font-bold text-gray-700">Barcode / SKU</th>
                <th className="p-3 text-sm">Metal</th>
                <th className="p-3 text-sm">Weights (g)</th>
                <th className="p-3 text-sm bg-blue-50 text-blue-800">Pricing</th>
                <th className="p-3 text-sm">Qty</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 align-top">
                  <td className="p-2">
                    <label className="cursor-pointer block mb-2">
                      <div className="bg-gray-100 border-dashed border-2 border-gray-300 rounded p-3 text-center text-xs hover:bg-gray-200 text-gray-500">
                         {row.image_files.length > 0 ? `${row.image_files.length} Files` : '📸 Upload Photos'}
                      </div>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files)} />
                    </label>
                    <div className="flex gap-1 overflow-x-auto">
                        {row.image_previews.map((src, i) => (
                            <img key={i} src={src} className="w-12 h-12 object-cover rounded border" alt="preview" />
                        ))}
                    </div>
                  </td>

                  <td className="p-2 space-y-2">
                    <select value={row.item_type} onChange={(e) => handleChange(index, 'item_type', e.target.value)} className="w-full p-2 border rounded text-xs font-bold bg-white">
                      {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input 
                      list={`names-${index}`} 
                      placeholder="Name..." 
                      value={row.name} 
                      onChange={(e) => handleChange(index, 'name', e.target.value)} 
                      className="w-full p-2 border rounded text-sm font-bold" 
                    />
                    <datalist id={`names-${index}`}>
                      {commonNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                    {/* NEW: Description Input Field */}
                    <textarea 
                      placeholder="Custom description (optional)" 
                      value={row.description} 
                      onChange={(e) => handleChange(index, 'description', e.target.value)} 
                      className="w-full p-2 border rounded text-xs text-gray-600 bg-gray-50 outline-none focus:bg-white"
                      rows="2"
                    ></textarea>
                  </td>

                  <td className="p-2">
                    <input 
                      value={row.barcode} 
                      onChange={(e) => handleChange(index, 'barcode', e.target.value)} 
                      className="w-full p-2 bg-white border rounded text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500" 
                      placeholder="SKU"
                    />
                  </td>
                  
                  <td className="p-2">
                    <select value={row.metal_type} onChange={(e) => handleChange(index, 'metal_type', e.target.value)} className="w-full p-2 border rounded text-xs">
                      <option value="22K_GOLD">22K</option>
                      <option value="SILVER">Silver</option>
                    </select>
                  </td>
                  
                  <td className="p-2 space-y-1">
                      <input type="number" step="0.001" placeholder="Gross" value={row.gross_weight} onChange={(e) => handleChange(index, 'gross_weight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                      <input type="number" step="0.001" placeholder="Stone" value={row.stone_weight} onChange={(e) => handleChange(index, 'stone_weight', e.target.value)} className="w-full p-1 border rounded text-xs" />
                      <div className="text-xs font-bold text-green-700">Net: {row.net_weight}</div>
                  </td>

                  <td className="p-2 bg-blue-50 space-y-1">
                      <div className="flex items-center text-xs"><span className="w-8">Wst%</span><input type="number" step="0.1" value={row.wastage_pct} onChange={(e) => handleChange(index, 'wastage_pct', e.target.value)} className="w-full p-1 border rounded" /></div>
                      <div className="flex items-center text-xs"><span className="w-8">MC₹</span><input type="number" value={row.making_charge} onChange={(e) => handleChange(index, 'making_charge', e.target.value)} className="w-full p-1 border rounded" /></div>
                  </td>
                  
                  <td className="p-2 w-16"><input type="number" value={row.stock_quantity} onChange={(e) => handleChange(index, 'stock_quantity', e.target.value)} className="w-full p-2 border rounded text-sm" /></td>
                  <td className="p-2 text-center"><button type="button" onClick={() => removeRow(index)} className="text-red-500 font-bold text-xl">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} className={`px-8 py-3 rounded font-bold text-white transition ${saving ? 'bg-gray-400' : 'bg-black text-gold hover:bg-gray-800'}`}>
            {saving ? 'Saving...' : `Save ${rows.length} Items`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;