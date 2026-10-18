import React from 'react';
import { FiX, FiUser, FiPhone, FiCreditCard, FiMapPin, FiFileText } from 'react-icons/fi';

const defaultForm = () => ({
  name: '',
  phone: '',
  nic: '',
  address: '',
  creditLimit: '',
  initialBalance: '',
  notes: '',
  status: 'active'
});

export default function BorrowerFormModal({ borrower, onSave, onClose }) {
  const [form, setForm] = React.useState(() => {
    if (borrower) {
      return {
        name: borrower.name || '',
        phone: borrower.phone || '',
        nic: borrower.nic || '',
        address: borrower.address || '',
        creditLimit: borrower.creditLimit > 0 ? borrower.creditLimit.toString() : '',
        initialBalance: '',
        notes: borrower.notes || '',
        status: borrower.status || 'active'
      };
    }
    return defaultForm();
  });

  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef(null);

  React.useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Borrower / Customer name is required';
    if (form.creditLimit !== '' && parseFloat(form.creditLimit) < 0) {
      errs.creditLimit = 'Credit limit cannot be negative';
    }
    if (form.initialBalance !== '' && parseFloat(form.initialBalance) < 0) {
      errs.initialBalance = 'Initial balance cannot be negative';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        nic: form.nic.trim(),
        address: form.address.trim(),
        creditLimit: form.creditLimit !== '' ? parseFloat(form.creditLimit) : 0,
        notes: form.notes.trim(),
        status: form.status
      };
      if (!borrower && form.initialBalance !== '') {
        payload.initialBalance = parseFloat(form.initialBalance) || 0;
      }
      await onSave(payload);
    } catch {
      // Error handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-glow)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiUser size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>
                {borrower ? 'Edit Borrower Profile' : 'New Borrower / Credit Profile'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {borrower ? 'Update customer information' : 'Create a separate ledger profile for credit sales'}
              </p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Borrower Name */}
            <div className="form-group">
              <label className="form-label">Customer / Borrower Full Name *</label>
              <div style={{ position: 'relative' }}>
                <FiUser style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  ref={nameRef}
                  type="text"
                  name="name"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="e.g. S.K. Perera"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            {/* Phone & NIC */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <FiPhone style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="phone"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="07X XXX XXXX"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NIC / ID Number</label>
                <div style={{ position: 'relative' }}>
                  <FiCreditCard style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="nic"
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="e.g. 199012345678"
                    value={form.nic}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">Address / Village</label>
              <div style={{ position: 'relative' }}>
                <FiMapPin style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Street / Town / Location"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Credit Limit & Initial Balance */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Credit Limit (Rs.)
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                    (0 for unlimited)
                  </span>
                </label>
                <input
                  type="number"
                  name="creditLimit"
                  className="form-input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={handleChange}
                />
                {errors.creditLimit && <div className="form-error">{errors.creditLimit}</div>}
              </div>

              {!borrower ? (
                <div className="form-group">
                  <label className="form-label">
                    Opening Debt (Rs.)
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      (Previous balance if any)
                    </span>
                  </label>
                  <input
                    type="number"
                    name="initialBalance"
                    className="form-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.initialBalance}
                    onChange={handleChange}
                  />
                  {errors.initialBalance && <div className="form-error">{errors.initialBalance}</div>}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active (Can take credit)</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked (No credit allowed)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes / Remarks</label>
              <div style={{ position: 'relative' }}>
                <FiFileText style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <textarea
                  name="notes"
                  className="form-input"
                  style={{ paddingLeft: 36, minHeight: 60, resize: 'vertical' }}
                  placeholder="Customer details, guarantor info, repayment habits..."
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : borrower ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
