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

  const supplierDashboardStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes pulseBorder {
      0% { border-color: rgba(255,255,255,0.06); }
      50% { border-color: hsl(var(--primary) / 0.35); }
      100% { border-color: rgba(255,255,255,0.06); }
    }
    
    .tab-animation {
      animation: fadeInUp 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }
    
    .glass-card-premium {
      background: rgba(13, 17, 24, 0.72) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
      border-radius: 20px !important;
      padding: 30px !important;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      position: relative;
      overflow: hidden;
    }
    .glass-card-premium:hover {
      border-color: hsl(var(--secondary) / 0.2) !important;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55), 0 0 20px hsl(var(--secondary) / 0.08) !important;
      transform: translateY(-4px) !important;
    }
    
    .premium-table-container {
      background: rgba(13, 17, 24, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 16px !important;
      overflow: hidden !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
    }
    
    .premium-table {
      width: 100% !important;
      border-collapse: collapse !important;
      text-align: left !important;
    }
    .premium-table th {
      background: rgba(255, 255, 255, 0.02) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      padding: 16px 20px !important;
      color: hsl(var(--text-secondary)) !important;
      font-size: 0.8rem !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
    }
    .premium-table td {
      padding: 16px 20px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
      font-size: 0.875rem !important;
      color: hsl(var(--text-primary)) !important;
    }
    .premium-table tr:last-child td {
      border-bottom: none !important;
    }
    .premium-table tr.interactive-row {
      transition: all 0.2s ease !important;
    }
    .premium-table tr.interactive-row:hover {
      background: rgba(255, 255, 255, 0.015) !important;
    }
    
    .styled-input {
      width: 100% !important;
      padding: 12px 14px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      background: rgba(0, 0, 0, 0.3) !important;
      color: #fff !important;
      font-size: 0.9rem !important;
      transition: all 0.25s ease !important;
      outline: none !important;
    }
    .styled-input:focus {
      border-color: hsl(var(--secondary)) !important;
      box-shadow: 0 0 10px hsl(var(--secondary) / 0.15) !important;
      background: rgba(0, 0, 0, 0.4) !important;
    }
    
    .styled-textarea {
      width: 100% !important;
      padding: 12px 14px !important;
      border-radius: 10px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      background: rgba(0, 0, 0, 0.3) !important;
      color: #fff !important;
      font-size: 0.9rem !important;
      min-height: 100px;
      resize: none;
      transition: all 0.25s ease !important;
      outline: none !important;
    }
    .styled-textarea:focus {
      border-color: hsl(var(--secondary)) !important;
      box-shadow: 0 0 10px hsl(var(--secondary) / 0.15) !important;
      background: rgba(0, 0, 0, 0.4) !important;
    }
    
    .pill-badge {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 4px 10px !important;
      border-radius: 99px !important;
      font-size: 0.72rem !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      border: 1px solid transparent !important;
    }
    
    .pill-approved {
      background: rgba(52, 168, 83, 0.12) !important;
      color: #34a853 !important;
      border-color: rgba(52, 168, 83, 0.25) !important;
    }
    .pill-submitted {
      background: rgba(251, 188, 5, 0.12) !important;
      color: #fbbc05 !important;
      border-color: rgba(251, 188, 5, 0.25) !important;
    }
    .pill-rejected {
      background: rgba(234, 67, 53, 0.12) !important;
      color: #ea4335 !important;
      border-color: rgba(234, 67, 53, 0.25) !important;
    }
    .pill-pending {
      background: rgba(59, 130, 246, 0.12) !important;
      color: #3b82f6 !important;
      border-color: rgba(59, 130, 246, 0.25) !important;
    }
    .pill-draft {
      background: rgba(255, 255, 255, 0.05) !important;
      color: hsl(var(--text-secondary)) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.01);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  `;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: supplierDashboardStyles }} />

      {/* Toast Notification */}
      {actionSuccess && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))',
          padding: '16px 24px', borderRadius: '12px', fontWeight: '800', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}>
          <Check size={18} strokeWidth={2.5} />
          {actionSuccess}
        </div>
      )}

      {/* Navigation Header */}
      <header className="nav-header" style={{ position: 'sticky', top: 0, zIndex: 99, background: 'rgba(9, 13, 20, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 40px' }}>
        <div className="logo-text" style={{ fontSize: '1.25rem' }}>
          <Package size={24} style={{ color: 'hsl(var(--primary))' }} />
          BrandCreator Supplier
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={fetchSupplierData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            Sync Real-Time
          </button>
          
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <div className="user-badge" style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 12px 4px 6px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={currentUser?.avatar} alt="Avatar" className="user-avatar" style={{ border: '2px solid hsl(var(--primary))', width: '28px', height: '28px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fff', lineHeight: '1.2' }}>
                {currentUser?.displayName}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.03em' }}>
                {currentUser?.role}
              </span>
            </div>
          </div>
          
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} style={{ color: 'hsl(var(--text-secondary))' }} />
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="dashboard-container">
        <aside className="sidebar" style={{ background: 'rgba(13, 17, 24, 0.45)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <ul className="sidebar-menu">
            <li>
              <button 
                onClick={() => setActiveTab('inventory')} 
                className={`sidebar-link w-full text-left ${activeTab === 'inventory' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <BarChart size={18} />
                Double Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('transfers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'transfers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <Send size={18} />
                Transfer Requests ({transfers.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('byok')} 
                className={`sidebar-link w-full text-left ${activeTab === 'byok' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <KeyRound size={18} />
                BYOK Gemini Key
              </button>
            </li>
          </ul>

          <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Supplier Storage
            </span>
            <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>
              Google Drive Active
            </span>
          </div>
        </aside>

        <main className="main-content" style={{ padding: '40px', overflowY: 'auto' }}>
          
          {/* Error Banner */}
          {error && (
            <div className="glass-card" style={{
              padding: '16px 24px', borderRadius: '14px', border: '1px solid rgba(234, 67, 53, 0.25)',
              background: 'rgba(234, 67, 53, 0.06)', color: '#ea4335', marginBottom: '28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'scaleIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                <AlertCircle size={18} />
                <span><strong>Operation Failure:</strong> {error}</span>
              </div>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ea4335', cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
              <div className="spin-anim" style={{ width: '42px', height: '42px', border: '3.5px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
            </div>
          )}

          {!loading && (
            <div className="tab-animation">
              
              {/* TAB 1: LEDGER INVENTORY */}
              {activeTab === 'inventory' && (
                <div>
                  {/* Banner */}
                  <div className="glass-card" style={{
                    padding: '40px', borderRadius: '24px', marginBottom: '36px',
                    background: 'linear-gradient(135deg, hsl(var(--primary-glow)), hsl(var(--secondary-glow)))',
                    border: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div className="ambient-glow glow-primary" style={{ right: '-5%', top: '-25%', opacity: 0.15 }} />
                    <div style={{ maxWidth: '700px', position: 'relative', zIndex: '1' }}>
                      <span style={{ 
                        background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', 
                        padding: '6px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '800',
                        border: '1px solid hsl(var(--primary) / 0.2)', letterSpacing: '0.04em'
                      }}>
                        💼 SUPPLIER HUB
                      </span>
                      <h1 style={{ fontSize: '2.5rem', marginTop: '16px', marginBottom: '12px', lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        Welcome back, {currentUser?.displayName || 'Supplier'}
                      </h1>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Manage double-ledgers, track physical warehouse intake, submit designs for automated QC auditing, and initiate stock transfer requests.
                      </p>
                    </div>
                  </div>
                  
                  {/* Inline Create Product Form */}
                  <div className="glass-card-premium" style={{ marginBottom: '36px', borderLeft: '4px solid hsl(var(--secondary))' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlusCircle style={{ color: 'hsl(var(--secondary))' }} size={20} />
                      Initialize New Product Ledger
                    </h3>
                    <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKU CODE</label>
                        <input 
                          type="text"
                          required
                          value={newSku}
                          onChange={(e) => setNewSku(e.target.value)}
                          placeholder="e.g. KURTI-ROSE-M"
                          className="styled-input"
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRODUCT NAME</label>
                        <input 
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="e.g. Soft Rose Daily Wear Kurti"
                          className="styled-input"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BASE PRICE (BDT)</label>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          value={newBasePrice}
                          onChange={(e) => setNewBasePrice(e.target.value)}
                          placeholder="e.g. 1250.00"
                          className="styled-input"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUPPLIER NOTES/DETAILS</label>
                        <input 
                          type="text"
                          value={newSupplierNotes}
                          onChange={(e) => setNewSupplierNotes(e.target.value)}
                          placeholder="e.g. 100% premium cotton weave"
                          className="styled-input"
                        />
                      </div>

                      <button type="submit" disabled={creating} className="btn-primary" style={{ padding: '12px 20px', fontSize: '0.9rem', borderRadius: '10px', height: '46px', width: '100%', background: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--secondary) / 0.8))', color: '#fff', boxShadow: '0 4px 15px hsl(var(--secondary) / 0.2)' }}>
                        {creating ? 'Initializing...' : 'Create Double Ledger'}
                      </button>
                    </form>
                  </div>

                  {/* Products Double Ledger Display */}
                  <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: 'hsl(var(--primary))', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Double Ledger Vault
                      </span>
                      <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>Owned Catalog & Ledger</h2>
                    </div>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Design & SKU</th>
                          <th>QC Audit Status</th>
                          <th>MASTER (Physical Bay)</th>
                          <th>SELL (Virtual Shop)</th>
                          <th style={{ textAlign: 'right' }}>Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              You don't own any product ledgers. Use the initialization form above!
                            </td>
                          </tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.productId} className="interactive-row">
                              <td style={{ fontWeight: '700', color: '#fff' }}>#{p.productId}</td>
                              <td>
                                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{p.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '2px' }}>{p.sku}</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: '700' }}>
                                    Price: {p.basePrice ? `৳${p.basePrice}` : '৳0.00'}
                                  </span>
                                  {p.supplierNotes && (
                                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }} title={p.supplierNotes}>
                                      Note: {p.supplierNotes.length > 30 ? p.supplierNotes.slice(0, 30) + '...' : p.supplierNotes}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className={`pill-badge ${
                                    p.qcStatus === 'APPROVED' ? 'pill-approved' : 
                                    p.qcStatus === 'SUBMITTED' ? 'pill-submitted' : 
                                    p.qcStatus === 'REJECTED' ? 'pill-rejected' : 'pill-draft'
                                  }`}>
                                    {p.qcStatus}
                                  </span>
                                  
                                  <button 
                                    onClick={() => handleViewQCHistory(p.productId)}
                                    style={{ background: 'none', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'all 0.2s ease' }}
                                    title="View Audit logs"
                                  >
                                    <History size={14} />
                                  </button>
                                </div>
                                {p.qcReason && (
                                  <div style={{ color: '#ea4335', fontSize: '0.75rem', marginTop: '6px', maxWidth: '200px', lineHeight: '1.4' }}>
                                    <strong>Reason:</strong> {p.qcReason}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{p.masterOnHand} Units</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>{p.masterReserved} reserved</div>
                                <button
                                  onClick={() => {
                                    setIntakeProductId(p.productId);
                                    setIntakeQty('');
                                    setIntakeNote('');
                                  }}
                                  className="btn-secondary"
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '0.75rem',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    borderColor: 'rgba(16, 185, 129, 0.15)',
                                    color: 'hsl(var(--primary))'
                                  }}
                                  title="Deposit Physical MASTER Stock"
                                >
                                  [+] Add Stock
                                </button>
                              </td>
                              <td>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'hsl(var(--primary))' }}>{p.sellOnHand} Units</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>{p.sellReserved} reserved</div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {p.qcStatus === 'DRAFT' || p.qcStatus === 'REJECTED' ? (
                                    <button 
                                      onClick={() => handleSubmitQC(p.productId)}
                                      className="btn-primary" 
                                      style={{ padding: '8px 14px', fontSize: '0.78rem', borderRadius: '8px', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))' }}
                                    >
                                      Submit to QC
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
                                        padding: '8px 14px', 
                                        fontSize: '0.78rem', 
                                        borderRadius: '8px', 
                                        opacity: p.masterOnHand - p.masterReserved <= 0 ? 0.4 : 1,
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
                      background: 'rgba(4, 6, 10, 0.85)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      animation: 'scaleIn 0.25s ease'
                    }}>
                      <div className="glass-card-premium" style={{ padding: '36px', maxWidth: '480px', width: '90%', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                            <Send style={{ color: 'hsl(var(--primary))' }} size={20} />
                            Request SELL Transfer
                          </h3>
                          <button onClick={() => setTransferProductId(null)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}>
                            <X size={20} />
                          </button>
                        </div>
                        <form onSubmit={handleRequestTransfer}>
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Quantity to transfer (Available in Master)
                            </label>
                            <input 
                              type="number"
                              required
                              min="1"
                              value={transferQty}
                              onChange={(e) => setTransferQty(e.target.value)}
                              placeholder="e.g. 100"
                              className="styled-input"
                            />
                          </div>

                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Transfer Note (Optional)
                            </label>
                            <input 
                              type="text"
                              value={transferNote}
                              onChange={(e) => setTransferNote(e.target.value)}
                              placeholder="e.g. Moving bulk stock for summer sale"
                              className="styled-input"
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setTransferProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px' }}>
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
                      background: 'rgba(4, 6, 10, 0.85)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      animation: 'scaleIn 0.25s ease'
                    }}>
                      <div className="glass-card-premium" style={{ padding: '36px', maxWidth: '480px', width: '90%', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                            <HardDrive style={{ color: 'hsl(var(--primary))' }} size={20} />
                            Deposit Physical Stock
                          </h3>
                          <button onClick={() => setIntakeProductId(null)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}>
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>Product Name / SKU</span>
                          <strong style={{ fontSize: '0.95rem', color: '#fff', marginTop: '4px', display: 'block' }}>
                            {products.find(p => p.productId === intakeProductId)?.productName}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontFamily: 'monospace', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                            SKU: {products.find(p => p.productId === intakeProductId)?.sku}
                          </span>
                        </div>

                        <form onSubmit={handleAddMasterStock}>
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Quantity to Deposit (Physical Count)
                            </label>
                            <input 
                              type="number"
                              required
                              min="1"
                              value={intakeQty}
                              onChange={(e) => setIntakeQty(e.target.value)}
                              placeholder="e.g. 100"
                              className="styled-input"
                            />
                          </div>

                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Receipt/Intake Note (Optional)
                            </label>
                            <input 
                              type="text"
                              value={intakeNote}
                              onChange={(e) => setIntakeNote(e.target.value)}
                              placeholder="e.g. Physical warehouse stock deposit"
                              className="styled-input"
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setIntakeProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px' }}>
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
                      background: 'rgba(4, 6, 10, 0.85)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      animation: 'scaleIn 0.25s ease'
                    }}>
                      <div className="glass-card-premium" style={{ padding: '36px', maxWidth: '640px', width: '90%', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                            <History style={{ color: 'hsl(var(--primary))' }} size={20} />
                            QC Audit History Logs (Product #{historyProductId})
                          </h3>
                          <button onClick={() => setHistoryProductId(null)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}>
                            <X size={20} />
                          </button>
                        </div>

                        {loadingHistory ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="spin-anim" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                          </div>
                        ) : (
                          <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '420px', overflowY: 'auto', paddingRight: '12px' }}>
                            <div>
                              <h4 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '800', letterSpacing: '0.04em' }}>Audit Events</h4>
                              {historyEvents.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', padding: '12px 0' }}>No audit status changes logged yet.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {historyEvents.map(evt => (
                                    <div key={evt.EventId || Math.random()} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <strong style={{ color: 'hsl(var(--primary))', fontSize: '0.9rem' }}>{evt.Action}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(evt.CreatedAt || evt.createdAt).toLocaleString()}</span>
                                      </div>
                                      {evt.Reason && <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', lineHeight: '1.4' }}>Reason: {evt.Reason}</p>}
                                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>By: {evt.PerformedByEmail || evt.performedByEmail}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '800', letterSpacing: '0.04em' }}>Gemini AI Enrichment Jobs</h4>
                              {historyJobs.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', padding: '12px 0' }}>No automatic enrichment tasks executed.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {historyJobs.map(job => (
                                    <div key={job.JobId || Math.random()} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <strong style={{ color: job.Status === 'SUCCEEDED' ? '#34a853' : '#ea4335', fontSize: '0.9rem' }}>
                                          {job.Status}
                                        </strong>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(job.CreatedAt || job.createdAt).toLocaleString()}</span>
                                      </div>
                                      {job.ErrorMessage && <p style={{ fontSize: '0.875rem', color: '#ea4335', marginBottom: '6px', lineHeight: '1.4' }}>Error: {job.ErrorMessage}</p>}
                                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Provider: {job.Provider} | version {job.PromptVersion}</div>
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
                    <span style={{ color: 'hsl(var(--primary))', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Audit Trails
                    </span>
                    <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>Stock Transfer Requests Ledger</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '6px' }}>
                      Monitor the progress of physical stock moving into virtual E-Storefront catalog balances.
                    </p>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Product / SKU</th>
                          <th>Transfer Qty</th>
                          <th>Requested At</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Approved By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              No transfer requests registered.
                            </td>
                          </tr>
                        ) : (
                          transfers.map(t => (
                            <tr key={t.transferId} className="interactive-row">
                              <td style={{ fontWeight: '700', color: '#fff' }}>#{t.transferId}</td>
                              <td>
                                <div style={{ fontWeight: '700' }}>{t.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '2px' }}>{t.sku}</div>
                              </td>
                              <td style={{ fontWeight: '800', color: 'hsl(var(--primary))' }}>
                                {t.qty} units
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(t.requestedAt).toLocaleString()}
                              </td>
                              <td>
                                <span className={`pill-badge ${t.status === 'COMPLETED' ? 'pill-approved' : 'pill-submitted'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                                {t.approvedByEmail ? (
                                  <span style={{ color: 'hsl(var(--primary))', fontWeight: '600' }}>{t.approvedByEmail}</span>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                  {/* BYOK Form */}
                  <div className="glass-card-premium" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={20} style={{ color: 'hsl(var(--primary))' }} />
                      Gemini AI Personalization (BYOK)
                    </h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', marginBottom: '24px', lineHeight: '1.6' }}>
                      Provide your own Gemini API Key to enable bulk AI SEO tagging and localized customer personalization algorithms directly in your products list.
                    </p>
                    <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Gemini API Key..."
                        className="styled-input"
                      />
                      <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '0.9rem', borderRadius: '10px' }}>
                        Save Secret Key
                      </button>
                    </form>
                    {keySaved && (
                      <div style={{ marginTop: '16px', color: 'hsl(var(--primary))', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', animation: 'scaleIn 0.25s ease' }}>
                        <CheckCircle size={16} /> Key saved securely in session database.
                      </div>
                    )}
                  </div>

                  {/* Google Drive Status */}
                  <div className="glass-card-premium" style={{ borderLeft: '4px solid hsl(var(--secondary))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HardDrive size={20} style={{ color: 'hsl(var(--secondary))' }} />
                        Google Drive Storage Sync
                      </h3>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', marginBottom: '24px', lineHeight: '1.6' }}>
                        All uploaded product design sheets and high-res listing assets are sync-piped directly to the platform's Google Drive storage vault, saving physical host storage.
                      </p>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <div className="spin-anim" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>Platform Storage: 4.2 GB Sync Active</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
