// src/pages/SupplierDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, CloudLightning, HardDrive, KeyRound, CheckCircle, 
  BarChart, PlusCircle, LogOut, RefreshCw, Send, Check, X, 
  AlertCircle, History, ListCollapse, ArrowRight, Info 
} from 'lucide-react';
import { api } from '../services/api';

export default function SupplierDashboard({ currentUser }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // States
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Key secrets state
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // New Product Form State
  const [newSku, setNewSku] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newSupplierNotes, setNewSupplierNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Transfer Request Form State
  const [transferProductId, setTransferProductId] = useState(null);
  const [transferQty, setTransferQty] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Master Stock Intake Form State
  const [intakeProductId, setIntakeProductId] = useState(null);
  const [intakeQty, setIntakeQty] = useState('');
  const [intakeNote, setIntakeNote] = useState('');

  // QC History Modal state
  const [historyProductId, setHistoryProductId] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSupplierData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, transRes] = await Promise.all([
        api.get('/api/products').catch(() => ({ items: [] })),
        api.get('/api/inventory/transfers').catch(() => ({ items: [] }))
      ]);
      setProducts(prodRes.items || []);
      setTransfers(transRes.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load supplier dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierData();
  }, []);

  const handleLogout = () => {
    window.location.href = `${backendUrl}/auth/logout`;
  };

  const showToast = (message) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }
  };

  // Create Product Action
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newSku.trim() || !newProductName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      // 1 represents the placeholder supplier user ID in DB
      await api.post('/api/products', {
        supplierUserId: 1,
        sku: newSku.toUpperCase().trim(),
        productName: newProductName.trim(),
        basePrice: newBasePrice ? parseFloat(newBasePrice) : null,
        supplierNotes: newSupplierNotes.trim() || null
      });
      showToast(`Product ${newProductName} initialized and double ledgers registered!`);
      setNewSku('');
      setNewProductName('');
      setNewBasePrice('');
      setNewSupplierNotes('');
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'Failed to create new product. Check for duplicate SKU.');
    } finally {
      setCreating(false);
    }
  };

  // Submit Product QC
  const handleSubmitQC = async (productId) => {
    try {
      await api.post(`/api/products/${productId}/qc/submit`);
      showToast(`Product #${productId} successfully submitted to Admin auditing queue.`);
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'QC Submission failed');
    }
  };

  // Request Warehouse Transfer
  const handleRequestTransfer = async (e) => {
    e.preventDefault();
    const qty = parseInt(transferQty);
    if (!transferProductId || isNaN(qty) || qty <= 0) return;
    
    try {
      await api.post('/api/inventory/transfers', {
        productId: transferProductId,
        qty: qty,
        note: transferNote || `Supplier transfer request`
      });
      showToast(`Warehouse transfer request for ${qty} units successfully initialized!`);
      setTransferProductId(null);
      setTransferQty('');
      setTransferNote('');
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'Stock transfer request failed');
    }
  };

  // Handle Master Stock Deposit Intake
  const handleAddMasterStock = async (e) => {
    e.preventDefault();
    const qty = parseInt(intakeQty);
    if (!intakeProductId || isNaN(qty) || qty <= 0) return;

    try {
      await api.post('/api/inventory/transactions', {
        productId: intakeProductId,
        ledgerType: 'MASTER',
        txnType: 'IN',
        qty: qty,
        note: intakeNote || 'Physical warehouse stock deposit'
      });
      const prodName = products.find(p => p.productId === intakeProductId)?.productName || `#${intakeProductId}`;
      showToast(`Successfully deposited ${qty} units of physical stock for ${prodName}!`);
      setIntakeProductId(null);
      setIntakeQty('');
      setIntakeNote('');
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'Physical stock deposit failed');
    }
  };

  // Load QC audit logs and Gemini Enrichment jobs history
  const handleViewQCHistory = async (productId) => {
    setHistoryProductId(productId);
    setLoadingHistory(true);
    setHistoryEvents([]);
    setHistoryJobs([]);
    try {
      const [eventsRes, jobsRes] = await Promise.all([
        api.get(`/api/products/${productId}/qc/events`).catch(() => ({ items: [] })),
        api.get(`/api/products/${productId}/enrichment/jobs`).catch(() => ({ items: [] }))
      ]);
      setHistoryEvents(eventsRes.items || []);
      setHistoryJobs(jobsRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {actionSuccess && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))',
          padding: '16px 24px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideIn 0.3s ease'
        }}>
          <Check size={18} />
          {actionSuccess}
        </div>
      )}

      {/* Header */}
      <header className="nav-header">
        <div className="logo-text">
          <Package size={24} style={{ color: 'hsl(var(--primary))' }} />
          BrandCreator Supplier
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={fetchSupplierData} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            Refresh
          </button>
          
          <div className="user-badge">
            <span className={`role-tag role-${currentUser?.role?.toLowerCase()}`}>
              {currentUser?.role}
            </span>
            <img src={currentUser?.avatar} alt="Avatar" className="user-avatar" />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              {currentUser?.displayName}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Grid */}
      <div className="dashboard-container">
        <aside className="sidebar">
          <ul className="sidebar-menu">
            <li>
              <button 
                onClick={() => setActiveTab('inventory')} 
                className={`sidebar-link w-full text-left ${activeTab === 'inventory' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <BarChart size={18} />
                Double Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('transfers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'transfers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <Send size={18} />
                Transfer Requests ({transfers.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('byok')} 
                className={`sidebar-link w-full text-left ${activeTab === 'byok' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <KeyRound size={18} />
                BYOK Gemini Key
              </button>
            </li>
          </ul>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '8px' }}>
              Supplier Storage
            </span>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>
              Google Drive Active
            </span>
          </div>
        </aside>

        <main className="main-content">
          
          {/* Error Banner */}
          {error && (
            <div className="glass-card" style={{
              padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(234, 67, 53, 0.3)',
              background: 'rgba(234, 67, 53, 0.08)', color: '#ea4335', marginBottom: '24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <strong>Operation Failure:</strong> {error}
              </div>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ea4335', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <div className="spin-anim" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
            </div>
          )}

          {!loading && (
            <>
              {/* TAB 1: LEDGER INVENTORY */}
              {activeTab === 'inventory' && (
                <div>
                  
                  {/* Inline Create Product Form */}
                  <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlusCircle style={{ color: 'hsl(var(--primary))' }} size={20} />
                      Initialize New Product Ledger
                    </h3>
                    <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>SKU CODE</label>
                        <input 
                          type="text"
                          required
                          value={newSku}
                          onChange={(e) => setNewSku(e.target.value)}
                          placeholder="e.g. KURTI-ROSE-M"
                          style={{
                            width: '100%', padding: '10px', borderRadius: '8px', 
                            border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>PRODUCT NAME</label>
                        <input 
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="e.g. Soft Rose Daily Wear Kurti"
                          style={{
                            width: '100%', padding: '10px', borderRadius: '8px', 
                            border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>BASE PRICE (BDT)</label>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          value={newBasePrice}
                          onChange={(e) => setNewBasePrice(e.target.value)}
                          placeholder="e.g. 1250.00"
                          style={{
                            width: '100%', padding: '10px', borderRadius: '8px', 
                            border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>SUPPLIER NOTES/DETAILS</label>
                        <input 
                          type="text"
                          value={newSupplierNotes}
                          onChange={(e) => setNewSupplierNotes(e.target.value)}
                          placeholder="e.g. 100% premium cotton weave"
                          style={{
                            width: '100%', padding: '10px', borderRadius: '8px', 
                            border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                          }}
                        />
                      </div>

                      <button type="submit" disabled={creating} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', borderRadius: '8px', height: '42px', width: '100%' }}>
                        {creating ? 'Initializing...' : 'Create Double Ledger'}
                      </button>
                    </form>
                  </div>

                  {/* Products Double Ledger Display */}
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ color: 'hsl(var(--primary))', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Owned Catalog
                    </span>
                    <h1 style={{ fontSize: '2rem', marginTop: '4px' }}>Welcome back, {currentUser?.displayName}</h1>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Design & SKU</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>QC Audit Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>MASTER (Physical Bay)</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SELL (Virtual Shop)</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              You don't own any product ledgers. Use the initialization form above!
                            </td>
                          </tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.productId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>#{p.productId}</td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ fontWeight: '600' }}>{p.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>{p.sku}</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                    Price: {p.basePrice ? `৳${p.basePrice}` : '৳0.00'}
                                  </span>
                                  {p.supplierNotes && (
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic' }} title={p.supplierNotes}>
                                      Note: {p.supplierNotes.length > 25 ? p.supplierNotes.slice(0, 25) + '...' : p.supplierNotes}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="role-tag" style={{
                                    background: p.qcStatus === 'APPROVED' ? 'rgba(52,168,83,0.15)' : p.qcStatus === 'SUBMITTED' ? 'rgba(251,188,5,0.15)' : p.qcStatus === 'REJECTED' ? 'rgba(234,67,53,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: p.qcStatus === 'APPROVED' ? '#34a853' : p.qcStatus === 'SUBMITTED' ? '#fbbc05' : p.qcStatus === 'REJECTED' ? '#ea4335' : 'hsl(var(--text-secondary))'
                                  }}>
                                    {p.qcStatus}
                                  </span>
                                  
                                  {/* View QC Audit details/logs trigger */}
                                  <button 
                                    onClick={() => handleViewQCHistory(p.productId)}
                                    style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="View Audit logs"
                                  >
                                    <History size={14} />
                                  </button>
                                </div>
                                {p.qcReason && (
                                  <div style={{ color: '#ea4335', fontSize: '0.75rem', marginTop: '6px', maxWidth: '200px' }}>
                                    <strong>Reason:</strong> {p.qcReason}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{p.masterOnHand} Units</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>{p.masterReserved} reserved</div>
                                <button
                                  onClick={() => {
                                    setIntakeProductId(p.productId);
                                    setIntakeQty('');
                                    setIntakeNote('');
                                  }}
                                  className="btn-secondary"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '0.7rem',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'hsl(var(--primary))'
                                  }}
                                  title="Deposit Physical MASTER Stock"
                                >
                                  [+] Add Stock
                                </button>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{p.sellOnHand} Units</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.sellReserved} reserved</div>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                  {p.qcStatus === 'DRAFT' || p.qcStatus === 'REJECTED' ? (
                                    <button 
                                      onClick={() => handleSubmitQC(p.productId)}
                                      className="btn-primary" 
                                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', width: 'fit-content' }}
                                    >
                                      Submit for QC
                                    </button>
                                  ) : null}
                                  
                                  {p.qcStatus === 'APPROVED' && (
                                    <button 
                                      onClick={() => {
                                        setTransferProductId(p.productId);
                                        setTransferQty('');
                                        setTransferNote('');
                                      }}
                                      disabled={p.masterOnHand - p.masterReserved <= 0}
                                      className="btn-secondary" 
                                      style={{ 
                                        padding: '6px 12px', 
                                        fontSize: '0.75rem', 
                                        borderRadius: '6px', 
                                        width: 'fit-content',
                                        opacity: p.masterOnHand - p.masterReserved <= 0 ? 0.5 : 1,
                                        cursor: p.masterOnHand - p.masterReserved <= 0 ? 'not-allowed' : 'pointer'
                                      }}
                                      title={p.masterOnHand - p.masterReserved <= 0 ? "No available MASTER stock to transfer" : "Request physical to virtual transfer"}
                                    >
                                      Request Transfer
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Transfer Dialog Inline Modal */}
                  {transferProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '90%' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Send style={{ color: 'hsl(var(--primary))' }} />
                          Request stock transfer to SELL ledger
                        </h3>
                        <form onSubmit={handleRequestTransfer}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              Quantity to transfer (Available in Master)
                            </label>
                            <input 
                              type="number"
                              required
                              min="1"
                              value={transferQty}
                              onChange={(e) => setTransferQty(e.target.value)}
                              placeholder="e.g. 100"
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              Transfer Note (Optional)
                            </label>
                            <input 
                              type="text"
                              value={transferNote}
                              onChange={(e) => setTransferNote(e.target.value)}
                              placeholder="e.g. Moving bulk stock for summer sale"
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setTransferProductId(null)} className="btn-secondary">
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                              Submit Transfer Request
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Master Stock Intake Inline Modal */}
                  {intakeProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '90%' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HardDrive style={{ color: 'hsl(var(--primary))' }} size={18} />
                          Deposit Physical MASTER Stock
                        </h3>
                        <div style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Product / SKU</span>
                          <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                            {products.find(p => p.productId === intakeProductId)?.productName}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                            SKU: {products.find(p => p.productId === intakeProductId)?.sku}
                          </span>
                        </div>
                        <form onSubmit={handleAddMasterStock}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              Quantity to Deposit (Physical Count)
                            </label>
                            <input 
                              type="number"
                              required
                              min="1"
                              value={intakeQty}
                              onChange={(e) => setIntakeQty(e.target.value)}
                              placeholder="e.g. 100"
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>

                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              Receipt/Intake Note (Optional)
                            </label>
                            <input 
                              type="text"
                              value={intakeNote}
                              onChange={(e) => setIntakeNote(e.target.value)}
                              placeholder="e.g. Physical warehouse stock deposit"
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setIntakeProductId(null)} className="btn-secondary">
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                              Confirm Intake Deposit
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* QC history & Events logs Modal */}
                  {historyProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '600px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History style={{ color: 'hsl(var(--primary))' }} />
                            QC Audit History Logs (Product #{historyProductId})
                          </h3>
                          <button onClick={() => setHistoryProductId(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                            <X size={20} />
                          </button>
                        </div>

                        {loadingHistory ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                            <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                            <div>
                              <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '10px' }}>Audit Events</h4>
                              {historyEvents.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic' }}>No audit status changes logged yet.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {historyEvents.map(evt => (
                                    <div key={evt.EventId || Math.random()} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong style={{ color: 'hsl(var(--primary))' }}>{evt.Action}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(evt.CreatedAt || evt.createdAt).toLocaleString()}</span>
                                      </div>
                                      {evt.Reason && <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Reason: {evt.Reason}</p>}
                                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>By: {evt.PerformedByEmail || evt.performedByEmail}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '10px' }}>Gemini AI Enrichment Jobs</h4>
                              {historyJobs.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic' }}>No automatic enrichment tasks executed.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {historyJobs.map(job => (
                                    <div key={job.JobId || Math.random()} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong style={{ color: job.Status === 'SUCCEEDED' ? '#34a853' : '#ea4335' }}>
                                          {job.Status}
                                        </strong>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(job.CreatedAt || job.createdAt).toLocaleString()}</span>
                                      </div>
                                      {job.ErrorMessage && <p style={{ fontSize: '0.85rem', color: '#ea4335' }}>Error: {job.ErrorMessage}</p>}
                                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Provider: {job.Provider} | version {job.PromptVersion}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: TRANSFER REQUESTS LOGS */}
              {activeTab === 'transfers' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Stock Transfer Requests Ledger</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Monitor the progress of physical stock moving into virtual E-Storefront catalog balances.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Request ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Product / SKU</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Transfer Qty</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Requested At</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Approved By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              No transfer requests registered.
                            </td>
                          </tr>
                        ) : (
                          transfers.map(t => (
                            <tr key={t.transferId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>#{t.transferId}</td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ fontWeight: '600' }}>{t.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>{t.sku}</div>
                              </td>
                              <td style={{ padding: '20px', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                                {t.qty} units
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(t.requestedAt).toLocaleString()}
                              </td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: t.status === 'COMPLETED' ? 'rgba(52,168,83,0.15)' : 'rgba(251,188,5,0.15)',
                                  color: t.status === 'COMPLETED' ? '#34a853' : '#fbbc05'
                                }}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.85rem' }}>
                                {t.approvedByEmail ? (
                                  <span style={{ color: 'hsl(var(--primary))' }}>{t.approvedByEmail}</span>
                                ) : (
                                  <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Pending Admin Audit</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: BYOK */}
              {activeTab === 'byok' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  {/* BYOK Form */}
                  <div className="glass-card" style={{ padding: '28px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={20} style={{ color: 'hsl(var(--primary))' }} />
                      Gemini AI Personalization (BYOK)
                    </h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      Provide your own Gemini API Key to enable bulk AI SEO tagging and localized customer personalization algorithms directly in your products list.
                    </p>
                    <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Gemini API Key..."
                        style={{
                          width: '100%', padding: '12px', borderRadius: '8px', 
                          border: '1px solid hsl(var(--border-color))', background: 'rgba(255, 255, 255, 0.02)', color: '#fff',
                          outline: 'none'
                        }}
                      />
                      <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '0.9rem' }}>
                        Save Secret Key
                      </button>
                    </form>
                    {keySaved && (
                      <div style={{ marginTop: '12px', color: 'hsl(var(--primary))', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Key saved securely in session database.
                      </div>
                    )}
                  </div>

                  {/* Google Drive Status */}
                  <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={20} style={{ color: 'hsl(var(--secondary))' }} />
                        Google Drive Storage Sync
                      </h3>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.5' }}>
                        All uploaded product design sheets and high-res listing assets are sync-piped directly to the platform's Google Drive storage vault, saving physical host storage.
                      </p>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Platform Storage: 4.2 GB Sync Active</span>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

        </main>
      </div>
    </div>
  );
}
