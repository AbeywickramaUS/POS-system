import React from 'react';
import { FiX, FiPlus, FiAlertCircle, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { borrowersAPI } from '../../utils/api';

export default function ManualLoanModal({ borrower, onLoanRecorded, onClose }) {
  const [amount, setAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  const amountRef = React.useRef(null);

  React.useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const currentBalance = borrower?.currentBalance || 0;
  const creditLimit = borrower?.creditLimit || 0;
  const newBalance = currentBalance + numAmount;
  const exceedsLimit = creditLimit > 0 && newBalance > creditLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      toast.error('Please enter a valid loan/credit amount');
      return;
    }

    if (exceedsLimit) {
      toast.error(`Exceeds credit limit of Rs. ${creditLimit.toFixed(2)}`);
      return;
    }

    setSaving(true);
    try {
      const res = await borrowersAPI.recordManualLoan(borrower._id, {
        amount: numAmount,
        notes: notes.trim(),
        date
      });
      toast.success(`Credit of Rs. ${numAmount.toFixed(2)} added to ${borrower.name}`);
      onLoanRecorded(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record loan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiPlus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Add Loan / Debt Entry</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {borrower?.name}
              </p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Current Balance / Limits */}
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Debt</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>
                  Rs. {currentBalance.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Credit Limit</span>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {creditLimit > 0 ? `Rs. ${creditLimit.toFixed(2)}` : 'Unlimited'}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Loan / Credit Amount (Rs.) *</label>
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

            {exceedsLimit && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--danger-bg)', color: 'var(--danger)',
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, marginBottom: 16
              }}>
                <FiAlertCircle />
                <span>Total debt (Rs. {newBalance.toFixed(2)}) will exceed limit (Rs. {creditLimit.toFixed(2)})</span>
              </div>
            )}

            {/* Date */}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Reason / Notes */}
            <div className="form-group">
              <label className="form-label">Description / Reason *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Cash loan / manual credit advance"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={saving || !amount || numAmount <= 0 || exceedsLimit}
            >
              {saving ? 'Saving...' : <><FiPlus /> Add Rs. {numAmount > 0 ? numAmount.toFixed(2) : '0.00'} to Debt</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
