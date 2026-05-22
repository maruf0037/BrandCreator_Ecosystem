// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, AlertCircle, HelpCircle, Mail, Settings, 
  DollarSign, LogOut, Package, RefreshCw, Layers, Check, X, 
  ArrowRight, UserPlus, Sliders, AlertTriangle, Play, FileText, Send,
  MapPin, Target, Megaphone
} from 'lucide-react';
import { api } from '../services/api';

const adminDashboardStyles = `
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
    border-color: hsl(var(--primary) / 0.2) !important;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55), 0 0 20px hsl(var(--primary) / 0.08) !important;
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
    border-color: hsl(var(--primary)) !important;
    box-shadow: 0 0 10px hsl(var(--primary) / 0.15) !important;
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
    border-color: hsl(var(--primary)) !important;
    box-shadow: 0 0 10px hsl(var(--primary) / 0.15) !important;
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
  .pill-dlq {
    background: rgba(234, 67, 53, 0.15) !important;
    color: #ea4335 !important;
    border-color: rgba(234, 67, 53, 0.3) !important;
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
  const [locationProfiles, setLocationProfiles] = useState([]);
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
  const [selectedAdsProductId, setSelectedAdsProductId] = useState('');
  const [selectedAdsLocation, setSelectedAdsLocation] = useState('Uttara');
  const [locationAdsResult, setLocationAdsResult] = useState(null);
  const [locationAdsHistory, setLocationAdsHistory] = useState([]);
  const [locationAdsLoading, setLocationAdsLoading] = useState(false);

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
        healthData,
        locationProfileData
      ] = await Promise.all([
        api.get('/api/products').catch((err) => { pErrs.products = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transfers').catch((err) => { pErrs.transfers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/qc/queue').catch((err) => { pErrs.qcQueue = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/outbox').catch((err) => { pErrs.outbox = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/alerts/low-stock').catch((err) => { pErrs.alerts = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/orders').catch((err) => { pErrs.orders = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transactions').catch((err) => { pErrs.ledgers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/health/deep').catch((err) => { pErrs.systemHealth = err.message || 'Failed to load system health'; return null; }),
        api.get('/api/admin/location-ads/profiles').catch((err) => { pErrs.locationAds = err.message || 'Failed to load location market profiles'; return { items: [] }; })
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
      setLocationProfiles(locationProfileData.items || []);
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
      await api.post(`/api/outbox/${outboxId}/mark-sent`);
      showToast(`Outbox event #${outboxId} manually marked as SENT successfully.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to retry outbox event');
    }
  };

  const handleLoadLocationHistory = async (productId) => {
    if (!productId) {
      setLocationAdsHistory([]);
      return;
    }

    try {
      const data = await api.get(`/api/admin/location-ads/products/${productId}/suggestions`);
      setLocationAdsHistory(data.items || []);
    } catch (err) {
      setLocationAdsHistory([]);
      setPanelErrors((prev) => ({
        ...prev,
        locationAds: err.message || 'Failed to load previous location suggestions'
      }));
    }
  };

  const handleAnalyzeLocationAds = async (e) => {
    e.preventDefault();
    if (!selectedAdsProductId || !selectedAdsLocation.trim()) {
      setError('Select a product and target location before running ads analysis.');
      return;
    }

    try {
      setLocationAdsLoading(true);
      const data = await api.post('/api/admin/location-ads/analyze', {
        productId: Number(selectedAdsProductId),
        testedLocation: selectedAdsLocation.trim()
      });

      setLocationAdsResult(data.suggestion || null);
      showToast(`Location ads score generated for ${selectedAdsLocation.trim()}`);
      const historyData = await api.get(`/api/admin/location-ads/products/${selectedAdsProductId}/suggestions`);
      setLocationAdsHistory(historyData.items || []);
    } catch (err) {
      setError(err.message || 'Failed to analyze location ads opportunity');
    } finally {
      setLocationAdsLoading(false);
    }
  };

  const selectedAdsProduct = products.find((product) => String(product.productId) === String(selectedAdsProductId));
  const activeLocationSuggestion = locationAdsResult || locationAdsHistory[0] || null;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: adminDashboardStyles }} />

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
          <ShieldAlert size={24} style={{ color: 'hsl(var(--primary))' }} />
          BrandCreator Admin
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={fetchAllData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                onClick={() => setActiveTab('overview')} 
                className={`sidebar-link w-full text-left ${activeTab === 'overview' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <BarChart3 size={18} />
                Overview
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('products')} 
                className={`sidebar-link w-full text-left ${activeTab === 'products' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <Package size={18} />
                Double Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('qc')} 
                className={`sidebar-link w-full text-left ${activeTab === 'qc' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <AlertCircle size={18} />
                QC Queue ({qcQueue.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('transfers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'transfers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <Layers size={18} />
                Transfers ({transfers.filter(t => t.status === 'PENDING').length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('outbox')} 
                className={`sidebar-link w-full text-left ${activeTab === 'outbox' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <Send size={18} />
                Outbox / DLQ
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('ledgers')} 
                className={`sidebar-link w-full text-left ${activeTab === 'ledgers' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <FileText size={18} />
                Inventory Ledgers
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('locationAds')} 
                className={`sidebar-link w-full text-left ${activeTab === 'locationAds' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <MapPin size={18} />
                Location Ads
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`sidebar-link w-full text-left ${activeTab === 'orders' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <DollarSign size={18} />
                Orders ({orders.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('alerts')} 
                className={`sidebar-link w-full text-left ${activeTab === 'alerts' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <AlertTriangle size={18} />
                Low Stock Alerts ({lowStockAlerts.length})
              </button>
            </li>
          </ul>

          <div className="glass-card" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Platform Operations
            </span>
            <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>
              Console v1.2.0 • Active
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
                <span><strong>Platform Alert:</strong> {error}</span>
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
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
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
                        🛡️ SECURE ADMIN CONSOLE
                      </span>
                      <h1 style={{ fontSize: '2.5rem', marginTop: '16px', marginBottom: '12px', lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        Platform Control Center
                      </h1>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Welcome, {currentUser?.displayName || 'Administrator'}. Audit physical inventory vaults versus virtual selling buffers, confirm real-time double-ledgers, and track automated outbox queues.
                      </p>
                    </div>
                  </div>

                  {/* Real-time Statistics Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '36px' }}>
                    
                    <div className="glass-card-premium" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Products</span>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px' }}>
                          <Package size={18} style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800', letterSpacing: '-0.02em' }}>{products.length}</h2>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>Double-Ledger Synced</span>
                    </div>

                    <div className="glass-card-premium" style={{ borderLeft: `4px solid ${lowStockAlerts.length > 0 ? '#ea4335' : 'hsl(var(--primary))'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Low Stock Alerts</span>
                        <div style={{ background: lowStockAlerts.length > 0 ? 'rgba(234, 67, 53, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px' }}>
                          <AlertTriangle size={18} style={{ color: lowStockAlerts.length > 0 ? '#ea4335' : 'hsl(var(--primary))' }} />
                        </div>
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800', letterSpacing: '-0.02em', color: lowStockAlerts.length > 0 ? '#ea4335' : '#fff' }}>
                        {lowStockAlerts.length}
                      </h2>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>Under-threshold buffers</span>
                    </div>

                    <div className="glass-card-premium" style={{ borderLeft: `4px solid ${systemHealth?.outboxPending > 0 ? '#fbbc05' : 'hsl(var(--primary))'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Outbox</span>
                        <div style={{ background: systemHealth?.outboxPending > 0 ? 'rgba(251, 188, 5, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '8px' }}>
                          <Send size={18} style={{ color: systemHealth?.outboxPending > 0 ? '#fbbc05' : 'hsl(var(--primary))' }} />
                        </div>
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        {systemHealth?.outboxPending ?? outboxEvents.filter(e => e.status === 'PENDING').length}
                      </h2>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>
                        {systemHealth?.oldestOutboxAgeSec > 0 ? `${systemHealth.oldestOutboxAgeSec}s delivery lag` : 'No delivery delay'}
                      </span>
                    </div>

                    <div className="glass-card-premium" style={{ borderLeft: `4px solid ${systemHealth?.status === 'ok' ? 'hsl(var(--primary))' : '#ea4335'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SQL Server Ping</span>
                        <div style={{ background: systemHealth?.status === 'ok' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 67, 53, 0.1)', padding: '6px', borderRadius: '8px' }}>
                          <Sliders size={18} style={{ color: systemHealth?.status === 'ok' ? 'hsl(var(--primary))' : '#ea4335' }} />
                        </div>
                      </div>
                      <h2 style={{ fontSize: '2.25rem', marginBottom: '4px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        {systemHealth?.dbMs ? `${systemHealth.dbMs} ms` : 'Offline'}
                      </h2>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>
                        Status: <strong style={{ color: systemHealth?.status === 'ok' ? '#34a853' : '#ea4335' }}>{systemHealth?.status?.toUpperCase() || 'OFFLINE'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Core Diagnostic Matrices */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', marginBottom: '36px' }}>
                    
                    {/* System Health Telemetry Detailed Panel */}
                    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sliders size={20} style={{ color: 'hsl(var(--primary))' }} />
                        System Health & Telemetry
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>SQL Database Engine</span>
                          <span style={{ color: '#34a853', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853' }} />
                            Connected ({systemHealth?.dbMs || 0}ms)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Outbox Webhook Stream</span>
                          <span style={{ fontWeight: '700', color: systemHealth?.outboxPending > 0 ? '#fbbc05' : '#34a853', fontSize: '0.9rem' }}>
                            {systemHealth?.outboxPending || 0} Pending
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Active Webhook Key (KID)</span>
                          <span style={{ fontFamily: 'monospace', color: 'hsl(var(--primary))', fontSize: '0.9rem', fontWeight: '600' }}>
                            {systemHealth?.activeWebhookKeyId || 'wk_2026_05'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Chaos Resiliency Architecture</span>
                          <span style={{ color: '#34a853', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ACTIVE & SHIELDED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Placed Orders Panel */}
                    <div className="glass-card" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DollarSign size={20} style={{ color: 'hsl(var(--primary))' }} />
                        Recent Customer Orders
                      </h3>

                      {panelErrors.orders ? (
                        <div style={{ color: '#ea4335', padding: '24px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={18} />
                          <span>{panelErrors.orders}</span>
                        </div>
                      ) : orders.length === 0 ? (
                        <div style={{ color: 'hsl(var(--text-muted))', padding: '32px 0', fontStyle: 'italic', fontSize: '0.9rem', textCenter: 'center' }}>
                          No orders placed in storefront yet.
                        </div>
                      ) : (
                        <div className="premium-table-container">
                          <table className="premium-table">
                            <thead>
                              <tr>
                                <th>Order Ref</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orders.slice(0, 3).map(order => (
                                <tr key={order.orderId} className="interactive-row">
                                  <td style={{ fontWeight: '700', color: '#fff' }}>{order.orderRef}</td>
                                  <td style={{ fontWeight: '800', color: 'hsl(var(--primary))' }}>৳{order.totalAmount}</td>
                                  <td>
                                    <span className={`pill-badge ${order.status === 'CONFIRMED' ? 'pill-approved' : order.status === 'CANCELLED' ? 'pill-rejected' : 'pill-submitted'}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
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
                    <div className="glass-card" style={{ padding: '32px', marginBottom: '36px', border: '1px solid rgba(234, 67, 53, 0.25)', background: 'rgba(234, 67, 53, 0.02)' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#ea4335', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={20} />
                        Active Buffer Alerts (Low Stock Warning)
                      </h3>
                      <div className="premium-table-container">
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>SELL Stock</th>
                              <th>SELL Threshold</th>
                              <th>MASTER Stock</th>
                              <th>MASTER Threshold</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lowStockAlerts.map(alert => (
                              <tr key={alert.productId} className="interactive-row">
                                <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{alert.sku}</td>
                                <td style={{ color: alert.sellOnHand < alert.sellThreshold ? '#ea4335' : '#fff', fontWeight: '700' }}>
                                  {alert.sellOnHand} units
                                </td>
                                <td>{alert.sellThreshold}</td>
                                <td style={{ color: alert.masterOnHand < alert.masterThreshold ? '#ea4335' : '#fff', fontWeight: '700' }}>
                                  {alert.masterOnHand} units
                                </td>
                                <td>{alert.masterThreshold}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SuperAdmin Auto-Onboarding Audit Panel */}
                  <div className="glass-card" style={{ padding: '32px' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={20} style={{ color: 'hsl(var(--primary))' }} />
                      SuperAdmin Privilege Onboarding
                    </h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
                      In compliance with ecosystem specifications, any user session verified for the email account <strong>md.marufalrashid@gmail.com</strong> is auto-promoted to the global <strong>SuperAdmin</strong> role context in the engine.
                    </p>

                    <div className="premium-table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Security Verification Rule</th>
                            <th>Target Regular Match</th>
                            <th>Onboarding Privilege Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="interactive-row">
                            <td style={{ fontWeight: '700', color: '#fff' }}>Global system super privileges bypass</td>
                            <td style={{ fontFamily: 'monospace', color: 'hsl(var(--primary))', fontWeight: '600' }}>md.marufalrashid@gmail.com</td>
                            <td>
                              <span className="pill-badge pill-approved" style={{ fontSize: '0.75rem' }}>
                                ACTIVE AUTHMATCHED
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DOUBLE LEDGER PRODUCTS */}
              {activeTab === 'products' && (
                <div>
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Double Ledger Catalog</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Audit real-time physical counts (MASTER) versus dynamic virtual storefront storefront channels (SELL) side-by-side.
                    </p>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Product Details</th>
                          <th>Brand & Category</th>
                          <th>QC Status</th>
                          <th>Pricing Strategy</th>
                          <th>MASTER (Physical)</th>
                          <th>SELL (Virtual)</th>
                          <th>Supplier Owner</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.products ? (
                          <tr>
                            <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.products}
                            </td>
                          </tr>
                        ) : products.length === 0 ? (
                          <tr>
                            <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              No products initialized in database yet.
                            </td>
                          </tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.productId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: 'hsl(var(--text-secondary))' }}>#{p.productId}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {p.imageUrl ? (
                                    <img 
                                      src={p.imageUrl} 
                                      alt={p.productName} 
                                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                    />
                                  ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'hsl(var(--text-muted))', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                      No Image
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.925rem' }}>{p.productName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '4px', letterSpacing: '0.02em', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      <span>SKU: {p.sku}</span>
                                      {p.barcode && <span style={{ color: 'hsl(var(--primary))' }}>| Barcode: {p.barcode}</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '600', color: '#fff' }}>{p.brand || 'No Brand'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>{p.category || 'Uncategorized'}</div>
                              </td>
                              <td>
                                <span className={`pill-badge ${p.qcStatus === 'APPROVED' ? 'pill-approved' : p.qcStatus === 'SUBMITTED' ? 'pill-submitted' : p.qcStatus === 'REJECTED' ? 'pill-rejected' : 'pill-draft'}`}>
                                  {p.qcStatus}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Base Cost: <strong style={{ color: '#fff' }}>৳{p.basePrice || '0.00'}</strong></div>
                                  <div style={{ color: 'hsl(var(--text-secondary))' }}>RPU/MRP: <strong style={{ color: '#fbbc05' }}>৳{p.rpuMrp || '0.00'}</strong></div>
                                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Retail: <strong style={{ color: 'hsl(var(--primary))' }}>৳{p.suggestedRetailPrice || '0.00'}</strong></div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '700' }}>{p.masterOnHand} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'hsl(var(--text-muted))' }}>on-hand</span></div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>{p.masterReserved} reserved</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '700', color: 'hsl(var(--primary))' }}>{p.sellOnHand} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'hsl(var(--text-muted))' }}>on-hand</span></div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>{p.sellReserved} reserved</div>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>
                                {p.owners ? (
                                  <span style={{ color: 'hsl(var(--secondary))', fontFamily: 'monospace', fontWeight: '600' }}>{p.owners}</span>
                                ) : (
                                  <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Global Platform</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button 
                                    onClick={() => {
                                      setAssigningProductId(p.productId);
                                      setSupplierEmail('');
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <UserPlus size={12} /> Owner
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setPolicyProductId(p.productId);
                                      setSellThreshold(p.sellLowStockThreshold || 10);
                                      setMasterThreshold(p.masterLowStockThreshold || 20);
                                      setAlertEnabled(p.isAlertEnabled !== false);
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Sliders size={12} /> Thresholds
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
                      background: 'rgba(5, 7, 10, 0.82)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '460px', width: '90%', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <UserPlus style={{ color: 'hsl(var(--primary))' }} />
                          Assign Ownership (Product #{assigningProductId})
                        </h3>
                        <form onSubmit={(e) => handleAssignOwnership(e, assigningProductId)}>
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: '600' }}>
                              Supplier Email Address
                            </label>
                            <input 
                              type="email"
                              required
                              value={supplierEmail}
                              onChange={(e) => setSupplierEmail(e.target.value)}
                              placeholder="e.g. partner-supplier@brandcreator.com"
                              className="styled-input"
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setAssigningProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
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
                      background: 'rgba(5, 7, 10, 0.82)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '480px', width: '90%', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Sliders style={{ color: 'hsl(var(--primary))' }} />
                          Configure Alarm Policies (Product #{policyProductId})
                        </h3>
                        <form onSubmit={(e) => handleSetStockPolicy(e, policyProductId)}>
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: '600' }}>
                              SELL Ledger Low Stock Threshold
                            </label>
                            <input 
                              type="number"
                              required
                              min="0"
                              value={sellThreshold}
                              onChange={(e) => setSellThreshold(e.target.value)}
                              className="styled-input"
                            />
                          </div>
                          
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: '600' }}>
                              MASTER Ledger Low Stock Threshold
                            </label>
                            <input 
                              type="number"
                              required
                              min="0"
                              value={masterThreshold}
                              onChange={(e) => setMasterThreshold(e.target.value)}
                              className="styled-input"
                            />
                          </div>

                          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="checkbox"
                              id="alert_policy_check"
                              checked={alertEnabled}
                              onChange={(e) => setAlertEnabled(e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))', cursor: 'pointer' }}
                            />
                            <label htmlFor="alert_policy_check" style={{ fontSize: '0.875rem', color: 'hsl(var(--text-primary))', cursor: 'pointer', fontWeight: '500' }}>
                              Enable Platform Low Stock Alert Webhook
                            </label>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setPolicyProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
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
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>QC Audit Queue</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Audit submitted product designs. Approved products are instantly mapped to the Customer Store catalog, while rejected products are sent back with audit logs.
                    </p>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Product ID</th>
                          <th>Product Name</th>
                          <th>SKU Code</th>
                          <th>Owner Supplier</th>
                          <th>Submitted At</th>
                          <th style={{ textAlign: 'right' }}>Audit Decisions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.qcQueue ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.qcQueue}
                            </td>
                          </tr>
                        ) : qcQueue.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              All clear! No designs currently in the auditing queue.
                            </td>
                          </tr>
                        ) : (
                          qcQueue.map(item => (
                            <tr key={item.productId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: 'hsl(var(--text-secondary))' }}>#{item.productId}</td>
                              <td style={{ fontWeight: '700', color: '#fff' }}>{item.productName}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'hsl(var(--primary))' }}>{item.sku}</td>
                              <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{item.owners || 'Global System'}</td>
                              <td style={{ fontSize: '0.825rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(item.updatedAt).toLocaleString()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button 
                                    onClick={() => handleQCReview(item.productId, 'APPROVE')}
                                    className="btn-primary" 
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Check size={14} /> Approve
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setRejectReasonProductId(item.productId);
                                      setRejectReason('');
                                    }}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px', borderColor: 'rgba(234, 67, 53, 0.3)', color: '#ea4335', display: 'flex', alignItems: 'center', gap: '4px' }}
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
                      background: 'rgba(5, 7, 10, 0.82)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '32px', maxWidth: '460px', width: '90%', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
                        <h3 style={{ marginBottom: '16px', color: '#ea4335', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <X size={20} />
                          Reject Product QC (Product #{rejectReasonProductId})
                        </h3>
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: '600' }}>
                            Specify audit rejection comments (Required)
                          </label>
                          <textarea 
                            required
                            rows="4"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Provide design flaws or required corrections..."
                            className="styled-textarea"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setRejectReasonProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQCReview(rejectReasonProductId, 'REJECT', rejectReason)} 
                            className="btn-primary"
                            style={{ background: '#ea4335', color: '#fff', padding: '10px 20px', fontSize: '0.875rem' }}
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
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Warehouse Transfers</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Authorize physical stock transfers. Approving moves count balances from physical warehousing (MASTER) into sellable e-commerce channels (SELL).
                    </p>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Transfer ID</th>
                          <th>Product Name & SKU</th>
                          <th>Transfer Qty</th>
                          <th>Requested By</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Audit Actions</th>
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
                            <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              No transfer requests registered.
                            </td>
                          </tr>
                        ) : (
                          transfers.map(t => (
                            <tr key={t.transferId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: 'hsl(var(--text-secondary))' }}>#{t.transferId}</td>
                              <td>
                                <div style={{ fontWeight: '700', color: '#fff' }}>{t.productName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '2px' }}>{t.sku}</div>
                              </td>
                              <td style={{ fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '0.95rem' }}>
                                {t.qty} units
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                                {t.requestedByEmail}
                              </td>
                              <td>
                                <span className={`pill-badge ${t.status === 'COMPLETED' ? 'pill-approved' : 'pill-submitted'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {t.status === 'PENDING' ? (
                                  <button 
                                    onClick={() => handleApproveTransfer(t.transferId)}
                                    className="btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Check size={14} /> Approve Transfer
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>
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
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Outbox Telemetry & Dead Letter Queue (DLQ)</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Monitor asynchronous message delivery status. Force-retry failed webhooks, system alerts, and external synchronization triggers.
                    </p>
                  </div>

                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Event Type & Time</th>
                          <th>Aggregate Context</th>
                          <th>Retries</th>
                          <th>Status</th>
                          <th>Payload & Failures</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outboxEvents.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              All outbox streams are empty.
                            </td>
                          </tr>
                        ) : (
                          outboxEvents.map(evt => (
                            <tr key={evt.outboxId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: 'hsl(var(--text-secondary))' }}>#{evt.outboxId}</td>
                              <td>
                                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>{evt.eventType}</div>
                                <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                                  {new Date(evt.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.825rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>
                                {evt.aggregateType} ({evt.aggregateId})
                              </td>
                              <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                                {evt.retryCount} attempts
                              </td>
                              <td>
                                <span className={`pill-badge ${evt.status === 'SENT' ? 'pill-approved' : evt.status === 'DEAD_LETTER' ? 'pill-rejected' : 'pill-submitted'}`}>
                                  {evt.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', maxWidth: '320px' }}>
                                {evt.lastError && (
                                  <div style={{ color: '#ea4335', marginBottom: '6px', fontWeight: '600', wordBreak: 'break-all' }}>
                                    Error: {evt.lastError}
                                  </div>
                                )}
                                <div className="custom-scrollbar" style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', overflowX: 'auto', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  {evt.payloadJson}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {evt.status !== 'SENT' && (
                                  <button 
                                    onClick={() => handleRetryOutboxEvent(evt.outboxId)}
                                    className="btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Inventory Transaction Ledger</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Historical audit trail of all warehouse stock movements, allocations, reservations, and double-ledger balances.
                    </p>
                  </div>
                  
                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Tx ID</th>
                          <th>Type</th>
                          <th>Ledger Type</th>
                          <th>Product Context</th>
                          <th>Quantity</th>
                          <th>Audit Notes / Reason</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              No transactions recorded.
                            </td>
                          </tr>
                        ) : (
                          transactions.map(tx => (
                            <tr key={tx.transactionId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: 'hsl(var(--text-secondary))' }}>#{tx.transactionId}</td>
                              <td>
                                <span className={`pill-badge ${tx.transactionType === 'ADD' || tx.transactionType === 'IN' ? 'pill-approved' : tx.transactionType === 'SUBTRACT' || tx.transactionType === 'OUT' ? 'pill-rejected' : 'pill-submitted'}`}>
                                  {tx.transactionType}
                                </span>
                              </td>
                              <td style={{ fontWeight: '700', color: '#fff', fontSize: '0.85rem' }}>{tx.ledgerType}</td>
                              <td style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>Prod #{tx.productId}</td>
                              <td style={{ fontWeight: '800', fontSize: '0.95rem' }}>{tx.qty}</td>
                              <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>{tx.reason}</td>
                              <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
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

              {/* TAB 7: LOCATION ADS */}
              {activeTab === 'locationAds' && (
                <div>
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Location-wise Ads Command Center</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem', maxWidth: '860px' }}>
                      Admin-only marketing brain for testing where a supplier product should be promoted first. This does not spend ad money yet; it prepares location fit, audience interest, platform priority, and budget range before real campaign approval.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
                    <form onSubmit={handleAnalyzeLocationAds} className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#3b82f6'
                        }}>
                          <Target size={22} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Run Location Test</h3>
                          <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                            Product + location diye quick market fit score.
                          </p>
                        </div>
                      </div>

                      {panelErrors.locationAds && (
                        <div style={{
                          padding: '12px 14px', borderRadius: '12px', background: 'rgba(234, 67, 53, 0.08)',
                          color: '#ea4335', border: '1px solid rgba(234, 67, 53, 0.2)', fontSize: '0.82rem'
                        }}>
                          {panelErrors.locationAds}
                        </div>
                      )}

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Supplier Product
                        </span>
                        <select
                          value={selectedAdsProductId}
                          onChange={(e) => {
                            const productId = e.target.value;
                            setSelectedAdsProductId(productId);
                            setLocationAdsResult(null);
                            handleLoadLocationHistory(productId);
                          }}
                          className="styled-input"
                        >
                          <option value="">Select approved/catalog product</option>
                          {products.map((product) => (
                            <option key={product.productId} value={product.productId}>
                              {product.productName || product.sku} {product.sku ? `(${product.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Test Location
                        </span>
                        <select
                          value={selectedAdsLocation}
                          onChange={(e) => setSelectedAdsLocation(e.target.value)}
                          className="styled-input"
                        >
                          {locationProfiles.length === 0 && <option value="Uttara">Uttara</option>}
                          {locationProfiles.map((profile) => (
                            <option key={profile.profileId} value={profile.locationName}>
                              {profile.locationName} - {profile.city}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedAdsProduct && (
                        <div style={{
                          display: 'grid', gridTemplateColumns: '70px 1fr', gap: '14px', padding: '14px',
                          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px'
                        }}>
                          <img
                            src={selectedAdsProduct.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=200&auto=format&fit=crop'}
                            alt={selectedAdsProduct.productName}
                            style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }}
                          />
                          <div>
                            <div style={{ fontWeight: '900', color: '#fff', marginBottom: '4px' }}>{selectedAdsProduct.productName}</div>
                            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginBottom: '8px' }}>
                              {selectedAdsProduct.brand || 'No brand'} | {selectedAdsProduct.category || 'No category'} | {selectedAdsProduct.sku}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="pill-badge pill-pending">SELL {Math.max(0, Number(selectedAdsProduct.sellOnHand || 0) - Number(selectedAdsProduct.sellReserved || 0))}</span>
                              <span className="pill-badge pill-draft">MRP BDT {selectedAdsProduct.rpuMrp || selectedAdsProduct.basePrice || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={locationAdsLoading}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px' }}
                      >
                        {locationAdsLoading ? <RefreshCw size={16} className="spin-anim" /> : <Megaphone size={16} />}
                        {locationAdsLoading ? 'Analyzing location...' : 'Sync Location Ads Recommendation'}
                      </button>
                    </form>

                    <div className="glass-card-premium">
                      {!activeLocationSuggestion ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'hsl(var(--text-muted))' }}>
                          <MapPin size={42} style={{ color: 'hsl(var(--primary))', marginBottom: '14px' }} />
                          <h3 style={{ color: '#fff', marginBottom: '8px' }}>No recommendation yet</h3>
                          <p style={{ maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
                            Product select kore location sync korlei admin pabe best possible local audience, platform, budget, and risk view.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start' }}>
                            <div>
                              <span className={`pill-badge ${activeLocationSuggestion.riskLevel === 'LOW' ? 'pill-approved' : activeLocationSuggestion.riskLevel === 'HIGH' ? 'pill-rejected' : 'pill-submitted'}`}>
                                Risk {activeLocationSuggestion.riskLevel}
                              </span>
                              <h3 style={{ fontSize: '1.35rem', margin: '12px 0 6px' }}>
                                {activeLocationSuggestion.testedLocation} Market Fit
                              </h3>
                              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                {activeLocationSuggestion.reasonBangla || activeLocationSuggestion.reasonEnglish}
                              </p>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '120px' }}>
                              <div style={{
                                fontSize: '2.4rem', lineHeight: 1, fontWeight: '950', color: 'hsl(var(--primary))',
                                textShadow: '0 0 22px hsl(var(--primary) / 0.25)'
                              }}>
                                {activeLocationSuggestion.fitScore}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: 800 }}>
                                Fit Score
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Budget Test</div>
                              <div style={{ color: '#fff', fontWeight: 900, marginTop: '8px' }}>
                                BDT {activeLocationSuggestion.budgetSuggestion?.suggestedDailyBudgetMin || 0}-{activeLocationSuggestion.budgetSuggestion?.suggestedDailyBudgetMax || 0}/day
                              </div>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginTop: '4px' }}>
                                {activeLocationSuggestion.budgetSuggestion?.testDays || 0} days validation
                              </div>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Expected Orders</div>
                              <div style={{ color: '#fff', fontWeight: 900, marginTop: '8px' }}>
                                {activeLocationSuggestion.expectedResult?.expectedOrderRange || 'N/A'}
                              </div>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginTop: '4px' }}>
                                Reach {activeLocationSuggestion.expectedResult?.expectedReachRange || 'N/A'}
                              </div>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Freshness</div>
                              <div style={{ color: '#34a853', fontWeight: 900, marginTop: '8px' }}>
                                {activeLocationSuggestion.freshnessStatus || 'LIVE'}
                              </div>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginTop: '4px' }}>
                                {activeLocationSuggestion.lastAnalyzedAt ? new Date(activeLocationSuggestion.lastAnalyzedAt).toLocaleString() : 'Just now'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
                            <div>
                              <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Best Areas</h4>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(activeLocationSuggestion.suggestedAreas || []).map((area) => (
                                  <span key={area} className="pill-badge pill-approved">{area}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Customer Interests</h4>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(activeLocationSuggestion.interestTags || []).map((interest) => (
                                  <span key={interest} className="pill-badge pill-pending">{interest}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Expansion</h4>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(activeLocationSuggestion.nearbyExpansionAreas || []).map((area) => (
                                  <span key={area} className="pill-badge pill-draft">{area}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="premium-table-container">
                            <table className="premium-table">
                              <thead>
                                <tr>
                                  <th>Priority</th>
                                  <th>Platform</th>
                                  <th>Why</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(activeLocationSuggestion.platformSuggestion || []).map((platform) => (
                                  <tr key={`${platform.priority}-${platform.platformName}`}>
                                    <td style={{ fontWeight: '900', color: 'hsl(var(--primary))' }}>#{platform.priority}</td>
                                    <td style={{ fontWeight: '800', color: '#fff' }}>{platform.platformName}</td>
                                    <td style={{ color: 'hsl(var(--text-secondary))' }}>{platform.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {locationAdsHistory.length > 0 && (
                    <div style={{ marginTop: '26px' }} className="premium-table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Location</th>
                            <th>Score</th>
                            <th>Risk</th>
                            <th>Budget</th>
                            <th>Analyzed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationAdsHistory.slice(0, 8).map((item) => (
                            <tr key={item.suggestionId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: '#fff' }}>{item.testedLocation}</td>
                              <td style={{ color: 'hsl(var(--primary))', fontWeight: '900' }}>{item.fitScore}</td>
                              <td>
                                <span className={`pill-badge ${item.riskLevel === 'LOW' ? 'pill-approved' : item.riskLevel === 'HIGH' ? 'pill-rejected' : 'pill-submitted'}`}>
                                  {item.riskLevel}
                                </span>
                              </td>
                              <td>
                                BDT {item.budgetSuggestion?.suggestedDailyBudgetMin || 0}-{item.budgetSuggestion?.suggestedDailyBudgetMax || 0}/day
                              </td>
                              <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>
                                {new Date(item.createdAt || item.lastAnalyzedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: ORDERS */}
              {activeTab === 'orders' && (
                <div>
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Customer Order Management</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Monitor storefront customer orders, payment CAPTURE confirmations, and real-time buffer allocations.
                    </p>
                  </div>
                  
                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Order Ref</th>
                          <th>Customer Context</th>
                          <th>Total Amount</th>
                          <th>Order Status</th>
                          <th>Placement Date</th>
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
                            <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                              No orders found.
                            </td>
                          </tr>
                        ) : (
                          orders.map(order => (
                            <tr key={order.orderId} className="interactive-row">
                              <td style={{ fontWeight: '800', color: '#fff' }}>{order.orderRef}</td>
                              <td style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{order.customerEmail}</td>
                              <td style={{ fontWeight: '800', color: 'hsl(var(--primary))' }}>৳{order.totalAmount}</td>
                              <td>
                                <span className={`pill-badge ${order.status === 'CONFIRMED' ? 'pill-approved' : order.status === 'CANCELLED' ? 'pill-rejected' : 'pill-submitted'}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
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

              {/* TAB 9: ALERTS */}
              {activeTab === 'alerts' && (
                <div>
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Platform Low Stock Alerts</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Review active alarms for double-ledgers currently below safe buffer thresholds.
                    </p>
                  </div>
                  
                  {lowStockAlerts.length === 0 ? (
                    <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                      All stock levels are perfectly healthy!
                    </div>
                  ) : (
                    <div className="premium-table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>SKU Code</th>
                            <th>SELL Stock</th>
                            <th>SELL Safe Buffer</th>
                            <th>MASTER Stock</th>
                            <th>MASTER Safe Buffer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockAlerts.map(alert => (
                            <tr key={alert.productId} className="interactive-row">
                              <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#fff' }}>{alert.sku}</td>
                              <td style={{ padding: '20px', color: alert.sellOnHand < alert.sellThreshold ? '#ea4335' : '#fff', fontWeight: '700' }}>
                                {alert.sellOnHand} units
                              </td>
                              <td>{alert.sellThreshold}</td>
                              <td style={{ padding: '20px', color: alert.masterOnHand < alert.masterThreshold ? '#ea4335' : '#fff', fontWeight: '700' }}>
                                {alert.masterOnHand} units
                              </td>
                              <td>{alert.masterThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
