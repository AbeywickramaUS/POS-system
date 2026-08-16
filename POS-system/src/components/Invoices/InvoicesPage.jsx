import React from 'react';
import {
  FiFileText, FiSearch, FiCalendar, FiTrash2, FiEye,
  FiX, FiChevronLeft, FiChevronRight, FiAlertTriangle,
  FiDownload, FiShoppingBag
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { salesAPI } from '../../utils/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 15;

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [showDetail, setShowDetail] = React.useState(false);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    loadInvoices();
  }, [page, startDate, endDate]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await salesAPI.getAll(params);
      setInvoices(data.sales);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice) => {
    setLoadingDetail(true);
    setShowDetail(true);
    try {
      const { data } = await salesAPI.getById(invoice._id);
      setSelectedInvoice(data);
    } catch (err) {
      toast.error('Failed to load invoice details');
      setShowDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await salesAPI.delete(deleteTarget._id);
      toast.success(`Invoice ${deleteTarget.invoiceNo} deleted`);
      setDeleteTarget(null);
      // Close detail modal if viewing the deleted invoice
      if (selectedInvoice?._id === deleteTarget._id) {
        setShowDetail(false);
        setSelectedInvoice(null);
      }
      loadInvoices();
    } catch (err) {
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const filteredInvoices = searchQuery
    ? invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon orders"><FiFileText /></div>
          <div className="stat-info">
            <h3>{total}</h3>
            <p>Total Invoices</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon revenue"><FiShoppingBag /></div>
          <div className="stat-info">
            <h3>Rs. {invoices.reduce((s, i) => s + i.grandTotal, 0).toFixed(2)}</h3>
            <p>Page Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon items" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' }}>
            <FiCalendar />
          </div>
          <div className="stat-info">
            <h3>{invoices.length > 0 ? formatDate(invoices[0]?.createdAt) : '—'}</h3>
            <p>Latest Invoice Date</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <div className="search-bar">
            <FiSearch className="icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 40, minWidth: 260 }}
            />
          </div>
        </div>

        <div className="toolbar-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              style={{ width: 150 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              style={{ width: 150 }}
            />
          </div>
          {(startDate || endDate || searchQuery) && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <FiX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loading">
            <span className="loading-spinner"></span>
            <span>Loading invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <FiFileText className="icon" />
            <h3>No invoices found</h3>
            <p>
              {searchQuery || startDate || endDate
                ? 'Try adjusting your filters'
                : 'Completed sales will appear here as invoices'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th className="text-center">Items</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">Discount</th>
                    <th className="text-right">Grand Total</th>
                    <th className="text-right">Cash Received</th>
                    <th className="text-right">Change</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id}>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--text-accent)',
                          fontFamily: 'monospace',
                          fontSize: 12
                        }}>
                          {invoice.invoiceNo}
                        </span>
                      </td>
                      <td>{formatDate(invoice.createdAt)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatTime(invoice.createdAt)}</td>
                      <td className="text-center">
                        <span style={{
                          background: 'var(--info-bg)',
                          color: 'var(--info)',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {invoice.items.length}
                        </span>
                      </td>
                      <td className="text-right font-mono">Rs. {invoice.subtotal.toFixed(2)}</td>
                      <td className="text-right font-mono" style={{
                        color: invoice.orderDiscount > 0 ? 'var(--warning)' : 'var(--text-muted)'
                      }}>
                        {invoice.orderDiscount > 0 ? `- Rs. ${invoice.orderDiscount.toFixed(2)}` : '—'}
                      </td>
                      <td className="text-right" style={{ fontWeight: 700, fontSize: 14 }}>
                        Rs. {invoice.grandTotal.toFixed(2)}
                      </td>
                      <td className="text-right font-mono">Rs. {invoice.cashReceived.toFixed(2)}</td>
                      <td className="text-right font-mono" style={{ color: 'var(--success)' }}>
                        Rs. {invoice.changeGiven.toFixed(2)}
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => handleViewInvoice(invoice)}
                            title="View invoice details"
                            style={{ color: 'var(--info)' }}
                          >
                            <FiEye size={15} />
                          </button>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setDeleteTarget(invoice)}
                            title="Delete invoice"
                            style={{ color: 'var(--danger)' }}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid var(--border-color)',
                fontSize: 13
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} invoices
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <FiChevronLeft size={14} /> Prev
                  </button>
                  <span style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px', fontWeight: 600,
                    color: 'var(--text-accent)'
                  }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <FiChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== Invoice Detail Modal ===== */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div
            className="modal"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiFileText /> Invoice Details
              </h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowDetail(false)}>
                <FiX size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="page-loading" style={{ height: 200 }}>
                <span className="loading-spinner"></span>
                <span>Loading...</span>
              </div>
            ) : selectedInvoice && (
              <>
                <div className="modal-body">
                  {/* Invoice Header Info */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    marginBottom: 24,
                    padding: 16,
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Invoice Number
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--text-accent)', fontFamily: 'monospace', fontSize: 15 }}>
                        {selectedInvoice.invoiceNo}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Date & Time
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {formatDate(selectedInvoice.createdAt)} at {formatTime(selectedInvoice.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
                      Line Items
                    </h4>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th>Barcode</th>
                            <th className="text-right">Unit Price</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Discount</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 500 }}>{item.name}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                                {item.barcode || '—'}
                              </td>
                              <td className="text-right font-mono">Rs. {item.unitPrice.toFixed(2)}</td>
                              <td className="text-center">{item.quantity}</td>
                              <td className="text-right font-mono" style={{
                                color: item.discount > 0 ? 'var(--warning)' : 'var(--text-muted)'
                              }}>
                                {item.discount > 0 ? `Rs. ${item.discount.toFixed(2)}` : '—'}
                              </td>
                              <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                                Rs. {item.lineTotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div style={{
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    border: '1px solid var(--border-color)'
                  }}>
                    <div className="checkout-row">
                      <label>Subtotal</label>
                      <span className="font-mono">Rs. {selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedInvoice.orderDiscount > 0 && (
                      <div className="checkout-row">
                        <label style={{ color: 'var(--warning)' }}>Order Discount</label>
                        <span className="font-mono" style={{ color: 'var(--warning)' }}>
                          - Rs. {selectedInvoice.orderDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="checkout-row total">
                      <label>Grand Total</label>
                      <span>Rs. {selectedInvoice.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="checkout-row" style={{ marginTop: 8 }}>
                      <label>Cash Received</label>
                      <span className="font-mono">Rs. {selectedInvoice.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="checkout-row">
                      <label style={{ color: 'var(--success)' }}>Change Given</label>
                      <span className="font-mono" style={{ color: 'var(--success)', fontWeight: 600 }}>
                        Rs. {selectedInvoice.changeGiven.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setShowDetail(false);
                      setDeleteTarget(selectedInvoice);
                    }}
                  >
                    <FiTrash2 size={14} /> Delete Invoice
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 26,
                color: 'var(--danger)'
              }}>
                <FiAlertTriangle />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Invoice?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>
                Are you sure you want to delete this invoice?
              </p>
              <p style={{
                fontWeight: 700,
                color: 'var(--text-accent)',
                fontFamily: 'monospace',
                fontSize: 15,
                margin: '12px 0'
              }}>
                {deleteTarget.invoiceNo}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Total: <strong style={{ color: 'var(--text-primary)' }}>Rs. {deleteTarget.grandTotal.toFixed(2)}</strong>
              </p>
              <p style={{
                color: 'var(--danger)',
                fontSize: 12,
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-block'
              }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Deleting...</>
                ) : (
                  <><FiTrash2 size={14} /> Delete Invoice</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
