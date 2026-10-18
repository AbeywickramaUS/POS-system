import React from 'react';
import { FiX, FiDollarSign, FiCheck, FiCalendar, FiCreditCard, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { borrowersAPI } from '../../utils/api';

export default function RecordPaymentModal({ borrower, onPaymentRecorded, onClose }) {
  const [amount, setAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('cash');
  const [reference, setReference] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const amountRef = React.useRef(null);

  React.useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const currentBalance = borrower?.currentBalance || 0;
  const newBalance = Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setSaving(true);
    try {
      const res = await borrowersAPI.recordPayment(borrower._id, {
        amount: numAmount,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
        date
      });
      toast.success(`Payment of Rs. ${numAmount.toFixed(2)} recorded for ${borrower.name}`);
      onPaymentRecorded(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiDollarSign size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Record Repayment</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {borrower?.name} {borrower?.phone ? `(${borrower.phone})` : ''}
              </p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Current Balance Display */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Debt Balance</span>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                  Rs. {currentBalance.toFixed(2)}
                </div>
              </div>

              {numAmount > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Remaining Balance</span>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: newBalance === 0 ? 'var(--success)' : 'var(--warning)'
                  }}>
                    Rs. {newBalance.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Amount input */}
            <div className="form-group">
              <label className="form-label">Payment Amount (Rs.) *</label>
              <input
                ref={amountRef}
                type="number"
                className="form-input"
                style={{ fontSize: 20, fontWeight: 700, textAlign: 'right', padding: '12px 14px' }}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Quick amount shortcuts */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {currentBalance > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontWeight: 600, color: 'var(--success)' }}
                  onClick={() => setAmount(currentBalance.toString())}
                >
                  Pay Full (Rs. {currentBalance.toFixed(2)})
                </button>
              )}
              {currentBalance > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAmount((Math.round(currentBalance / 2)).toString())}
                >
                  Half (Rs. {(Math.round(currentBalance / 2)).toFixed(2)})
                </button>
              )}
              {[500, 1000, 2000, 5000].map(v => (
                <button
                  key={v}
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAmount(v.toString())}
                >
                  Rs. {v}
                </button>
              ))}
            </div>

            {/* Payment Method & Date */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Reference */}
            <div className="form-group">
              <label className="form-label">Reference / Receipt / Cheque No.</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. REC-1029 or Bank slip ID"
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Remarks / Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Paid weekly installment"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={saving || !amount || numAmount <= 0}
            >
              {saving ? 'Processing...' : <><FiCheck /> Confirm Payment (Rs. {numAmount > 0 ? numAmount.toFixed(2) : '0.00'})</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
