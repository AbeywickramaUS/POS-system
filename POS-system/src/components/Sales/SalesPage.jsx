import React from 'react';
import {
  FiSearch, FiTrash2, FiMinus, FiPlus, FiShoppingCart,
  FiPrinter, FiCheckCircle, FiXCircle, FiDollarSign
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { productsAPI, salesAPI, settingsAPI } from '../../utils/api';

export default function SalesPage() {
  // Cart state
  const [cart, setCart] = React.useState([]);
  const [orderDiscount, setOrderDiscount] = React.useState(0);
  const [cashReceived, setCashReceived] = React.useState('');

  // Barcode input
  const [barcodeInput, setBarcodeInput] = React.useState('');
  const barcodeRef = React.useRef(null);

  // Search
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [showSearch, setShowSearch] = React.useState(false);

  // Checkout state
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [lastSale, setLastSale] = React.useState(null);
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Settings
  const [settings, setSettings] = React.useState(null);

  React.useEffect(() => {
    loadSettings();
    focusBarcode();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await settingsAPI.get();
      setSettings(data);
    } catch (err) {
      // Settings will use defaults
    }
  };

  const focusBarcode = () => {
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  // ----- Barcode Handling -----
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      const { data: product } = await productsAPI.getByBarcode(barcode);
      addToCart(product);
      setBarcodeInput('');
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(`Product not found: ${barcode}`);
      } else {
        toast.error('Lookup failed');
      }
      setBarcodeInput('');
    }
    focusBarcode();
  };

  // ----- Search -----
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    try {
      const { data } = await productsAPI.getAll({ search: query, limit: 10 });
      setSearchResults(data.products);
      setShowSearch(true);
    } catch (err) {
      // Ignore
    }
  };

  // ----- Cart Operations -----
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Only ${product.stock} ${product.unit} available`);
          return prev;
        }
        return prev.map(item =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      if (product.stock <= 0) {
        toast.warning(`"${product.name}" is out of stock`);
        return prev;
      }

      return [...prev, {
        productId: product._id,
        name: product.name,
        barcode: product.barcode || '',
        unitPrice: product.sellingPrice,
        quantity: 1,
        discount: 0,
        maxStock: product.stock,
        unit: product.unit
      }];
    });

    setShowSearch(false);
    setSearchQuery('');
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      if (newQty > item.maxStock) {
        toast.warning(`Only ${item.maxStock} ${item.unit} available`);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const updateItemDiscount = (productId, discount) => {
    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, discount: Math.max(0, parseFloat(discount) || 0) }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderDiscount(0);
    setCashReceived('');
    focusBarcode();
  };

  // ----- Calculations -----
  const subtotal = cart.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity) - item.discount;
  }, 0);

  const grandTotal = Math.max(0, subtotal - orderDiscount);
  const cashNum = parseFloat(cashReceived) || 0;
  const changeGiven = cashNum - grandTotal;
  const canCheckout = cart.length > 0 && cashNum >= grandTotal;

  // ----- Checkout -----
  const handleCheckout = async () => {
    if (!canCheckout) return;

    setCheckingOut(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          discount: item.discount
        })),
        orderDiscount,
        cashReceived: cashNum
      };

      const { data: sale } = await salesAPI.checkout(saleData);
      setLastSale(sale);
      setShowSuccess(true);

      // Try to print receipt
      if (window.electronAPI && settings?.printerName) {
        try {
          const result = await window.electronAPI.printReceipt({ sale, settings });
          if (!result.success) {
            toast.warning(`Print failed: ${result.error}`);
          }
        } catch (printErr) {
          toast.warning('Could not print receipt');
        }
      }

      toast.success(`Sale completed! Invoice: ${sale.invoiceNo}`);

      // Clear cart after brief delay
      setTimeout(() => {
        clearCart();
        setShowSuccess(false);
        setLastSale(null);
      }, 3000);

    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  // ----- Manual Print -----
  const handlePrintLast = async () => {
    if (!lastSale) return;
    if (!window.electronAPI) {
      toast.info('Printing is only available in the desktop app');
      return;
    }
    try {
      const result = await window.electronAPI.printReceipt({ sale: lastSale, settings });
      if (result.success) toast.success('Receipt printed');
      else toast.error(`Print failed: ${result.error}`);
    } catch (err) {
      toast.error('Print error');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Barcode Input */}
      <form onSubmit={handleBarcodeSubmit} className="barcode-input-wrapper">
        <FiSearch className="icon" />
        <input
          ref={barcodeRef}
          type="text"
          className="barcode-input"
          placeholder="Scan barcode or type product code and press Enter..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          autoFocus
        />
      </form>

      <div className="sales-layout">
        {/* Left: Cart */}
        <div className="sales-cart card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Search Products */}
          <div style={{ padding: '16px 16px 0', position: 'relative' }}>
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <FiSearch className="icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                style={{ paddingLeft: 40 }}
              />
            </div>

            {/* Search Dropdown */}
            {showSearch && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 16,
                right: 16,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: 250,
                overflowY: 'auto',
                zIndex: 50
              }}>
                {searchResults.map(product => (
                  <div
                    key={product._id}
                    onClick={() => addToCart(product)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 150ms'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79,70,229,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {product.barcode || 'No barcode'} · Stock: {product.stock} {product.unit}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
                      Rs. {product.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Header */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiShoppingCart />
              <span style={{ fontWeight: 600 }}>
                Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </span>
            </div>
            {cart.length > 0 && (
              <button className="btn btn-sm btn-ghost text-danger" onClick={clearCart}>
                <FiXCircle /> Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="cart-items" onClick={() => setShowSearch(false)}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <FiShoppingCart className="icon" />
                <h3>Cart is empty</h3>
                <p>Scan a barcode or search for products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="cart-item" style={{
                  gridTemplateColumns: '1fr auto auto auto auto',
                }}>
                  <div className="cart-item-name">
                    {item.name}
                    <small>Rs. {item.unitPrice.toFixed(2)} / {item.unit}</small>
                  </div>

                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.productId, -1)} disabled={item.quantity <= 1}>
                      <FiMinus size={12} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)}>
                      <FiPlus size={12} />
                    </button>
                  </div>

                  <div>
                    <input
                      type="number"
                      className="discount-input"
                      placeholder="Disc."
                      min="0"
                      step="0.01"
                      value={item.discount || ''}
                      onChange={(e) => updateItemDiscount(item.productId, e.target.value)}
                      title="Item discount (Rs.)"
                    />
                  </div>

                  <div style={{ fontWeight: 600, minWidth: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    Rs. {((item.unitPrice * item.quantity) - item.discount).toFixed(2)}
                  </div>

                  <button
                    className="btn btn-icon btn-ghost text-danger"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Checkout Panel */}
        <div className="sales-panel">
          <div className="checkout-summary">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              <FiDollarSign style={{ marginRight: 6 }} /> Order Summary
            </h3>

            <div className="checkout-row">
              <label>Subtotal</label>
              <span className="font-mono">Rs. {subtotal.toFixed(2)}</span>
            </div>

            <div className="checkout-row">
              <label>Order Discount</label>
              <input
                type="number"
                className="discount-input"
                style={{ width: 100 }}
                placeholder="0.00"
                min="0"
                step="0.01"
                value={orderDiscount || ''}
                onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div className="checkout-row total">
              <label>Grand Total</label>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Cash Received (Rs.)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Enter cash amount"
                min="0"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  textAlign: 'right',
                  padding: '12px 14px'
                }}
              />
            </div>

            {cashNum > 0 && cashNum >= grandTotal && (
              <div className="change-display">
                <div className="label">Change</div>
                <div className="amount">Rs. {changeGiven.toFixed(2)}</div>
              </div>
            )}

            {cashNum > 0 && cashNum < grandTotal && (
              <div style={{
                textAlign: 'center',
                padding: 12,
                background: 'var(--danger-bg)',
                borderRadius: 'var(--radius-md)',
                marginTop: 10,
                color: 'var(--danger)',
                fontSize: 13,
                fontWeight: 500
              }}>
                Insufficient cash — need Rs. {(grandTotal - cashNum).toFixed(2)} more
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            className="btn btn-success btn-lg"
            onClick={handleCheckout}
            disabled={!canCheckout || checkingOut}
            style={{ width: '100%' }}
          >
            {checkingOut ? (
              <><span className="loading-spinner" style={{ width: 16, height: 16 }}></span> Processing...</>
            ) : (
              <><FiCheckCircle /> Complete Sale</>
            )}
          </button>

          {lastSale && (
            <button
              className="btn btn-secondary"
              onClick={handlePrintLast}
              style={{ width: '100%' }}
            >
              <FiPrinter /> Reprint Last Receipt
            </button>
          )}

          {/* Quick Cash Buttons */}
          {cart.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8
            }}>
              {[100, 500, 1000, 2000, 5000, 'Exact'].map((amount) => (
                <button
                  key={amount}
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (amount === 'Exact') setCashReceived(grandTotal.toString());
                    else setCashReceived(amount.toString());
                  }}
                >
                  {amount === 'Exact' ? '= Exact' : `Rs.${amount}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Overlay */}
      {showSuccess && lastSale && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 200ms ease'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-xl)',
            padding: 40,
            textAlign: 'center',
            maxWidth: 400,
            animation: 'slideUp 300ms ease'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
              color: 'var(--success)'
            }}>
              <FiCheckCircle />
            </div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Sale Complete!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Invoice: {lastSale.invoiceNo}</p>
            <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              Rs. {lastSale.grandTotal.toFixed(2)}
            </p>
            <p style={{ color: 'var(--success)', fontSize: 16, fontWeight: 600 }}>
              Change: Rs. {lastSale.changeGiven.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
