import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AddProduct = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const defaultRow = {
    barcode: '', 
    image_preview: null, // NEW: For showing the uploaded photo
    name: '',
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

  const generateBarcode = (row) => {
    if (!row.name || !row.gross_weight) return '';
    const metalCode = row.metal_type === '22K_GOLD' ? '22K' : row.metal_type === '24K_GOLD' ? '24K' : 'SLV';
    const nameCode = row.name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const weightCode = Math.round(parseFloat(row.gross_weight) * 100);
    return `${metalCode}-${nameCode}-${weightCode}`;
  };

  const addRow = () => setRows([...rows, defaultRow]);

  const removeRow = (index) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  // NEW: Handle Image Upload & Preview
  const handleImageUpload = (index, file) => {
    if (file) {
      const updatedRows = [...rows];
      updatedRows[index].image_file = file;
      updatedRows[index].image_preview = URL.createObjectURL(file); // Create local preview
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

    if (['name', 'metal_type', 'gross_weight'].includes(field)) {
      updatedRows[index].barcode = generateBarcode(updatedRows[index]);
    }

    setRows(updatedRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const promises = rows.map(row => 
        axios.post('http://localhost:5000/api/products', {
          ...row,
          sku: row.barcode,
          // For now, using a placeholder if no image, we will connect real storage next!
          main_image_url: row.image_preview || 'https://via.placeholder.com/500', 
          description: 'Premium jewelry piece.'
        })
      );

      await Promise.all(promises);
      alert(`${rows.length} Product(s) successfully added! ✅`);
      navigate('/products');
    } catch (err) {
      alert('Error adding products. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Batch Stock Entry</h1>
          <p className="text-gray-500 text-sm">Upload a photo for each item to complete the entry.</p>
        </div>
        <button onClick={addRow} className="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-black transition">+ Add Row</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-sm font-bold text-gray-700">Photo</th> {/* NEW COLUMN */}
                <th className="p-3 text-sm font-bold text-gray-700">Auto-Barcode</th>
                <th className="p-3 text-sm">Name</th>
                <th className="p-3 text-sm">Metal</th>
                <th className="p-3 text-sm">Gross Wt</th>
                <th className="p-3 text-sm bg-yellow-50 text-yellow-800">Touch %</th>
                <th className="p-3 text-sm bg-blue-50 text-blue-800">Wastage %</th>
                <th className="p-3 text-sm bg-blue-50 text-blue-800">Retail MC ₹</th>
                <th className="p-3 text-sm">Qty</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  
                  {/* IMAGE UPLOAD COLUMN */}
                  <td className="p-2 w-20">
                    <label className="cursor-pointer">
                      {row.image_preview ? (
                        <img src={row.image_preview} alt="preview" className="w-12 h-12 object-cover rounded border" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 border-2 border-dashed border-gray-400 rounded flex items-center justify-center text-xs text-gray-500 hover:bg-gray-300">
                          + Pic
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                    </label>
                  </td>

                  <td className="p-2"><input readOnly value={row.barcode} className="w-full p-2 bg-gray-200 border rounded text-xs font-mono font-bold" /></td>
                  <td className="p-2"><input required placeholder="Name" value={row.name} onChange={(e) => handleChange(index, 'name', e.target.value)} className="w-full p-2 border rounded text-sm" /></td>
                  <td className="p-2">
                    <select value={row.metal_type} onChange={(e) => handleChange(index, 'metal_type', e.target.value)} className="w-full p-2 border rounded text-sm">
                      <option value="22K_GOLD">22K Gold</option>
                      <option value="SILVER">Silver</option>
                    </select>
                  </td>
                  <td className="p-2"><input type="number" step="0.001" placeholder="g" value={row.gross_weight} onChange={(e) => handleChange(index, 'gross_weight', e.target.value)} className="w-full p-2 border rounded text-sm" /></td>
                  <td className="p-2 bg-yellow-50"><input type="number" step="0.1" value={row.purchase_touch_pct} onChange={(e) => handleChange(index, 'purchase_touch_pct', e.target.value)} className="w-full p-2 border border-yellow-200 rounded text-sm" /></td>
                  <td className="p-2 bg-blue-50"><input type="number" step="0.1" value={row.wastage_pct} onChange={(e) => handleChange(index, 'wastage_pct', e.target.value)} className="w-full p-2 border border-blue-200 rounded text-sm" /></td>
                  <td className="p-2 bg-blue-50"><input type="number" value={row.making_charge} onChange={(e) => handleChange(index, 'making_charge', e.target.value)} className="w-full p-2 border border-blue-200 rounded text-sm" /></td>
                  <td className="p-2 w-16"><input type="number" value={row.stock_quantity} onChange={(e) => handleChange(index, 'stock_quantity', e.target.value)} className="w-full p-2 border rounded text-sm" /></td>
                  <td className="p-2 text-center"><button type="button" onClick={() => removeRow(index)} className="text-red-500 font-bold">X</button></td>
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