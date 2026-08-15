import React from 'react';
import { FiSave, FiPrinter, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { settingsAPI } from '../../utils/api';

export default function SettingsPage() {
  const [form, setForm] = React.useState({
    shopName: '',
    telephone: '',
    address: '',
    receiptFooter: '',
    printerName: ''
  });
  const [printers, setPrinters] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testPrinting, setTestPrinting] = React.useState(false);

  React.useEffect(() => {
    loadSettings();
    loadPrinters();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      setForm({
        shopName: data.shopName || '',
        telephone: data.telephone || '',
        address: data.address || '',
        receiptFooter: data.receiptFooter || '',
        printerName: data.printerName || ''
      });
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPrinters = async () => {
    if (window.electronAPI) {
      try {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list);
      } catch (err) {
        // Ignore
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.update(form);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    if (!window.electronAPI) {
      toast.info('Printing is only available in the desktop app');
      return;
    }
    if (!form.printerName) {
      toast.warning('Please select a printer first');
      return;
    }

    setTestPrinting(true);
    try {
      const testSale = {
        invoiceNo: 'TEST-RECEIPT',
        items: [
          { name: 'Test Item 1', quantity: 2, unitPrice: 100.00, discount: 0, lineTotal: 200.00 },
          { name: 'Test Item 2', quantity: 1, unitPrice: 550.00, discount: 50, lineTotal: 500.00 }
        ],
        subtotal: 700.00,
        orderDiscount: 0,
        grandTotal: 700.00,
        cashReceived: 1000.00,
        changeGiven: 300.00,
        createdAt: new Date().toISOString()
      };

      const result = await window.electronAPI.printReceipt({ sale: testSale, settings: form });
      if (result.success) {
        toast.success('Test receipt printed!');
      } else {
        toast.error(`Print failed: ${result.error}`);
      }
    } catch (err) {
      toast.error('Print error: ' + err.message);
    } finally {
      setTestPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" style={{ width: 32, height: 32 }}></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <form onSubmit={handleSave}>
        <div className="settings-grid">
          {/* Shop Information */}
          <div className="settings-section">
            <h3><FiInfo /> Shop Information</h3>

            <div className="form-group">
              <label className="form-label">Shop Name</label>
              <input
                type="text"
                name="shopName"
                className="form-input"
                value={form.shopName}
                onChange={handleChange}
                placeholder="Your shop name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telephone Numbers</label>
              <input
                type="text"
                name="telephone"
                className="form-input"
                value={form.telephone}
                onChange={handleChange}
                placeholder="e.g. 0412286918 / 0714888019"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                name="address"
                className="form-textarea"
                value={form.address}
                onChange={handleChange}
                placeholder="Full shop address"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Footer Message</label>
              <input
                type="text"
                name="receiptFooter"
                className="form-input"
                value={form.receiptFooter}
                onChange={handleChange}
                placeholder="e.g. Thank you for shopping with us!"
              />
            </div>
          </div>

          {/* Printer Settings */}
          <div className="settings-section">
            <h3><FiPrinter /> Printer Settings</h3>

            <div className="form-group">
              <label className="form-label">Thermal Printer</label>
              {printers.length > 0 ? (
                <select
                  name="printerName"
                  className="form-select"
                  value={form.printerName}
                  onChange={handleChange}
                >
                  <option value="">Select a printer...</option>
                  {printers.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    name="printerName"
                    className="form-input"
                    value={form.printerName}
                    onChange={handleChange}
                    placeholder="Enter printer name manually"
                  />
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Printer detection is only available when running in the desktop app.
                    You can manually enter the printer's system name.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestPrint}
              disabled={testPrinting || !form.printerName}
              style={{ width: '100%', marginTop: 8 }}
            >
              {testPrinting ? (
                <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Printing...</>
              ) : (
                <><FiPrinter /> Print Test Receipt</>
              )}
            </button>

            {/* Receipt Preview */}
            <div style={{
              marginTop: 20,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  {'='.repeat(34)}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {form.shopName || 'Shop Name'}
                </div>
                <div>{form.address || 'Shop Address'}</div>
                <div>Tel: {form.telephone || 'Phone Numbers'}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  {'='.repeat(34)}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {`Invoice: INV-XXXXXXXX-0001\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nItem           Qty  Price  Total\n${'─'.repeat(34)}\nSample Item      2   100   200.00\n${'─'.repeat(34)}\nGRAND TOTAL:             200.00\n\nCash:                    500.00\nChange:                  300.00`}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  {'='.repeat(34)}
                </div>
                <div>{form.receiptFooter || 'Thank you!'}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                  {'='.repeat(34)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--border-color)'
        }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? (
              <><span className="loading-spinner" style={{ width: 16, height: 16 }}></span> Saving...</>
            ) : (
              <><FiSave /> Save Settings</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
