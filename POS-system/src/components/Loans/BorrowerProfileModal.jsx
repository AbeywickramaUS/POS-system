import React from 'react';
import {
  FiX, FiUser, FiPhone, FiCreditCard, FiMapPin, FiCalendar,
  FiDollarSign, FiPlus, FiPrinter, FiEdit2, FiCheckCircle,
  FiArrowUpRight, FiArrowDownLeft, FiClock, FiFileText
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { borrowersAPI } from '../../utils/api';
import RecordPaymentModal from './RecordPaymentModal';
import ManualLoanModal from './ManualLoanModal';

export default function BorrowerProfileModal({ borrowerId, onProfileUpdated, onEditBorrower, onClose }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState('all');

  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showLoanModal, setShowLoanModal] = React.useState(false);

  React.useEffect(() => {
    loadProfile();
  }, [borrowerId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await borrowersAPI.getById(borrowerId);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load borrower profile');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRecorded = (res) => {
    setShowPaymentModal(false);
    loadProfile();
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleLoanRecorded = (res) => {
    setShowLoanModal(false);
    loadProfile();
    if (onProfileUpdated) onProfileUpdated();
  };

  const handlePrintStatement = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 850, padding: 40, textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading borrower profile...</p>
        </div>
      </div>
    );
  }

  const { borrower, transactions = [] } = data;

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.type === filterType);

  const availableCredit = borrower.creditLimit > 0
    ? Math.max(0, borrower.creditLimit - borrower.currentBalance)
    : null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ maxWidth: 900, width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--accent-gradient)',
                color: '#fff', fontSize: 20, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}>
                {borrower.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{borrower.name}</h2>
                  <span className={`badge ${
                    borrower.status === 'active' ? 'badge-success' :
                    borrower.status === 'blocked' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {borrower.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
                  {borrower.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiPhone size={13} /> {borrower.phone}
                    </span>
                  )}
                  {borrower.nic && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiCreditCard size={13} /> NIC: {borrower.nic}
                    </span>
                  )}
                  {borrower.address && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiMapPin size={13} /> {borrower.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onEditBorrower && onEditBorrower(borrower)}
                title="Edit Profile"
              >
                <FiEdit2 /> Edit
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handlePrintStatement}
                title="Print Statement"
              >
                <FiPrinter /> Print
              </button>
              <button className="btn btn-icon btn-ghost" onClick={onClose}><FiX /></button>
            </div>
          </div>

          {/* Modal Body / Profile Content */}
          <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

            {/* Financial Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 20
            }}>
              {/* Outstanding Debt */}
              <div style={{
                background: borrower.currentBalance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${borrower.currentBalance > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Outstanding Balance
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: borrower.currentBalance > 0 ? 'var(--danger)' : 'var(--success)',
                  marginTop: 4
                }}>
                  Rs. {borrower.currentBalance.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {borrower.currentBalance > 0 ? 'Pending repayment' : 'All accounts settled'}
                </div>
              </div>

              {/* Total Credit Given */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Borrowed
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  Rs. {borrower.totalCreditGiven.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Lifetime credit purchases
                </div>
              </div>

              {/* Total Repaid */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Repaid
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                  Rs. {borrower.totalPaid.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Lifetime payments made
                </div>
              </div>

              {/* Credit Limit & Remaining */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Credit Limit
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {borrower.creditLimit > 0 ? `Rs. ${borrower.creditLimit.toFixed(2)}` : 'Unlimited'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {availableCredit !== null ? `Available: Rs. ${availableCredit.toFixed(2)}` : 'No restriction'}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div style={{
              display: 'flex',
              gap: 10,
              marginBottom: 20,
              padding: '14px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn btn-success"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={borrower.currentBalance <= 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <FiDollarSign /> Record Repayment
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowLoanModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <FiPlus /> Add Loan / Credit
                </button>
              </div>

              {borrower.notes && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 380, fontStyle: 'italic' }}>
                  <strong>Notes:</strong> {borrower.notes}
                </div>
              )}
            </div>

            {/* Transaction Ledger Table */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiClock /> Transaction History & Ledger ({filteredTransactions.length})
                </h3>

                {/* Filter tags */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Credit Sales', value: 'credit_sale' },
                    { label: 'Repayments', value: 'payment' },
                    { label: 'Manual Loans', value: 'manual_loan' }
                  ].map(tab => (
                    <button
                      key={tab.value}
                      className={`btn btn-sm ${filterType === tab.value ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => setFilterType(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)'
                }}>
                  <FiFileText size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p>No transaction records found for this filter.</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Description / Invoice</th>
                        <th style={{ textAlign: 'right' }}>Debit (+)</th>
                        <th style={{ textAlign: 'right' }}>Credit / Paid (-)</th>
                        <th style={{ textAlign: 'right' }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => {
                        const isDebit = tx.type === 'credit_sale' || tx.type === 'manual_loan';
                        const isCredit = tx.type === 'payment';
                        const dateObj = new Date(tx.date || tx.createdAt);

                        return (
                          <tr key={tx._id}>
                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                              <div>{dateObj.toLocaleDateString('en-GB')}</div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            <td>
                              {tx.type === 'credit_sale' && (
                                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <FiArrowUpRight size={12} /> Credit Sale
                                </span>
                              )}
                              {tx.type === 'payment' && (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <FiArrowDownLeft size={12} /> Repayment
                                </span>
                              )}
                              {tx.type === 'manual_loan' && (
                                <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <FiPlus size={12} /> Manual Loan
                                </span>
                              )}
                              {tx.type === 'adjustment' && (
                                <span className="badge badge-secondary">Adjustment</span>
                              )}
                            </td>

                            <td style={{ fontSize: 13 }}>
                              {tx.invoiceNo && (
                                <div style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
                                  #{tx.invoiceNo}
                                </div>
                              )}
                              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                {tx.notes || (tx.paymentMethod ? `Paid via ${tx.paymentMethod}` : '—')}
                              </div>
                              {tx.reference && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  Ref: {tx.reference}
                                </div>
                              )}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                              {isDebit ? `+Rs. ${tx.amount.toFixed(2)}` : '—'}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                              {isCredit ? `-Rs. ${tx.amount.toFixed(2)}` : '—'}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              Rs. {tx.balanceAfter.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Repayment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          borrower={borrower}
          onPaymentRecorded={handlePaymentRecorded}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Manual Loan Modal */}
      {showLoanModal && (
        <ManualLoanModal
          borrower={borrower}
          onLoanRecorded={handleLoanRecorded}
          onClose={() => setShowLoanModal(false)}
        />
      )}
    </>
  );
}
