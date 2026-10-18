import React from 'react';
import {
  FiSearch, FiTrash2, FiMinus, FiPlus, FiShoppingCart,
  FiPrinter, FiCheckCircle, FiXCircle, FiDollarSign,
  FiUser, FiUsers, FiCreditCard, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { productsAPI, salesAPI, settingsAPI, borrowersAPI } from '../../utils/api';
import BorrowerFormModal from '../Loans/BorrowerFormModal';

/* ─── Unit conversion table ───────────────────────────────
   For a product stored in kg: cashier can sell in g or kg.
   For a product stored in litre: cashier can sell in ml or litre.
   The sellQty entered by the cashier is converted to the
   product's base unit before deducting stock / calculating price.
*/
const SUB_UNITS = {
  kg:    [{ label: 'g',  factor: 0.001 }, { label: 'kg', factor: 1 }],
  g:     [{ label: 'g',  factor: 1 },     { label: 'kg', factor: 1000 }],
  litre: [{ label: 'ml', factor: 0.001 }, { label: 'litre', factor: 1 }],
  ml:    [{ label: 'ml', factor: 1 },     { label: 'litre', factor: 1000 }],
  lb:    [{ label: 'lb', factor: 1 }],
};

function getSubUnits(unit) {
  return SUB_UNITS[unit] || [{ label: unit, factor: 1 }];
}

export default function SalesPage() {
  const [cart, setCart] = React.useState([]);
  const [orderDiscount, setOrderDiscount] = React.useState(0);
  const [cashReceived, setCashReceived] = React.useState('');

  // Customer Type — default 'cash' as requested
  const [customerType, setCustomerType] = React.useState('cash'); // 'cash' | 'credit'
  const [borrowers, setBorrowers] = React.useState([]);
  const [selectedBorrowerId, setSelectedBorrowerId] = React.useState('');
  const [upfrontPaid, setUpfrontPaid] = React.useState('');
  const [showQuickBorrowerModal, setShowQuickBorrowerModal] = React.useState(false);

  const [barcodeInput, setBarcodeInput] = React.useState('');
  const barcodeRef = React.useRef(null);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [showSearch, setShowSearch] = React.useState(false);

  const [checkingOut, setCheckingOut] = React.useState(false);
  const [lastSale, setLastSale] = React.useState(null);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const [settings, setSettings] = React.useState(null);

  React.useEffect(() => {
    loadSettings();
    loadBorrowers();
    focusBarcode();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      setSettings(data);
    } catch {}
  };

  const loadBorrowers = async () => {
    try {
      const { data } = await borrowersAPI.getAll({ limit: 100, status: 'active' });
      setBorrowers(data.borrowers || []);
    } catch {}
  };

  const handleQuickBorrowerSaved = async (formData) => {
    try {
      const res = await borrowersAPI.create(formData);
      toast.success(`Borrower profile "${res.data.name}" created`);
      setShowQuickBorrowerModal(false);
      const { data } = await borrowersAPI.getAll({ limit: 100, status: 'active' });
      setBorrowers(data.borrowers || []);
      setSelectedBorrowerId(res.data._id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create borrower profile');
      throw err;
    }
  };

  const focusBarcode = () => setTimeout(() => barcodeRef.current?.focus(), 100);

  // ── Barcode ──────────────────────────────────────────────
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    try {
      const { data: product } = await productsAPI.getByBarcode(barcode);
      addToCart(product);
    } catch (err) {
      toast.error(err.response?.status === 404 ? `Product not found: ${barcode}` : 'Lookup failed');
    }
    setBarcodeInput('');
    focusBarcode();
  };

  // ── Search ───────────────────────────────────────────────
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const { data } = await productsAPI.getAll({ search: query, limit: 10 });
      setSearchResults(data.products);
      setShowSearch(true);
    } catch {}
  };

  // ── Cart ─────────────────────────────────────────────────
  const buildCartItem = (product) => {
    const subUnits = getSubUnits(product.unit);
    const defaultSub = subUnits[0]; // smallest sub-unit first (g before kg)
    return {
      productId: product._id,
      name: product.name,
      barcode: product.barcode || '',
      baseUnit: product.unit,          // kg / g / litre / pcs …
      unitPrice: product.sellingPrice, // price per base unit
      allowDecimal: product.allowDecimal || false,
      maxStock: product.stock,         // in base unit

      // What the cashier sees / edits:
      sellQtyRaw: product.allowDecimal ? '1' : '1',  // string for controlled input
      sellSubUnit: defaultSub.label,   // chosen sub-unit (g or kg)
      factor: defaultSub.factor,       // conversion factor to base unit

      discount: 0
    };
  };

  // Derived: actual qty in base unit
  const baseQty = (item) =>
    Math.round(parseFloat(item.sellQtyRaw || 0) * item.factor * 1000) / 1000;

  // Derived: line total
  const lineTotal = (item) =>
    Math.max(0, item.unitPrice * baseQty(item) - item.discount);

  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast.warning(`"${product.name}" is out of stock`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        // just bump the qty by 1 (in base units)
        const newRaw = String(parseFloat(existing.sellQtyRaw || 0) + 1);
        const newBase = parseFloat(newRaw) * existing.factor;
        if (newBase > existing.maxStock) {
          toast.warning(`Only ${existing.maxStock} ${existing.baseUnit} available`);
          return prev;
        }
        return prev.map(i =>
          i.productId === product._id ? { ...i, sellQtyRaw: newRaw } : i
        );
      }
      return [...prev, buildCartItem(product)];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const updateSubUnit = (productId, subLabel) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const subs = getSubUnits(item.baseUnit);
      const sub = subs.find(s => s.label === subLabel) || subs[0];
      // Keep the same base qty, recalculate raw display
      const currentBase = baseQty(item);
      const newRaw = currentBase > 0
        ? String(Math.round(currentBase / sub.factor * 1000) / 1000)
        : '1';
      return { ...item, sellSubUnit: sub.label, factor: sub.factor, sellQtyRaw: newRaw };
    }));
  };

  const updateSellQty = (productId, rawVal) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, sellQtyRaw: rawVal } : item
    ));
  };

  const commitSellQty = (productId) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const raw = parseFloat(item.sellQtyRaw);
      if (isNaN(raw) || raw <= 0) {
        toast.error('Quantity must be > 0');
        return { ...item, sellQtyRaw: '1' };
      }
      const base = Math.round(raw * item.factor * 1000) / 1000;
      if (base > item.maxStock) {
        toast.warning(`Only ${item.maxStock} ${item.baseUnit} available`);
        return { ...item, sellQtyRaw: String(Math.round(item.maxStock / item.factor * 1000) / 1000) };
      }
      return item;
    }));
  };

  const stepQty = (productId, direction) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const step = item.allowDecimal ? 0.1 : 1;
      const current = parseFloat(item.sellQtyRaw) || 0;
      const next = Math.round(Math.max(0.001, current + direction * step) * 1000) / 1000;
      const base = Math.round(next * item.factor * 1000) / 1000;
      if (base > item.maxStock) {
        toast.warning(`Only ${item.maxStock} ${item.baseUnit} available`);
        return item;
      }
      return { ...item, sellQtyRaw: String(next) };
    }));
  };

  const updateDiscount = (productId, val) =>
    setCart(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, discount: Math.max(0, parseFloat(val) || 0) }
        : i
    ));

  const removeFromCart = (productId) =>
    setCart(prev => prev.filter(i => i.productId !== productId));

  const clearCart = () => {
    setCart([]);
    setOrderDiscount(0);
    setCashReceived('');
    setUpfrontPaid('');
    setCustomerType('cash'); // Reset to default 'cash'
    setSelectedBorrowerId('');
    focusBarcode();
  };

  // ── Totals ───────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const grandTotal = Math.max(0, subtotal - orderDiscount);

  // Cash payment calculations
  const cashNum = parseFloat(cashReceived) || 0;
  const cashChangeGiven = cashNum - grandTotal;

  // Credit customer calculations
  const selectedBorrower = borrowers.find(b => b._id === selectedBorrowerId);
  const upfrontNum = parseFloat(upfrontPaid) || 0;
  const creditOwed = Math.max(0, grandTotal - upfrontNum);
  const creditChangeGiven = upfrontNum > grandTotal ? upfrontNum - grandTotal : 0;
  const exceedsCreditLimit = selectedBorrower?.creditLimit > 0 &&
    (selectedBorrower.currentBalance + creditOwed) > selectedBorrower.creditLimit;

  // Validation for checkout
  const canCheckout = customerType === 'cash'
    ? (cart.length > 0 && cashNum >= grandTotal)
    : (cart.length > 0 && !!selectedBorrowerId && !exceedsCreditLimit);

  // ── Checkout ─────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckingOut(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: baseQty(item),   // always in base unit
          discount: item.discount
        })),
        orderDiscount,
        paymentType: customerType,
        borrowerId: customerType === 'credit' ? selectedBorrowerId : null,
        cashReceived: customerType === 'credit' ? upfrontNum : cashNum
      };
      const { data: sale } = await salesAPI.checkout(saleData);
      setLastSale(sale);
      setShowSuccess(true);
      loadBorrowers(); // Refresh borrower balances

      if (window.electronAPI && settings?.printerName) {
        try {
          const r = await window.electronAPI.printReceipt({ sale, settings });
          if (!r.success) toast.warning(`Print failed: ${r.error}`);
        } catch { toast.warning('Could not print receipt'); }
      }

      toast.success(
        customerType === 'credit'
          ? `Credit sale completed! Charged to ${sale.borrowerName}. Invoice: ${sale.invoiceNo}`
          : `Sale completed! Invoice: ${sale.invoiceNo}`
      );
      setTimeout(() => { clearCart(); setShowSuccess(false); setLastSale(null); }, 3500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePrintLast = async () => {
    if (!lastSale || !window.electronAPI) {
      toast.info('Printing is only available in the desktop app'); return;
    }
    try {
      const r = await window.electronAPI.printReceipt({ sale: lastSale, settings });
      if (r.success) toast.success('Receipt printed');
      else toast.error(`Print failed: ${r.error}`);
    } catch { toast.error('Print error'); }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">

      {/* Barcode input */}
      <form onSubmit={handleBarcodeSubmit} className="barcode-input-wrapper">
        <FiSearch className="icon" />
        <input ref={barcodeRef} type="text" className="barcode-input"
          placeholder="Scan barcode or type product code and press Enter..."
          value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} autoFocus />
      </form>

      <div className="sales-layout">

        {/* ── LEFT: Cart ───────────────────────────────── */}
        <div className="sales-cart card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Search */}
          <div style={{ padding: '16px 16px 0', position: 'relative' }}>
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <FiSearch className="icon" />
              <input type="text" className="form-input"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                style={{ paddingLeft: 40 }} />
            </div>

            {showSearch && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 16, right: 16,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                maxHeight: 250, overflowY: 'auto', zIndex: 50
              }}>
                {searchResults.map(p => (
                  <div key={p._id} onClick={() => addToCart(p)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)', transition: 'background 150ms'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,70,229,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.barcode || 'No barcode'} · Stock: {p.stock} {p.unit}
                        {p.allowDecimal && (
                          <span style={{
                            marginLeft: 6, background: 'var(--info-bg)', color: 'var(--info)',
                            padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600
                          }}>by weight</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-accent)', fontSize: 13 }}>
                      Rs.{p.sellingPrice.toFixed(2)}/{p.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart header */}
          <div style={{
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiShoppingCart />
              <span style={{ fontWeight: 600 }}>Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
            </div>
            {cart.length > 0 && (
              <button className="btn btn-sm btn-ghost text-danger" onClick={clearCart}>
                <FiXCircle /> Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="cart-items" onClick={() => setShowSearch(false)}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <FiShoppingCart className="icon" />
                <h3>Cart is empty</h3>
                <p>Scan a barcode or search for products to add</p>
              </div>
            ) : (
              cart.map(item => {
                const subs = getSubUnits(item.baseUnit);
                const hasSubUnits = subs.length > 1;
                const base = baseQty(item);
                const total = lineTotal(item);

                return (
                  <div key={item.productId} className="cart-item" style={{
                    gridTemplateColumns: '1fr auto auto auto auto'
                  }}>
                    {/* Name + price hint */}
                    <div className="cart-item-name">
                      {item.name}
                      <small>
                        Rs.{item.unitPrice.toFixed(2)}/{item.baseUnit}
                        {item.allowDecimal && (
                          <span style={{
                            marginLeft: 6, background: 'var(--info-bg)', color: 'var(--info)',
                            padding: '1px 5px', borderRadius: 8, fontSize: 10
                          }}>by weight</span>
                        )}
                      </small>
                    </div>

                    {/* Quantity control */}
                    {item.allowDecimal ? (
                      /* ── Weight / decimal product ── */
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="qty-btn"
                          onClick={() => stepQty(item.productId, -1)}
                          disabled={parseFloat(item.sellQtyRaw) <= 0.1}
                          title="Decrease">
                          <FiMinus size={11} />
                        </button>

                        {/* Amount input */}
                        <input
                          type="number"
                          className="qty-input-decimal"
                          value={item.sellQtyRaw}
                          min="0.001"
                          step="0.001"
                          onChange={e => updateSellQty(item.productId, e.target.value)}
                          onBlur={() => commitSellQty(item.productId)}
                          onKeyDown={e => e.key === 'Enter' && (commitSellQty(item.productId), e.target.blur())}
                          style={{ width: 72 }}
                        />

                        {/* Sub-unit selector */}
                        {hasSubUnits ? (
                          <select
                            className="sub-unit-select"
                            value={item.sellSubUnit}
                            onChange={e => updateSubUnit(item.productId, e.target.value)}
                          >
                            {subs.map(s => (
                              <option key={s.label} value={s.label}>{s.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28 }}>
                            {item.sellSubUnit}
                          </span>
                        )}

                        <button className="qty-btn"
                          onClick={() => stepQty(item.productId, 1)}
                          title="Increase">
                          <FiPlus size={11} />
                        </button>

                        {/* Base qty hint when sub-unit differs */}
                        {item.sellSubUnit !== item.baseUnit && (
                          <span style={{
                            fontSize: 10, color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)', padding: '2px 5px',
                            borderRadius: 6, whiteSpace: 'nowrap'
                          }}>
                            = {base}{item.baseUnit}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* ── Whole-unit product ── */
                      <div className="qty-control">
                        <button onClick={() => stepQty(item.productId, -1)}
                          disabled={parseFloat(item.sellQtyRaw) <= 1}>
                          <FiMinus size={12} />
                        </button>
                        <span>{item.sellQtyRaw}</span>
                        <button onClick={() => stepQty(item.productId, 1)}>
                          <FiPlus size={12} />
                        </button>
                      </div>
                    )}

                    {/* Discount */}
                    <div>
                      <input type="number" className="discount-input" placeholder="Disc."
                        min="0" step="0.01" value={item.discount || ''}
                        onChange={e => updateDiscount(item.productId, e.target.value)}
                        title="Item discount (Rs.)" />
                    </div>

                    {/* Line total */}
                    <div style={{
                      fontWeight: 600, minWidth: 90, textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      Rs.{total.toFixed(2)}
                    </div>

                    {/* Remove */}
                    <button className="btn btn-icon btn-ghost text-danger"
                      onClick={() => removeFromCart(item.productId)}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Checkout panel ─────────────────────── */}
        <div className="sales-panel">
          <div className="checkout-summary">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
              <FiDollarSign style={{ marginRight: 6 }} /> Order Summary
            </h3>

            <div className="checkout-row">
              <label>Subtotal</label>
              <span className="font-mono">Rs. {subtotal.toFixed(2)}</span>
            </div>

            <div className="checkout-row">
              <label>Order Discount</label>
              <input type="number" className="discount-input" style={{ width: 100 }}
                placeholder="0.00" min="0" step="0.01" value={orderDiscount || ''}
                onChange={e => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>

            <div className="checkout-row total">
              <label>Grand Total</label>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>

            {/* ── CUSTOMER / PAYMENT MODE SELECTOR (Default: Cash) ── */}
            <div style={{ marginTop: 18, marginBottom: 14 }}>
              <label className="form-label" style={{
                marginBottom: 8, fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600
              }}>
                Customer Type
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: 'var(--bg-primary)',
                padding: 4,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  className={`btn btn-sm ${customerType === 'cash' ? 'btn-success' : 'btn-ghost'}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontWeight: customerType === 'cash' ? 700 : 500,
                    padding: '8px 10px'
                  }}
                  onClick={() => setCustomerType('cash')}
                >
                  <FiDollarSign size={15} /> Cash Customer
                </button>

                <button
                  type="button"
                  className={`btn btn-sm ${customerType === 'credit' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontWeight: customerType === 'credit' ? 700 : 500,
                    padding: '8px 10px'
                  }}
                  onClick={() => setCustomerType('credit')}
                >
                  <FiCreditCard size={15} /> Credit Customer
                </button>
              </div>
            </div>

            {/* ── CASH CUSTOMER SECTION ── */}
            {customerType === 'cash' && (
              <>
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Cash Received (Rs.)</label>
                  <input type="number" className="form-input" placeholder="Enter cash amount"
                    min="0" step="0.01" value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    style={{ fontSize: 18, fontWeight: 600, textAlign: 'right', padding: '12px 14px' }} />
                </div>

                {cashNum > 0 && cashNum >= grandTotal && (
                  <div className="change-display">
                    <div className="label">Change</div>
                    <div className="amount">Rs. {cashChangeGiven.toFixed(2)}</div>
                  </div>
                )}

                {cashNum > 0 && cashNum < grandTotal && (
                  <div style={{
                    textAlign: 'center', padding: 10, background: 'var(--danger-bg)',
                    borderRadius: 'var(--radius-md)', marginTop: 8,
                    color: 'var(--danger)', fontSize: 12, fontWeight: 500
                  }}>
                    Insufficient cash — need Rs. {(grandTotal - cashNum).toFixed(2)} more
                  </div>
                )}
              </>
            )}

            {/* ── CREDIT CUSTOMER SECTION ── */}
            {customerType === 'credit' && (
              <div style={{ marginTop: 14 }}>
                {/* Borrower Selector */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Select Borrower Profile *
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 11, padding: '2px 8px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setShowQuickBorrowerModal(true)}
                    >
                      <FiPlus size={12} /> New Profile
                    </button>
                  </div>

                  <select
                    className="form-select"
                    value={selectedBorrowerId}
                    onChange={e => setSelectedBorrowerId(e.target.value)}
                    style={{
                      borderColor: !selectedBorrowerId ? 'var(--warning)' : undefined,
                      fontSize: 13
                    }}
                  >
                    <option value="">-- Choose Borrower Account --</option>
                    {borrowers.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.name} {b.phone ? `(${b.phone})` : ''} — Debt: Rs. {b.currentBalance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Borrower Details Card */}
                {selectedBorrower && (
                  <div style={{
                    background: 'rgba(79, 70, 229, 0.08)',
                    border: '1px solid rgba(79, 70, 229, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    marginBottom: 12,
                    fontSize: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedBorrower.name}</span>
                      <span style={{ color: selectedBorrower.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        Debt: Rs. {selectedBorrower.currentBalance.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
                      <span>{selectedBorrower.phone || selectedBorrower.nic || 'Registered'}</span>
                      <span>
                        Limit: {selectedBorrower.creditLimit > 0 ? `Rs. ${selectedBorrower.creditLimit.toFixed(2)}` : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Upfront Payment */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Upfront Paid (Rs.) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional down payment)</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={upfrontPaid}
                    onChange={e => setUpfrontPaid(e.target.value)}
                    style={{ textAlign: 'right', fontWeight: 600 }}
                  />
                </div>

                {/* Credit Debt Calculation Box */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>
                    Added to Customer Debt:
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--danger)' }}>
                    Rs. {creditOwed.toFixed(2)}
                  </span>
                </div>

                {exceedsCreditLimit && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--danger-bg)', color: 'var(--danger)',
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    fontSize: 11, marginBottom: 10
                  }}>
                    <FiAlertCircle size={14} />
                    <span>Exceeds borrower credit limit of Rs. {selectedBorrower?.creditLimit.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            className={`btn ${customerType === 'credit' ? 'btn-primary' : 'btn-success'} btn-lg`}
            onClick={handleCheckout}
            disabled={!canCheckout || checkingOut}
            style={{ width: '100%' }}
          >
            {checkingOut ? (
              <><span className="loading-spinner" style={{ width: 16, height: 16 }}></span> Processing...</>
            ) : customerType === 'credit' ? (
              <><FiCreditCard /> Issue Credit Bill (Rs. {creditOwed.toFixed(2)} on Credit)</>
            ) : (
              <><FiCheckCircle /> Complete Cash Sale</>
            )}
          </button>

          {lastSale && (
            <button className="btn btn-secondary" onClick={handlePrintLast} style={{ width: '100%' }}>
              <FiPrinter /> Reprint Last Receipt
            </button>
          )}

          {/* Quick Cash Buttons (only for cash customer) */}
          {customerType === 'cash' && cart.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[100, 500, 1000, 2000, 5000, 'Exact'].map(amount => (
                <button key={amount} className="btn btn-secondary btn-sm"
                  onClick={() => setCashReceived(amount === 'Exact' ? grandTotal.toString() : amount.toString())}>
                  {amount === 'Exact' ? '= Exact' : `Rs.${amount}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Borrower Creation Modal */}
      {showQuickBorrowerModal && (
        <BorrowerFormModal
          onSave={handleQuickBorrowerSaved}
          onClose={() => setShowQuickBorrowerModal(false)}
        />
      )}

      {/* Success overlay */}
      {showSuccess && lastSale && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, animation: 'fadeIn 200ms ease'
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)',
            padding: 40, textAlign: 'center', maxWidth: 420,
            animation: 'slideUp 300ms ease', border: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: lastSale.paymentType === 'credit' ? 'rgba(79, 70, 229, 0.15)' : 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32,
              color: lastSale.paymentType === 'credit' ? 'var(--accent-primary)' : 'var(--success)'
            }}>
              {lastSale.paymentType === 'credit' ? <FiCreditCard /> : <FiCheckCircle />}
            </div>

            <h2 style={{ fontSize: 22, marginBottom: 8 }}>
              {lastSale.paymentType === 'credit' ? 'Credit Sale Issued!' : 'Cash Sale Complete!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Invoice: {lastSale.invoiceNo}</p>
            <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Rs. {lastSale.grandTotal.toFixed(2)}</p>

            {lastSale.paymentType === 'credit' ? (
              <div style={{
                background: 'rgba(79, 70, 229, 0.08)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginTop: 10,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer: </span>
                  <strong>{lastSale.borrowerName}</strong>
                </div>
                <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--danger)', fontWeight: 600 }}>
                  <span>Added to Debt: </span>
                  <strong>Rs. {(lastSale.creditAmount || 0).toFixed(2)}</strong>
                </div>
                {lastSale.cashReceived > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--success)' }}>
                    <span>Paid Upfront: </span>
                    <strong>Rs. {lastSale.cashReceived.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--success)', fontSize: 16, fontWeight: 600 }}>
                Change: Rs. {lastSale.changeGiven.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
