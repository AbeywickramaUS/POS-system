import React from 'react';
import { FiX } from 'react-icons/fi';

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'pack', 'box', 'dozen'];

const emptyForm = {
  name: '',
  barcode: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  stock: '',
  lowStockThreshold: '10',
  unit: 'pcs'
};

export default function ProductFormModal({ product, categories, onSave, onClose }) {
  const [form, setForm] = React.useState(emptyForm);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef(null);

  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        barcode: product.barcode || '',
        category: product.category || '',
        costPrice: product.costPrice?.toString() || '',
        sellingPrice: product.sellingPrice?.toString() || '',
        stock: product.stock?.toString() || '0',
        lowStockThreshold: product.lowStockThreshold?.toString() || '10',
        unit: product.unit || 'pcs'
      });
    }
    // Focus name field
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.costPrice || parseFloat(form.costPrice) < 0) errs.costPrice = 'Valid cost price is required';
    if (!form.sellingPrice || parseFloat(form.sellingPrice) < 0) errs.sellingPrice = 'Valid selling price is required';
    if (form.stock !== '' && parseFloat(form.stock) < 0) errs.stock = 'Stock cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        category: form.category.trim() || 'General',
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        stock: parseInt(form.stock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
        unit: form.unit
      });
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Basmati Rice 5kg"
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input
                  type="text"
                  name="barcode"
                  className="form-input"
                  placeholder="Scan or enter barcode"
                  value={form.barcode}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  name="category"
                  className="form-input"
                  placeholder="e.g. Groceries"
                  value={form.category}
                  onChange={handleChange}
                  list="category-list"
                />
                <datalist id="category-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cost Price (Rs.) *</label>
                <input
                  type="number"
                  name="costPrice"
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={handleChange}
                />
                {errors.costPrice && <div className="form-error">{errors.costPrice}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (Rs.) *</label>
                <input
                  type="number"
                  name="sellingPrice"
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.sellingPrice}
                  onChange={handleChange}
                />
                {errors.sellingPrice && <div className="form-error">{errors.sellingPrice}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Current Stock</label>
                <input
                  type="number"
                  name="stock"
                  className="form-input"
                  placeholder="0"
                  min="0"
                  value={form.stock}
                  onChange={handleChange}
                />
                {errors.stock && <div className="form-error">{errors.stock}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  className="form-input"
                  placeholder="10"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unit</label>
              <select
                name="unit"
                className="form-select"
                value={form.unit}
                onChange={handleChange}
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Saving...</>
              ) : (
                product ? 'Update Product' : 'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
