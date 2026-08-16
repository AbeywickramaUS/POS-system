import React from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiArrowUp, FiArrowDown, FiPackage } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { productsAPI } from '../../utils/api';
import ProductFormModal from './ProductFormModal';

export default function InventoryPage() {
  const [products, setProducts] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [categories, setCategories] = React.useState([]);
  const [showLowStock, setShowLowStock] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);

  // Barcode scan state
  const [barcodeInput, setBarcodeInput] = React.useState('');
  const [prefillBarcode, setPrefillBarcode] = React.useState('');
  const [highlightId, setHighlightId] = React.useState(null);
  const barcodeRef = React.useRef(null);

  React.useEffect(() => {
    loadCategories();
  }, []);

  React.useEffect(() => {
    loadProducts();
  }, [search, categoryFilter, showLowStock, page]);

  // Clear highlight after 2.5 seconds
  React.useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (showLowStock) params.lowStock = 'true';

      const { data } = await productsAPI.getAll(params);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await productsAPI.getCategories();
      setCategories(data);
    } catch (err) {
      // Ignore
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setPrefillBarcode('');
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setPrefillBarcode('');
    setModalOpen(true);
  };

  const handleDelete = async (product) => {
    try {
      await productsAPI.delete(product._id);
      toast.success(`"${product.name}" deleted`);
      setDeleteConfirm(null);
      loadProducts();
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleStockAdjust = async (product, adjustment) => {
    try {
      await productsAPI.adjustStock(product._id, adjustment);
      loadProducts();
    } catch (err) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, formData);
        toast.success('Product updated');
      } else {
        await productsAPI.create(formData);
        toast.success('Product added');
      }
      setModalOpen(false);
      setPrefillBarcode('');
      loadProducts();
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
      throw err; // Let the modal handle it
    }
  };

  // Barcode scan handler
  const handleBarcodeScan = async (e) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      const { data: product } = await productsAPI.getByBarcode(barcode);
      // Product found — highlight it in the table
      toast.info(`Found: "${product.name}" — highlighted in the table`);
      setHighlightId(product._id);

      // Scroll the row into view
      setTimeout(() => {
        const row = document.getElementById(`product-row-${product._id}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } catch (err) {
      if (err.response?.status === 404) {
        // Product not found — open Add Product form with barcode pre-filled
        toast.info(`No product with barcode "${barcode}" — opening Add Product form`);
        setEditingProduct(null);
        setPrefillBarcode(barcode);
        setModalOpen(true);
      } else {
        toast.error('Barcode lookup failed');
      }
    }

    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) return { label: 'Out of Stock', cls: 'out-of-stock' };
    if (product.stock <= product.lowStockThreshold) return { label: 'Low Stock', cls: 'low-stock' };
    return { label: 'In Stock', cls: 'in-stock' };
  };

  return (
    <div className="animate-fade-in">
      {/* Barcode Scanner Input */}
      <form onSubmit={handleBarcodeScan} className="barcode-input-wrapper">
        <FiSearch className="icon" />
        <input
          ref={barcodeRef}
          type="text"
          className="barcode-input"
          placeholder="Scan barcode to find or add a new product..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
        />
        <div style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-muted)'
        }}>
          <span style={{
            background: 'var(--bg-secondary)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: 11
          }}>
            Press Enter
          </span>
        </div>
      </form>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <div className="search-bar">
            <FiSearch className="icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search products by name, barcode, or category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 40, minWidth: 350 }}
            />
          </div>

          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            style={{ width: 160 }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            className={`btn btn-sm ${showLowStock ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => { setShowLowStock(!showLowStock); setPage(1); }}
          >
            ⚠️ Low Stock
          </button>
        </div>

        <div className="toolbar-group">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {total} product{total !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-primary" onClick={handleAddNew}>
            <FiPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Barcode</th>
              <th>Category</th>
              <th className="text-right">Cost (Rs.)</th>
              <th className="text-right">Price (Rs.)</th>
              <th className="text-center">Stock</th>
              <th className="text-center">Status</th>
              <th className="text-center">Adjust</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center" style={{ padding: 40 }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className="empty-state">
                    <FiPackage className="icon" />
                    <h3>No products found</h3>
                    <p>Add your first product to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const status = getStockStatus(product);
                const isHighlighted = highlightId === product._id;
                return (
                  <tr
                    key={product._id}
                    id={`product-row-${product._id}`}
                    style={{
                      background: isHighlighted ? 'rgba(79, 70, 229, 0.15)' : undefined,
                      transition: 'background 0.4s ease',
                      boxShadow: isHighlighted ? 'inset 3px 0 0 var(--accent-primary)' : undefined
                    }}
                  >
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {product.barcode || '—'}
                    </td>
                    <td>{product.category}</td>
                    <td className="text-right font-mono">{product.costPrice.toFixed(2)}</td>
                    <td className="text-right font-mono">{product.sellingPrice.toFixed(2)}</td>
                    <td className="text-center font-mono" style={{ fontWeight: 600 }}>
                      {product.stock} {product.unit}
                    </td>
                    <td className="text-center">
                      <span className={`stock-badge ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          title="Add stock (+1)"
                          onClick={() => handleStockAdjust(product, 1)}
                        >
                          <FiArrowUp />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          title="Deduct stock (-1)"
                          onClick={() => handleStockAdjust(product, -1)}
                          disabled={product.stock === 0}
                        >
                          <FiArrowDown />
                        </button>
                      </div>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          title="Edit"
                          onClick={() => handleEdit(product)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost text-danger"
                          title="Delete"
                          onClick={() => setDeleteConfirm(product)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-muted" style={{ padding: '6px 12px', fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Product Form Modal */}
      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          prefillBarcode={prefillBarcode}
          onSave={handleSaveProduct}
          onClose={() => { setModalOpen(false); setPrefillBarcode(''); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Product</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>?</p>
              <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
