import React from 'react';
import { FiX, FiInfo } from 'react-icons/fi';

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'pack', 'box', 'dozen', 'lb'];
const DECIMAL_UNITS = ['kg', 'g', 'litre', 'ml', 'lb'];

const defaultForm = () => ({
  name: '',
  barcode: '',
  category: '',
  costPrice: '',
  sellingPrice: '',
  stock: '',
  lowStockThreshold: '10',
  unit: 'pcs',
  allowDecimal: false
});

export default function ProductFormModal({ product, categories, prefillBarcode, onSave, onClose }) {
  const [form, setForm] = React.useState(() => {
    const f = defaultForm();
    if (prefillBarcode) f.barcode = prefillBarcode;
    return f;
  });
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef(null);

  // Populate form when editing an existing product
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
        unit: product.unit || 'pcs',
        allowDecimal: product.allowDecimal ?? false
      });
    }
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // When unit changes to a weight/volume unit, auto-tick allowDecimal
  const handleUnitChange = (e) => {
    const unit = e.target.value;
    setForm(prev => ({
      ...prev,
      unit,
      allowDecimal: DECIMAL_UNITS.includes(unit) ? true : prev.allowDecimal
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.costPrice === '' || parseFloat(form.costPrice) < 0) errs.costPrice = 'Valid cost price is required';
    if (form.sellingPrice === '' || parseFloat(form.sellingPrice) < 0) errs.sellingPrice = 'Valid selling price is required';
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
        stock: parseFloat(form.stock) || 0,
        lowStockThreshold: parseFloat(form.lowStockThreshold) || 10,
        unit: form.unit,
        allowDecimal: form.allowDecimal
      });
    } catch {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input ref={nameRef} type="text" name="name" className="form-input"
                placeholder="e.g. Basmati Rice" value={form.name} onChange={handleChange} />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            {/* Barcode + Category */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input type="text" name="barcode" className="form-input"
                  placeholder="Scan or enter barcode" value={form.barcode} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" name="category" className="form-input"
                  placeholder="e.g. Groceries" value={form.category} onChange={handleChange} list="cat-list" />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            {/* Unit + Allow Decimal toggle */}
            <div className="form-row" style={{ alignItems: 'flex-start' }}>
              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select name="unit" className="form-select" value={form.unit} onChange={handleUnitChange}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Type</label>
                <div
                  onClick={() => setForm(prev => ({ ...prev, allowDecimal: !prev.allowDecimal }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    background: form.allowDecimal ? 'rgba(79,70,229,0.12)' : 'var(--bg-input)',
                    border: `1.5px solid ${form.allowDecimal ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 150ms'
                  }}
                >
                  {/* Visual toggle switch */}
                  <div style={{
                    width: 36,
                    height: 20,
                    borderRadius: 20,
                    background: form.allowDecimal ? 'var(--accent-primary)' : 'var(--bg-card)',
                    border: `1px solid ${form.allowDecimal ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 200ms'
                  }}>
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: 2,
                      left: form.allowDecimal ? 18 : 2,
                      transition: 'left 200ms',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.allowDecimal ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                      {form.allowDecimal ? 'Custom Quantity (by weight/volume)' : 'Fixed Quantity (whole units)'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {form.allowDecimal
                        ? `Sell any amount: 100g, 0.5${form.unit}, 1.25${form.unit}...`
                        : 'Sell in whole units only: 1, 2, 3...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info banner */}
            {form.allowDecimal && (
              <div style={{
                display: 'flex', gap: 10, padding: '10px 14px',
                background: 'var(--info-bg)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 12,
                color: 'var(--text-secondary)', lineHeight: 1.6
              }}>
                <FiInfo style={{ flexShrink: 0, marginTop: 2, color: 'var(--info)' }} />
                <span>
                  <strong style={{ color: 'var(--info)' }}>Custom quantity enabled.</strong>{' '}
                  Set <strong>price per {form.unit}</strong> below. At sale time, cashier enters
                  any amount (e.g. 0.5 {form.unit}, 1.25 {form.unit}) and the total is auto-calculated.
                  Stock is deducted by the exact quantity sold.
                </span>
              </div>
            )}

            {/* Prices */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Cost Price (Rs.){form.allowDecimal && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {form.unit}</span>} *
                </label>
                <input type="number" name="costPrice" className="form-input"
                  placeholder="0.00" step="0.01" min="0"
                  value={form.costPrice} onChange={handleChange} />
                {errors.costPrice && <div className="form-error">{errors.costPrice}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Selling Price (Rs.){form.allowDecimal && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {form.unit}</span>} *
                </label>
                <input type="number" name="sellingPrice" className="form-input"
                  placeholder="0.00" step="0.01" min="0"
                  value={form.sellingPrice} onChange={handleChange} />
                {errors.sellingPrice && <div className="form-error">{errors.sellingPrice}</div>}
              </div>
            </div>

            {/* Stock + Threshold */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Current Stock ({form.unit})</label>
                <input type="number" name="stock" className="form-input"
                  placeholder="0" min="0" step={form.allowDecimal ? '0.001' : '1'}
                  value={form.stock} onChange={handleChange} />
                {errors.stock && <div className="form-error">{errors.stock}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert ({form.unit})</label>
                <input type="number" name="lowStockThreshold" className="form-input"
                  placeholder="10" min="0" step={form.allowDecimal ? '0.001' : '1'}
                  value={form.lowStockThreshold} onChange={handleChange} />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Saving...</>
                : product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
