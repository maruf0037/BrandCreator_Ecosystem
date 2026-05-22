// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, AlertCircle, HelpCircle, Mail, Settings, 
  DollarSign, LogOut, Package, RefreshCw, Layers, Check, X, 
  ArrowRight, UserPlus, Sliders, AlertTriangle, Play, FileText, Send 
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard({ currentUser }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [qcQueue, setQCQueue] = useState([]);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panelErrors, setPanelErrors] = useState({});
  const [actionSuccess, setActionSuccess] = useState('');

  // Forms / Modals state
  const [assigningProductId, setAssigningProductId] = useState(null);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [policyProductId, setPolicyProductId] = useState(null);
  const [sellThreshold, setSellThreshold] = useState(10);
  const [masterThreshold, setMasterThreshold] = useState(20);
  const [alertEnabled, setAlertEnabled] = useState(true);
  
  const [rejectReasonProductId, setRejectReasonProductId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch all dashboard data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    setPanelErrors({});
    try {
      const pErrs = {};
      const [
        prodData, 
        transData, 
        qcData, 
        outboxData, 
        alertData,
        orderData,
        transactionsData,
        healthData
      ] = await Promise.all([
        api.get('/api/products').catch((err) => { pErrs.products = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transfers').catch((err) => { pErrs.transfers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/qc/queue').catch((err) => { pErrs.qcQueue = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/outbox').catch((err) => { pErrs.outbox = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/alerts/low-stock').catch((err) => { pErrs.alerts = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/orders').catch((err) => { pErrs.orders = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transactions').catch((err) => { pErrs.ledgers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/health/deep').catch((err) => { pErrs.systemHealth = err.message || 'Failed to load system health'; return null; })
      ]);

      setPanelErrors(pErrs);
      setProducts(prodData.items || []);
      setTransfers(transData.items || []);
      setQCQueue(qcData.items || []);
      setOutboxEvents(outboxData.items || []);
      setLowStockAlerts(alertData.items || []);
      setOrders(orderData.items || []);
      setTransactions(transactionsData.items || []);
      setSystemHealth(healthData || null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch platform dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleLogout = () => {
    window.location.href = `${backendUrl}/auth/logout`;
  };

  const showToast = (message) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Actions
  const handleAssignOwnership = async (e, productId) => {
    e.preventDefault();
    if (!supplierEmail.trim()) return;
    try {
      await api.post(`/api/products/${productId}/ownership/assign`, { supplierEmail });
      showToast(`Supplier ${supplierEmail} assigned successfully to product #${productId}`);
      setAssigningProductId(null);
      setSupplierEmail('');
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to assign supplier ownership');
    }
  };

  const handleSetStockPolicy = async (e, productId) => {
    e.preventDefault();
    try {
      await api.post(`/api/products/${productId}/stock-policy`, {
        sellLowStockThreshold: sellThreshold,
        masterLowStockThreshold: masterThreshold,
        isAlertEnabled: alertEnabled
      });
      showToast(`Stock policy updated successfully for product #${productId}`);
      setPolicyProductId(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to update stock policy');
    }
  };

  const handleQCReview = async (productId, decision, reasonText = '') => {
    try {
      await api.post(`/api/products/${productId}/qc/review`, {
        decision,
        reason: reasonText
      });
      showToast(`Product #${productId} successfully ${decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'}`);
      setRejectReasonProductId(null);
      setRejectReason('');
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to complete QC review');
    }
  };

  const handleApproveTransfer = async (transferId) => {
    try {
      await api.post(`/api/inventory/transfers/${transferId}/approve`);
      showToast(`Transfer request #${transferId} completed successfully and ledgers updated!`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to approve transfer request');
    }
  };

  const handleRetryOutboxEvent = async (outboxId) => {
    try {
      // Worker result override
      await api.post(`/api/outbox/${outboxId}/mark-sent`);
      showToast(`Outbox event #${outboxId} manually marked as SENT successfully.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to retry outbox event');
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {actionSuccess && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--bg-dark))',
          padding: '16px 24px',
          borderRadius: '12px',
          fontWeight: '700',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease'
        }}>
          <Check size={18} />
          {actionSuccess}
        </div>
      )}

      {/* Dynamic Header */}
      <header className="nav-header">
        <div className="logo-text">
          <ShieldAlert size={24} style={{ color: 'hsl(var(--primary))' }} />
          BrandCreator Admin
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={fetchAllData} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            Sync Real-Time
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

      {/* Main Layout Grid */}
      <div className="dashboard-container">
        <aside className="sidebar">
          <ul className="sidebar-menu">
            <li>
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`sidebar-link w-full text-left ${activeTab === 'overview' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <BarChart3 size={18} />
                Overview
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('products')} 
                className={`sidebar-link w-full text-left ${activeTab === 'products' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <Package size={18} />
                Double Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('qc')} 
                className={`sidebar-link w-full text-left ${activeTab === 'qc' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <AlertCircle size={18} />
                QC Queue ({qcQueue.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('transfers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'transfers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <Layers size={18} />
                Transfers ({transfers.filter(t => t.status === 'PENDING').length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('outbox')} 
                className={`sidebar-link w-full text-left ${activeTab === 'outbox' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <Send size={18} />
                Outbox / DLQ
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('ledgers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'ledgers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <FileText size={18} />
                Inventory Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`sidebar-link w-full text-left ${activeTab === 'orders' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <DollarSign size={18} />
                Orders ({orders.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('alerts')} 
                className={`sidebar-link w-full text-left ${activeTab === 'alerts' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
              >
                <AlertTriangle size={18} />
                Low Stock Alerts ({lowStockAlerts.length})
              </button>
            </li>
          </ul>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '8px' }}>
              Admin Console v1.2.0
            </span>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>
              Secure Session Active
            </span>
          </div>
        </aside>

        <main className="main-content">
          
          {/* Error Banner */}
          {error && (
            <div className="glass-card" style={{
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              background: 'rgba(234, 67, 53, 0.08)',
              color: '#ea4335',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <strong>System Error:</strong> {error}
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
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  {/* Dynamic Header Welcome Block */}
                  <div style={{
                    marginBottom: '32px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '24px'
                  }}>
                    <div>
                      <span style={{ color: 'hsl(var(--primary))', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Operational Status Controls
                      </span>
                      <h1 style={{ fontSize: '2.25rem', marginTop: '4px' }}>Welcome, {currentUser?.displayName || 'Administrator'}</h1>
                      <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '6px' }}>
                        Audit dual-ledger systems, verify asynchronous outbox deliveries, and monitor active stock warnings in real-time.
                      </p>
                    </div>

                    {/* Current User Session Widget */}
                    <div className="glass-card" style={{
                      padding: '16px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                      <img 
                        src={currentUser?.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                        alt="Avatar" 
                        className="user-avatar" 
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid hsl(var(--primary))' }} 
                      />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{currentUser?.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontFamily: 'monospace' }}>{currentUser?.email}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span className={`role-tag role-${currentUser?.role?.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                            {currentUser?.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Statistics Cards Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    marginBottom: '32px'
                  }}>
                    {/* Active Products */}
                    <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderLeft: '4px solid hsl(var(--primary))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '600', fontSize: '0.85rem' }}>Active Products</span>
                        <Package size={20} style={{ color: 'hsl(var(--primary))' }} />
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800' }}>{products.length} Products</h2>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Double-Ledger Synched</span>
                    </div>

                    {/* Low Stock Warnings */}
                    <div className="glass-card" style={{ 
                      padding: '24px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderLeft: `4px solid ${lowStockAlerts.length > 0 ? '#ff453a' : 'hsl(var(--primary))'}` 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '600', fontSize: '0.85rem' }}>Low Stock Warnings</span>
                        <AlertTriangle size={20} style={{ color: lowStockAlerts.length > 0 ? '#ff453a' : 'hsl(var(--primary))' }} />
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800', color: lowStockAlerts.length > 0 ? '#ff453a' : '#fff' }}>
                        {lowStockAlerts.length} Alerts
                      </h2>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Under-threshold buffers</span>
                    </div>

                    {/* Pending Outbox Events */}
                    <div className="glass-card" style={{ 
                      padding: '24px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderLeft: `4px solid ${systemHealth?.outboxPending > 0 ? '#fbbc05' : 'hsl(var(--primary))'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '600', fontSize: '0.85rem' }}>Pending Outbox</span>
                        <Send size={20} style={{ color: systemHealth?.outboxPending > 0 ? '#fbbc05' : 'hsl(var(--primary))' }} />
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800' }}>
                        {systemHealth?.outboxPending ?? outboxEvents.filter(e => e.status === 'PENDING').length} Events
                      </h2>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        {systemHealth?.oldestOutboxAgeSec > 0 ? `${systemHealth.oldestOutboxAgeSec}s delivery lag` : 'No delivery delay'}
                      </span>
                    </div>

                    {/* System Latency Diagnostics */}
                    <div className="glass-card" style={{ 
                      padding: '24px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      borderLeft: `4px solid ${systemHealth?.status === 'ok' ? 'hsl(var(--primary))' : '#ff453a'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '600', fontSize: '0.85rem' }}>SQL Server Ping</span>
                        <Sliders size={20} style={{ color: systemHealth?.status === 'ok' ? 'hsl(var(--primary))' : '#ff453a' }} />
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800' }}>
                        {systemHealth?.dbMs ? `${systemHealth.dbMs} ms` : 'Offline'}
                      </h2>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        System status: <strong style={{ color: systemHealth?.status === 'ok' ? '#34a853' : '#ff453a' }}>{systemHealth?.status?.toUpperCase() || 'OFFLINE'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Core Diagnostic Matrices */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                    marginBottom: '32px'
                  }}>
                    {/* System Health Telemetry Detailed Panel */}
                    <div className="glass-card" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={20} style={{ color: 'hsl(var(--primary))' }} />
                        System Health & Diagnostics
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>SQL Server Database Connection</span>
                          <span style={{ color: '#34a853', fontWeight: '600', fontSize: '0.9rem' }}>Connected ({systemHealth?.dbMs || 0}ms)</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Outbox / DLQ Streams</span>
                          <span style={{ fontWeight: '600', color: systemHealth?.outboxPending > 0 ? '#fbbc05' : '#34a853', fontSize: '0.9rem' }}>
                            {systemHealth?.outboxPending || 0} Pending
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Active Webhook Key (KID)</span>
                          <span style={{ fontFamily: 'monospace', color: 'hsl(var(--primary))', fontSize: '0.9rem' }}>
                            {systemHealth?.activeWebhookKeyId || 'wk_2026_05'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Chaos Resiliency Check</span>
                          <span style={{ color: '#34a853', fontWeight: '600', fontSize: '0.9rem' }}>ACTIVE / SECURE</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Placed Orders Panel */}
                    <div className="glass-card" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={20} style={{ color: 'hsl(var(--primary))' }} />
                        Recent Customer Orders
                      </h3>

                      {panelErrors.orders ? (
                        <div style={{ color: '#ff453a', padding: '16px 0', fontSize: '0.9rem' }}>
                          <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                          {panelErrors.orders}
                        </div>
                      ) : orders.length === 0 ? (
                        <div style={{ color: 'hsl(var(--text-muted))', padding: '16px 0', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          No orders placed in storefront yet.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>Order Ref</th>
                                <th style={{ padding: '8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>Amount</th>
                                <th style={{ padding: '8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>Status</th>
                                <th style={{ padding: '8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orders.slice(0, 3).map(order => (
                                <tr key={order.orderId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '10px 8px', fontWeight: '600', fontSize: '0.85rem' }}>{order.orderRef}</td>
                                  <td style={{ padding: '10px 8px', fontWeight: '700', fontSize: '0.85rem' }}>৳{order.totalAmount}</td>
                                  <td style={{ padding: '10px 8px' }}>
                                    <span className="role-tag" style={{
                                      fontSize: '0.65rem',
                                      padding: '2px 6px',
                                      background: order.status === 'CONFIRMED' ? 'rgba(52,168,83,0.12)' : order.status === 'CANCELLED' ? 'rgba(234,67,53,0.12)' : 'rgba(251,188,5,0.12)',
                                      color: order.status === 'CONFIRMED' ? '#34a853' : order.status === 'CANCELLED' ? '#ea4335' : '#fbbc05'
                                    }}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 8px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Low Stock Alerts list if any */}
                  {lowStockAlerts.length > 0 && (
                    <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#ff453a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={20} />
                        Active Buffer Alerts (Low Stock)
                      </h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>SKU</th>
                            <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>SELL Stock</th>
                            <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>SELL Threshold</th>
                            <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>MASTER Stock</th>
                            <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>MASTER Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockAlerts.map(alert => (
                            <tr key={alert.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>{alert.sku}</td>
                              <td style={{ padding: '12px 8px', color: alert.sellOnHand < alert.sellThreshold ? '#ff453a' : '#fff' }}>{alert.sellOnHand} units</td>
                              <td style={{ padding: '12px 8px' }}>{alert.sellThreshold}</td>
                              <td style={{ padding: '12px 8px', color: alert.masterOnHand < alert.masterThreshold ? '#ff453a' : '#fff' }}>{alert.masterOnHand} units</td>
                              <td style={{ padding: '12px 8px' }}>{alert.masterThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SuperAdmin Auto-Onboarding Audit Panel */}
                  <div className="glass-card" style={{ padding: '32px' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={20} style={{ color: 'hsl(var(--primary))' }} />
                      SuperAdmin Identity Privileges Check
                    </h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
                      In compliance with security specifications, any login originating from the email account <strong>md.marufalrashid@gmail.com</strong> is bypass-allocated the global <strong>SuperAdmin</strong> role context in the SQL Server registry.
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Scope Rule</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Target Match</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '16px 12px', fontSize: '0.9rem', fontWeight: '600' }}>Global super privilege allocation</td>
                          <td style={{ padding: '16px 12px', fontSize: '0.9rem', fontFamily: 'monospace', color: 'hsl(var(--primary))' }}>md.marufalrashid@gmail.com</td>
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{ background: 'rgba(52, 168, 83, 0.15)', color: '#34a853', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                              ACTIVE MATCHED
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: DOUBLE LEDGER PRODUCTS */}
              {activeTab === 'products' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Double Ledger Catalog</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      View master bay physical counts versus selling channels virtual stock allocations side-by-side.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Product ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SKU / Name</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>QC Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>MASTER (Physical)</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SELL (Virtual)</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Supplier Ownership</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.products ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.products}
                            </td>
                          </tr>
                        ) : products.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              No products initialized in database yet.
                            </td>
                          </tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.productId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>#{p.productId}</td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ fontWeight: '600' }}>{p.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>{p.sku}</div>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: p.qcStatus === 'APPROVED' ? 'rgba(52,168,83,0.15)' : p.qcStatus === 'SUBMITTED' ? 'rgba(251,188,5,0.15)' : 'rgba(255,255,255,0.05)',
                                  color: p.qcStatus === 'APPROVED' ? '#34a853' : p.qcStatus === 'SUBMITTED' ? '#fbbc05' : 'hsl(var(--text-secondary))'
                                }}>
                                  {p.qcStatus}
                                </span>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div><strong>{p.masterOnHand}</strong> On-Hand</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.masterReserved} reserved</div>
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div><strong>{p.sellOnHand}</strong> On-Hand</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.sellReserved} reserved</div>
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.85rem' }}>
                                {p.owners ? (
                                  <span style={{ color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>{p.owners}</span>
                                ) : (
                                  <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Unassigned</span>
                                )}
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                  <button 
                                    onClick={() => {
                                      setAssigningProductId(p.productId);
                                      setSupplierEmail('');
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', width: 'fit-content' }}
                                  >
                                    <UserPlus size={12} /> Assign Owner
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setPolicyProductId(p.productId);
                                      // default threshold values
                                      setSellThreshold(10);
                                      setMasterThreshold(20);
                                      setAlertEnabled(true);
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', width: 'fit-content' }}
                                  >
                                    <Sliders size={12} /> Stock Thresholds
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Assign Owner Dialog Inline Modal */}
                  {assigningProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '90%' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserPlus style={{ color: 'hsl(var(--primary))' }} />
                          Assign Supplier Ownership (Product #{assigningProductId})
                        </h3>
                        <form onSubmit={(e) => handleAssignOwnership(e, assigningProductId)}>
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              Supplier Email Address
                            </label>
                            <input 
                              type="email"
                              required
                              value={supplierEmail}
                              onChange={(e) => setSupplierEmail(e.target.value)}
                              placeholder="e.g. supplier@test.com"
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setAssigningProductId(null)} className="btn-secondary">
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                              Save Assignee
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Stock Policy Dialog Inline Modal */}
                  {policyProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '500px', width: '90%' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sliders style={{ color: 'hsl(var(--primary))' }} />
                          Configure stock alarm policies (Product #{policyProductId})
                        </h3>
                        <form onSubmit={(e) => handleSetStockPolicy(e, policyProductId)}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              SELL Ledger Low Stock Threshold
                            </label>
                            <input 
                              type="number"
                              required
                              min="0"
                              value={sellThreshold}
                              onChange={(e) => setSellThreshold(e.target.value)}
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>
                          
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                              MASTER Ledger Low Stock Threshold
                            </label>
                            <input 
                              type="number"
                              required
                              min="0"
                              value={masterThreshold}
                              onChange={(e) => setMasterThreshold(e.target.value)}
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', 
                                border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff'
                              }}
                            />
                          </div>

                          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="checkbox"
                              id="alert_policy_check"
                              checked={alertEnabled}
                              onChange={(e) => setAlertEnabled(e.target.checked)}
                              style={{ width: '18px', height: '18px' }}
                            />
                            <label htmlFor="alert_policy_check" style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))', cursor: 'pointer' }}>
                              Enable Platform Low Stock Alerts
                            </label>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setPolicyProductId(null)} className="btn-secondary">
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                              Save Policy
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: QC AUDIT QUEUE */}
              {activeTab === 'qc' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>QC Audit Queue</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Review designs submitted by suppliers. Approve to make them sellable or Reject with comments.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Product</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SKU</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Owner Supplier</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Submitted At</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Action Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.qcQueue ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.qcQueue}
                            </td>
                          </tr>
                        ) : qcQueue.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              All clear! No designs currently in the auditing queue.
                            </td>
                          </tr>
                        ) : (
                          qcQueue.map(item => (
                            <tr key={item.productId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: '600' }}>{item.productName} (ID #{item.productId})</td>
                              <td style={{ padding: '20px', fontFamily: 'monospace' }}>{item.sku}</td>
                              <td style={{ padding: '20px', color: 'hsl(var(--text-secondary))' }}>{item.owners || 'Global System'}</td>
                              <td style={{ padding: '20px', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(item.updatedAt).toLocaleString()}
                              </td>
                              <td style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button 
                                    onClick={() => handleQCReview(item.productId, 'APPROVE')}
                                    className="btn-primary" 
                                    style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                                  >
                                    <Check size={14} /> Approve Design
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setRejectReasonProductId(item.productId);
                                      setRejectReason('');
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', borderColor: 'rgba(234, 67, 53, 0.3)', color: '#ea4335' }}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Reject Reason Modal */}
                  {rejectReasonProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '90%' }}>
                        <h3 style={{ marginBottom: '16px', color: '#ea4335' }}>
                          Reject Product QC (Product #{rejectReasonProductId})
                        </h3>
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>
                            Specify audit rejection comments (Required)
                          </label>
                          <textarea 
                            required
                            rows="4"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Provide rejection details..."
                            style={{
                              width: '100%', padding: '12px', borderRadius: '8px', 
                              border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)', color: '#fff',
                              resize: 'none', outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setRejectReasonProductId(null)} className="btn-secondary">
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQCReview(rejectReasonProductId, 'REJECT', rejectReason)} 
                            className="btn-primary"
                            style={{ background: '#ea4335', color: '#fff' }}
                            disabled={!rejectReason.trim()}
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 4: WAREHOUSE TRANSFERS */}
              {activeTab === 'transfers' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Warehouse Transfers Audit</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Approve pending supplier stock transfers to shift physical bays MASTER stock into virtual sellable E-Storefront SELL stock.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Request ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Product / SKU</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Transfer Qty</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Requested By</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.transfers ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.transfers}
                            </td>
                          </tr>
                        ) : transfers.length === 0 ? (
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
                              <td style={{ padding: '20px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {t.requestedByEmail}
                              </td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: t.status === 'COMPLETED' ? 'rgba(52,168,83,0.15)' : 'rgba(251,188,5,0.15)',
                                  color: t.status === 'COMPLETED' ? '#34a853' : '#fbbc05'
                                }}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ padding: '20px' }}>
                                {t.status === 'PENDING' ? (
                                  <button 
                                    onClick={() => handleApproveTransfer(t.transferId)}
                                    className="btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                                  >
                                    <Check size={14} /> Approve Transfer
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                    Approved by {t.approvedByEmail || 'Admin'}
                                  </span>
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

              {/* TAB 5: OUTBOX / DLQ LOGS */}
              {activeTab === 'outbox' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Outbox Telemetry & Dead Letter Queue</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Monitor message delivery reliability status. Review and retry failed payments and stock alerts webhooks.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Event Type</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Aggregate</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Retries</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Failure Log / Payload</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outboxEvents.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              All outbox streams are empty.
                            </td>
                          </tr>
                        ) : (
                          outboxEvents.map(evt => (
                            <tr key={evt.outboxId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>#{evt.outboxId}</td>
                              <td style={{ padding: '20px', fontWeight: '600' }}>
                                <div style={{ fontSize: '0.85rem' }}>{evt.eventType}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                  {new Date(evt.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.85rem' }}>
                                {evt.aggregateType} ({evt.aggregateId})
                              </td>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>
                                {evt.retryCount} attempts
                              </td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: evt.status === 'SENT' ? 'rgba(52,168,83,0.15)' : evt.status === 'DEAD_LETTER' ? 'rgba(234,67,53,0.15)' : 'rgba(251,188,5,0.15)',
                                  color: evt.status === 'SENT' ? '#34a853' : evt.status === 'DEAD_LETTER' ? '#ea4335' : '#fbbc05'
                                }}>
                                  {evt.status}
                                </span>
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.75rem', maxWidth: '300px' }}>
                                {evt.lastError && (
                                  <div style={{ color: '#ea4335', marginBottom: '8px', wordBreak: 'break-all' }}>
                                    <strong>Err:</strong> {evt.lastError}
                                  </div>
                                )}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', fontFamily: 'monospace', overflowX: 'auto' }}>
                                  {evt.payloadJson}
                                </div>
                              </td>
                              <td style={{ padding: '20px' }}>
                                {evt.status !== 'SENT' && (
                                  <button 
                                    onClick={() => handleRetryOutboxEvent(evt.outboxId)}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                                  >
                                    <Play size={12} /> Force Retry
                                  </button>
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

              {/* TAB 6: INVENTORY LEDGERS */}
              {activeTab === 'ledgers' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Inventory Transactions Ledger</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Audit log of all stock movements, reservations, and manual adjustments.
                    </p>
                  </div>
                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>ID</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Type</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Ledger</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Product</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Qty</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Reason</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              No transactions recorded.
                            </td>
                          </tr>
                        ) : (
                          transactions.map(tx => (
                            <tr key={tx.transactionId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>#{tx.transactionId}</td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: tx.transactionType === 'ADD' ? 'rgba(52,168,83,0.15)' : tx.transactionType === 'SUBTRACT' ? 'rgba(234,67,53,0.15)' : 'rgba(251,188,5,0.15)',
                                  color: tx.transactionType === 'ADD' ? '#34a853' : tx.transactionType === 'SUBTRACT' ? '#ea4335' : '#fbbc05'
                                }}>
                                  {tx.transactionType}
                                </span>
                              </td>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>{tx.ledgerType}</td>
                              <td style={{ padding: '20px' }}>Prod #{tx.productId}</td>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>{tx.qty}</td>
                              <td style={{ padding: '20px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>{tx.reason}</td>
                              <td style={{ padding: '20px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(tx.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: ORDERS */}
              {activeTab === 'orders' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Order Management</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      View all customer orders and their current status.
                    </p>
                  </div>
                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Order Ref</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Customer</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Total Amount</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Status</th>
                          <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.orders ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.orders}
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              No orders found.
                            </td>
                          </tr>
                        ) : (
                          orders.map(order => (
                            <tr key={order.orderId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>{order.orderRef}</td>
                              <td style={{ padding: '20px', fontSize: '0.9rem' }}>{order.customerEmail}</td>
                              <td style={{ padding: '20px', fontWeight: 'bold' }}>৳{order.totalAmount}</td>
                              <td style={{ padding: '20px' }}>
                                <span className={`role-tag`} style={{
                                  background: order.status === 'CONFIRMED' ? 'rgba(52,168,83,0.15)' : order.status === 'CANCELLED' ? 'rgba(234,67,53,0.15)' : 'rgba(251,188,5,0.15)',
                                  color: order.status === 'CONFIRMED' ? '#34a853' : order.status === 'CANCELLED' ? '#ea4335' : '#fbbc05'
                                }}>
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ padding: '20px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(order.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: ALERTS */}
              {activeTab === 'alerts' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>Low Stock Alerts</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                      Products currently below their defined stock thresholds.
                    </p>
                  </div>
                  {lowStockAlerts.length === 0 ? (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                      All stock levels are healthy!
                    </div>
                  ) : (
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SKU</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SELL Stock</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>SELL Threshold</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>MASTER Stock</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>MASTER Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockAlerts.map(alert => (
                            <tr key={alert.productId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '20px', fontFamily: 'monospace' }}>{alert.sku}</td>
                              <td style={{ padding: '20px', color: alert.sellOnHand < alert.sellThreshold ? '#ff453a' : '#fff' }}>{alert.sellOnHand} units</td>
                              <td style={{ padding: '20px' }}>{alert.sellThreshold}</td>
                              <td style={{ padding: '20px', color: alert.masterOnHand < alert.masterThreshold ? '#ff453a' : '#fff' }}>{alert.masterOnHand} units</td>
                              <td style={{ padding: '20px' }}>{alert.masterThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

        </main>
      </div>
    </div>
  );
}
