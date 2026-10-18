import React from 'react';
import {
  FiUsers, FiDollarSign, FiPlus, FiSearch, FiPhone, FiCreditCard,
  FiTrash2, FiEdit2, FiEye, FiCheckCircle, FiAlertCircle, FiArrowUpRight,
  FiRefreshCw, FiChevronLeft, FiChevronRight, FiFilter
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { borrowersAPI } from '../../utils/api';
import BorrowerFormModal from './BorrowerFormModal';
import BorrowerProfileModal from './BorrowerProfileModal';
import RecordPaymentModal from './RecordPaymentModal';

export default function LoansPage() {
  const [borrowers, setBorrowers] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Filters & Search
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all'); // 'all', 'hasBalance', 'settled'
  const [sortBy, setSortBy] = React.useState('balanceDesc'); // 'balanceDesc', 'name', 'balanceAsc', 'recent'

  // Modals state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingBorrower, setEditingBorrower] = React.useState(null);
  const [viewingBorrowerId, setViewingBorrowerId] = React.useState(null);
  const [paymentBorrower, setPaymentBorrower] = React.useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    loadBorrowers();
  }, [page, filter, sortBy]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadBorrowers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBorrowers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        filter,
        sortBy
      };
      const { data } = await borrowersAPI.getAll(params);
      setBorrowers(data.borrowers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to load borrowers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBorrower = async (formData) => {
    try {
      if (editingBorrower) {
        await borrowersAPI.update(editingBorrower._id, formData);
        toast.success(`Profile for "${formData.name}" updated`);
      } else {
        await borrowersAPI.create(formData);
        toast.success(`Borrower "${formData.name}" created successfully`);
      }
      setShowAddModal(false);
      setEditingBorrower(null);
      loadBorrowers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save borrower profile');
      throw err;
    }
  };

  const handleDeleteConfirm = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await borrowersAPI.delete(deleteTarget._id, { force });
      toast.success(`Borrower "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      if (viewingBorrowerId === deleteTarget._id) {
        setViewingBorrowerId(null);
      }
      loadBorrowers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete borrower');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Top Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {/* Total Outstanding Loan Balance */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Outstanding Debt
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiDollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)', marginTop: 8 }}>
            Rs. {(stats?.totalOutstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Owed across {stats?.activeDebtors || 0} active borrower{stats?.activeDebtors !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Registered Borrowers */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Borrowers
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-glow)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiUsers size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
            {stats?.totalBorrowers || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Registered credit profiles
          </div>
        </div>

        {/* Total Repayments Collected */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Repayments Collected
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FiCheckCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)', marginTop: 8 }}>
            Rs. {(stats?.totalRepayments || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Total debt settled by customers
          </div>
        </div>
      </div>

      {/* Main Section Card: Search, Filters, and Table */}
      <div className="card" style={{ padding: 0 }}>

        {/* Toolbar Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          {/* Search bar */}
          <div className="search-bar" style={{ flex: '1 1 300px', maxWidth: 420 }}>
            <FiSearch className="icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, phone, or NIC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Filter tabs & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-md)' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'hasBalance', label: 'With Debt' },
                { id: 'settled', label: 'Settled' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`btn btn-sm ${filter === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { setFilter(tab.id); setPage(1); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 13, padding: '7px 12px' }}
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="balanceDesc">Highest Debt First</option>
              <option value="balanceAsc">Lowest Debt First</option>
              <option value="name">Name (A-Z)</option>
              <option value="recent">Recently Updated</option>
            </select>

            <button
              className="btn btn-primary"
              onClick={() => { setEditingBorrower(null); setShowAddModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiPlus /> New Borrower Profile
            </button>
          </div>
        </div>

        {/* Borrowers Table */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading borrowers...</p>
          </div>
        ) : borrowers.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <FiUsers className="icon" />
            <h3>No borrowers found</h3>
            <p>{search ? 'Try modifying your search query or filters' : 'Add credit customer profiles to manage loans and track ledger debt.'}</p>
            {!search && (
              <button
                className="btn btn-primary"
                onClick={() => { setEditingBorrower(null); setShowAddModal(true); }}
                style={{ marginTop: 12 }}
              >
                <FiPlus /> Create First Borrower Profile
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact / Phone</th>
                  <th>NIC / ID</th>
                  <th style={{ textAlign: 'right' }}>Credit Limit</th>
                  <th style={{ textAlign: 'right' }}>Current Balance</th>
                  <th style={{ textAlign: 'right' }}>Total Borrowed</th>
                  <th style={{ textAlign: 'right' }}>Total Repaid</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.map((b) => {
                  const hasDebt = b.currentBalance > 0;
                  return (
                    <tr key={b._id} style={{ cursor: 'pointer' }} onClick={() => setViewingBorrowerId(b._id)}>
                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: hasDebt ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: hasDebt ? 'var(--danger)' : 'var(--success)',
                            fontWeight: 700, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {b.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                            {b.address && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.address}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {b.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <FiPhone size={12} style={{ color: 'var(--text-muted)' }} /> {b.phone}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* NIC */}
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {b.nic || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      {/* Credit Limit */}
                      <td style={{ textAlign: 'right', fontSize: 13 }}>
                        {b.creditLimit > 0 ? `Rs. ${b.creditLimit.toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>Unlimited</span>}
                      </td>

                      {/* Current Balance */}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: 14,
                          background: hasDebt ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: hasDebt ? 'var(--danger)' : 'var(--success)'
                        }}>
                          Rs. {b.currentBalance.toFixed(2)}
                        </span>
                      </td>

                      {/* Total Borrowed */}
                      <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
                        Rs. {b.totalCreditGiven.toFixed(2)}
                      </td>

                      {/* Total Repaid */}
                      <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--success)' }}>
                        Rs. {b.totalPaid.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${
                          b.status === 'active' ? 'badge-success' :
                          b.status === 'blocked' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            title="View Profile & Ledger"
                            onClick={() => setViewingBorrowerId(b._id)}
                          >
                            <FiEye /> Profile
                          </button>

                          {hasDebt && (
                            <button
                              className="btn btn-sm btn-success"
                              title="Record Payment"
                              onClick={() => setPaymentBorrower(b)}
                            >
                              <FiDollarSign /> Pay
                            </button>
                          )}

                          <button
                            className="btn btn-icon btn-ghost"
                            title="Edit Borrower"
                            onClick={() => { setEditingBorrower(b); setShowAddModal(true); }}
                          >
                            <FiEdit2 size={14} />
                          </button>

                          <button
                            className="btn btn-icon btn-ghost text-danger"
                            title="Delete Borrower"
                            onClick={() => setDeleteTarget(b)}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} borrowers
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <FiChevronLeft /> Previous
              </button>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Profile Modal */}
      {(showAddModal || editingBorrower) && (
        <BorrowerFormModal
          borrower={editingBorrower}
          onSave={handleSaveBorrower}
          onClose={() => { setShowAddModal(false); setEditingBorrower(null); }}
        />
      )}

      {/* Profile & Ledger Detail Modal */}
      {viewingBorrowerId && (
        <BorrowerProfileModal
          borrowerId={viewingBorrowerId}
          onProfileUpdated={loadBorrowers}
          onEditBorrower={(b) => {
            setViewingBorrowerId(null);
            setEditingBorrower(b);
            setShowAddModal(true);
          }}
          onClose={() => setViewingBorrowerId(null)}
        />
      )}

      {/* Quick Repayment Modal from table row */}
      {paymentBorrower && (
        <RecordPaymentModal
          borrower={paymentBorrower}
          onPaymentRecorded={() => {
            setPaymentBorrower(null);
            loadBorrowers();
          }}
          onClose={() => setPaymentBorrower(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 18 }}>Delete Borrower Profile</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete profile <strong>"{deleteTarget.name}"</strong>?</p>
              {deleteTarget.currentBalance > 0 && (
                <div style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 500
                }}>
                  <FiAlertCircle style={{ marginRight: 6 }} />
                  Warning: This customer still owes an outstanding balance of <strong>Rs. {deleteTarget.currentBalance.toFixed(2)}</strong>!
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteConfirm(deleteTarget.currentBalance > 0)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
