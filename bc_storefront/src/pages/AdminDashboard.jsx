// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, AlertCircle, 
  DollarSign, LogOut, Package, RefreshCw, Layers, Check, X, 
  ArrowRight, UserPlus, Sliders, AlertTriangle, Play, FileText, Send,
  MapPin, Target, Megaphone, MessageCircle
} from 'lucide-react';
import { api } from '../services/api';
import { commissionApi } from '../services/commissionApi';

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
  const [pricingProducts, setPricingProducts] = useState([]);
  const [profitLedgerSummary, setProfitLedgerSummary] = useState(null);
  const [profitLedgerItems, setProfitLedgerItems] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [walletAuditReport, setWalletAuditReport] = useState(null);
  const [walletHistory, setWalletHistory] = useState([]);
  
  // Phase 2: Hybrid Model State
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueProducts, setRevenueProducts] = useState([]);
  const [revenueSuppliers, setRevenueSuppliers] = useState([]);
  const [revenueTimeline, setRevenueTimeline] = useState([]);
  const [revenueFilter, setRevenueFilter] = useState(''); // OWN vs SUPPLIER
  const [campaignRoiStats, setCampaignRoiStats] = useState([]);

  // UTM Generator State
  const [utmGeneratorProductId, setUtmGeneratorProductId] = useState('');
  const [utmGeneratorSource, setUtmGeneratorSource] = useState('');
  const [utmGeneratedLink, setUtmGeneratedLink] = useState('');
  const [utmCopied, setUtmCopied] = useState(false);
  
  const [commissionLedger, setCommissionLedger] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionFilters, setCommissionFilters] = useState({
    supplierEmail: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [commissionRates, setCommissionRates] = useState([]);
  const [commissionGlobalDefault, setCommissionGlobalDefault] = useState(10.00);
  const [commissionRateForm, setCommissionRateForm] = useState({
    supplierEmail: '',
    category: '',
    commissionRate: ''
  });
  const [settingRateLoading, setSettingRateLoading] = useState(false);

  const [topUpForm, setTopUpForm] = useState({
    txnType: 'ADMIN_TOP_UP',
    amount: '',
    notes: ''
  });
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panelErrors, setPanelErrors] = useState({});
  const [actionSuccess, setActionSuccess] = useState('');

  // POS (Physical Shop Sale) State
  const [posCart, setPosCart] = useState([]);
  const [posSelectedProductId, setPosSelectedProductId] = useState('');
  const [posSelectedQty, setPosSelectedQty] = useState(1);
  const [posSelectedPrice, setPosSelectedPrice] = useState('');
  const [posPhone, setPosPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('CASH');
  const [posCheckingOut, setPosCheckingOut] = useState(false);
  const [posError, setPosError] = useState(null);
  const [posSuccess, setPosSuccess] = useState('');

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
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    adminSellingPrice: '',
    adBudgetPlanned: '',
    platformCommission: '',
    deliveryOpsCost: '',
    discountAmount: ''
  });

  // Auto Price Recommendation state
  const [autoRecommendLoading, setAutoRecommendLoading] = useState(false);
  const [autoRecommendResult, setAutoRecommendResult] = useState(null);
  const [autoRecommendInputs, setAutoRecommendInputs] = useState({
    deliveryOpsCost: 60,
    paymentFee: 15,
    riskBuffer: 25,
    minimumProfitMargin: 15
  });

  // Campaign & Multi-location state variables
  const [campaigns, setCampaigns] = useState([]);
  const [multiLocationResults, setMultiLocationResults] = useState([]);
  const [multiLocationLoading, setMultiLocationLoading] = useState(false);
  const [campaignApproving, setCampaignApproving] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    selectedLocation: '',
    platform: 'Facebook',
    dailyBudgetBDT: '',
    expectedOrderRange: '1-5',
    suggestionId: null,
    notes: ''
  });

  // WhatsApp CRM state variables
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [whatsappHistory, setWhatsappHistory] = useState([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [whatsappWebhooks, setWhatsappWebhooks] = useState([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('order_confirmation');
  const [manualTemplatePhone, setManualTemplatePhone] = useState('');
  const [manualTemplateParams, setManualTemplateParams] = useState(['', '', '']);
  const [manualTemplateOrderId, setManualTemplateOrderId] = useState('');

  const fetchWhatsAppData = async () => {
    try {
      setWhatsappLoading(true);
      const [contactsData, templatesData, webhooksData] = await Promise.all([
        api.get('/api/admin/whatsapp/contacts').catch(() => ({ items: [] })),
        api.get('/api/admin/whatsapp/templates').catch(() => ({ items: [] })),
        api.get('/api/admin/whatsapp/webhook-events').catch(() => ({ items: [] }))
      ]);
      setWhatsappContacts(contactsData.items || []);
      setWhatsappTemplates(templatesData.items || []);
      setWhatsappWebhooks(webhooksData.items || []);
      
      // Auto-select contact if none selected
      if (contactsData.items && contactsData.items.length > 0 && !selectedContact) {
        handleSelectContact(contactsData.items[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load WhatsApp CRM datasets');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSelectContact = async (contact) => {
    setSelectedContact(contact);
    setManualTemplatePhone(contact.phone);
    try {
      const data = await api.get(`/api/admin/whatsapp/contacts/${contact.phone}/messages`);
      setWhatsappHistory(data.items || []);
    } catch (err) {
      setWhatsappHistory([]);
      setError(err.message || `Failed to sync chat history for ${contact.phone}`);
    }
  };

  const handleSendManualTemplate = async (e) => {
    e.preventDefault();
    if (!manualTemplatePhone) return;
    try {
      setWhatsappLoading(true);
      const cleanParams = manualTemplateParams.filter(p => p !== undefined && p !== null);
      const res = await api.post('/api/admin/whatsapp/send-template', {
        phone: manualTemplatePhone,
        templateName: selectedTemplateName,
        params: cleanParams,
        orderId: manualTemplateOrderId ? Number(manualTemplateOrderId) : null
      });
      
      if (res.success) {
        showToast(`Template ${selectedTemplateName} sent successfully!`);
        // Reset manual forms
        setManualTemplateOrderId('');
        setManualTemplateParams(['', '', '']);
        
        // Refresh contact history
        await fetchWhatsAppData();
        if (selectedContact) {
          await handleSelectContact(selectedContact);
        }
      } else {
        setError(res.result?.error || 'Failed to send template message');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while dispatching manual template');
    } finally {
      setWhatsappLoading(false);
    }
  };

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
        locationProfileData,
        pricingProductData,
        profitLedgerData,
        campaignData,
        walletData,
        walletAuditData,
        walletHistoryData
      ] = await Promise.all([
        api.get('/api/products').catch((err) => { pErrs.products = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transfers').catch((err) => { pErrs.transfers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/qc/queue').catch((err) => { pErrs.qcQueue = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/outbox').catch((err) => { pErrs.outbox = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/alerts/low-stock').catch((err) => { pErrs.alerts = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/orders').catch((err) => { pErrs.orders = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/api/inventory/transactions').catch((err) => { pErrs.ledgers = err.message || 'Access Denied / Failed to load'; return { items: [] }; }),
        api.get('/health/deep').catch((err) => { pErrs.systemHealth = err.message || 'Failed to load system health'; return null; }),
        api.get('/api/admin/location-ads/profiles').catch((err) => { pErrs.locationAds = err.message || 'Failed to load location market profiles'; return { items: [] }; }),
        api.get('/api/admin/pricing/products').catch((err) => { pErrs.pricing = err.message || 'Failed to load admin pricing products'; return { items: [] }; }),
        api.get('/api/admin/profit-ledger').catch((err) => { pErrs.profitLedger = err.message || 'Failed to load profit ledger'; return { items: [], summary: null }; }),
        api.get('/api/admin/campaigns').catch((err) => { pErrs.campaigns = err.message || 'Failed to load campaigns'; return { items: [] }; }),
        api.get('/api/admin/wallet/summary').catch((err) => { pErrs.wallet = err.message || 'Failed to load wallet'; return null; }),
        api.get('/api/admin/wallet/audit-report').catch((err) => { pErrs.walletAudit = err.message || 'Failed to load wallet audit report'; return null; }),
        api.get('/api/admin/wallet/history').catch((err) => { pErrs.walletHistory = err.message || 'Failed to load wallet history'; return { items: [] }; })
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
      setPricingProducts(pricingProductData.items || []);
      setProfitLedgerSummary(profitLedgerData.summary || null);
      setProfitLedgerItems(profitLedgerData.items || []);
      setCampaigns(campaignData.items || []);
      setWalletSummary(walletData || null);
      setWalletAuditReport(walletAuditData || null);
      setWalletHistory(walletHistoryData?.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch platform dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    setRevenueLoading(true);
    try {
      const [sum, prod, supp, time, roi] = await Promise.all([
        commissionApi.getRevenueSummary(),
        commissionApi.getRevenueByProduct(revenueFilter),
        commissionApi.getRevenueBySupplier(),
        commissionApi.getRevenueTimeline('daily'),
        commissionApi.getCampaignRoiStats().catch(err => {
          console.error('Error fetching campaign ROI stats, using fallback:', err);
          return { items: [] };
        })
      ]);
      setRevenueSummary(sum);
      setRevenueProducts(prod.items || []);
      setRevenueSuppliers(supp.items || []);
      setRevenueTimeline(time.items || []);
      setCampaignRoiStats(roi.items || []);
    } catch (err) {
      console.error('Error fetching revenue data:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  const fetchCommissionData = async () => {
    setCommissionLoading(true);
    try {
      const [ledg, rates, glob] = await Promise.all([
        commissionApi.getCommissionLedger(commissionFilters),
        commissionApi.getCommissionRates(),
        commissionApi.getGlobalDefault()
      ]);
      setCommissionLedger(ledg.items || []);
      setCommissionSummary(ledg.summary || null);
      setCommissionRates(rates.items || []);
      setCommissionGlobalDefault(glob.commissionRate || 10.00);
    } catch (err) {
      console.error('Error fetching commission data:', err);
    } finally {
      setCommissionLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueData();
    } else if (activeTab === 'commissions') {
      fetchCommissionData();
    }
  }, [activeTab, revenueFilter, commissionFilters]);

  const handleLogout = () => {
    window.location.href = `${backendUrl}/auth/logout`;
  };

  // POS Checkout Helpers
  const handleAddToPosCart = () => {
    if (!posSelectedProductId) {
      setPosError('Please select a product first.');
      return;
    }
    const product = products.find(p => p.productId === parseInt(posSelectedProductId, 10));
    if (!product) {
      setPosError('Selected product not found.');
      return;
    }
    const qty = parseInt(posSelectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setPosError('Quantity must be greater than zero.');
      return;
    }

    const price = parseFloat(posSelectedPrice || product.suggestedRetailPrice || product.rpuMrp || 0);
    if (isNaN(price) || price < 0) {
      setPosError('Price must be a valid non-negative number.');
      return;
    }

    const available = product.masterOnHand - (product.masterReserved || 0);
    const existing = posCart.find(item => item.productId === product.productId);
    const needed = (existing ? existing.qty : 0) + qty;

    if (needed > available) {
      setPosError(`Cannot add. Total requested qty (${needed}) exceeds available MASTER stock (${available}).`);
      return;
    }

    setPosError(null);
    setPosSuccess('');

    if (existing) {
      setPosCart(posCart.map(item => 
        item.productId === product.productId 
          ? { ...item, qty: needed, price } 
          : item
      ));
    } else {
      setPosCart([...posCart, {
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        qty,
        price
      }]);
    }

    setPosSelectedProductId('');
    setPosSelectedQty(1);
    setPosSelectedPrice('');
  };

  const handleRemoveFromPosCart = (productId) => {
    setPosCart(posCart.filter(item => item.productId !== productId));
    setPosError(null);
    setPosSuccess('');
  };

  const handlePosCheckout = async (e) => {
    if (e) e.preventDefault();
    if (posCart.length === 0) {
      setPosError('Cart is empty. Please add items to checkout.');
      return;
    }

    setPosCheckingOut(true);
    setPosError(null);
    setPosSuccess('');

    try {
      const orderRef = 'POS-ORD-' + Math.floor(100000 + Math.random() * 900000);
      const itemsPayload = posCart.map(item => ({
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.price
      }));

      await api.post('/api/orders', {
        orderRef,
        items: itemsPayload,
        currency: 'BDT',
        customerPhone: posPhone.trim() || null,
        saleChannel: 'PHYSICAL_SHOP',
        paymentMethod: posPaymentMethod
      });

      setPosSuccess(`Physical sale recorded successfully! Order Ref: ${orderRef}`);
      setPosCart([]);
      setPosPhone('');
      setPosPaymentMethod('CASH');
      
      // Update all dashboard statistics
      fetchAllData();
    } catch (err) {
      setPosError(err.message || 'Checkout failed. Please inspect quantities and try again.');
    } finally {
      setPosCheckingOut(false);
    }
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

  const handleTopUpSubmit = async (e) => {
    e.preventDefault();
    if (!topUpForm.amount || parseFloat(topUpForm.amount) <= 0) return;
    try {
      setTopUpLoading(true);
      await api.post('/api/admin/wallet/topup', {
        txnType: topUpForm.txnType,
        amount: parseFloat(topUpForm.amount),
        notes: topUpForm.notes
      });
      showToast(`Wallet topped up successfully with BDT ${topUpForm.amount}!`);
      setTopUpForm({ txnType: 'ADMIN_TOP_UP', amount: '', notes: '' });
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to process topup');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleReleaseMaturedProfit = async () => {
    try {
      const res = await api.post('/api/admin/wallet/release-matured-profit');
      showToast(res.message || 'Matured profits released successfully!');
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to release matured profits');
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
  const selectedPricingProduct = pricingProducts.find((product) => String(product.productId) === String(selectedAdsProductId));
  const activeLocationSuggestion = locationAdsResult || locationAdsHistory[0] || null;
  const toNumber = (value) => Number.parseFloat(value || 0) || 0;
  const supplierRpu = toNumber(selectedPricingProduct?.rpuMrp ?? selectedPricingProduct?.basePrice);
  const adminSellingPrice = toNumber(pricingForm.adminSellingPrice);
  const plannedAdsCost = toNumber(pricingForm.adBudgetPlanned);
  const deliveryOpsCost = toNumber(pricingForm.deliveryOpsCost);
  const discountAmount = toNumber(pricingForm.discountAmount);
  const projectedNetProfit = adminSellingPrice - supplierRpu - plannedAdsCost - deliveryOpsCost - discountAmount;
  const projectedMarginPercent = adminSellingPrice > 0 ? ((projectedNetProfit / adminSellingPrice) * 100) : 0;
  const sellAvailableForCommand = selectedAdsProduct
    ? Math.max(0, Number(selectedAdsProduct.sellOnHand || 0) - Number(selectedAdsProduct.sellReserved || 0))
    : 0;

  const getProfitBadge = () => {
    if (!selectedPricingProduct) return { label: 'SELECT PRODUCT', className: 'pill-draft' };
    if (sellAvailableForCommand <= 0) return { label: 'NO SELL STOCK', className: 'pill-rejected' };
    if (!activeLocationSuggestion) return { label: 'NEED LOCATION SYNC', className: 'pill-submitted' };
    if (projectedNetProfit <= 0) return { label: 'LOSS RISK', className: 'pill-rejected' };
    if (projectedMarginPercent < 15) return { label: 'LOW MARGIN', className: 'pill-submitted' };
    return { label: 'PROFIT GOOD', className: 'pill-approved' };
  };

  const hydratePricingForm = (productId) => {
    const product = pricingProducts.find((item) => String(item.productId) === String(productId));
    const fallbackPrice = product?.adminSellingPrice || product?.suggestedRetailPrice || product?.rpuMrp || product?.basePrice || '';
    setPricingForm({
      adminSellingPrice: fallbackPrice ? String(fallbackPrice) : '',
      adBudgetPlanned: product?.adBudgetPlanned ? String(product.adBudgetPlanned) : '',
      platformCommission: product?.platformCommission ? String(product.platformCommission) : '',
      deliveryOpsCost: product?.deliveryOpsCost ? String(product.deliveryOpsCost) : '',
      discountAmount: product?.discountAmount ? String(product.discountAmount) : ''
    });
  };

  const handleSelectAdsCommandProduct = (productId) => {
    setSelectedAdsProductId(productId);
    setLocationAdsResult(null);
    hydratePricingForm(productId);
    handleLoadLocationHistory(productId);
  };

  const handleSavePricingPlan = async (e) => {
    e.preventDefault();
    if (!selectedAdsProductId) {
      setError('Select a product before saving admin pricing plan.');
      return;
    }
    if (!pricingForm.adminSellingPrice) {
      setError('Admin selling price is required before saving campaign pricing.');
      return;
    }

    try {
      setPricingSaving(true);
      const data = await api.post(`/api/admin/pricing/products/${selectedAdsProductId}/plan`, {
        adminSellingPrice: toNumber(pricingForm.adminSellingPrice),
        adBudgetPlanned: toNumber(pricingForm.adBudgetPlanned),
        platformCommission: toNumber(pricingForm.platformCommission),
        deliveryOpsCost: toNumber(pricingForm.deliveryOpsCost),
        discountAmount: toNumber(pricingForm.discountAmount)
      });

      showToast(data.warning || 'Admin pricing and campaign profit plan saved.');
      await fetchAllData();
      hydratePricingForm(selectedAdsProductId);
    } catch (err) {
      setError(err.message || 'Failed to save admin pricing plan');
    } finally {
      setPricingSaving(false);
    }
  };

  const handleAutoRecommend = async (e) => {
    e.preventDefault();
    if (!selectedAdsProductId) {
      setError('Select a product first to run auto price recommendation.');
      return;
    }
    try {
      setAutoRecommendLoading(true);
      setAutoRecommendResult(null);
      const data = await api.post(`/api/admin/pricing/products/${selectedAdsProductId}/auto-recommend`, {
        deliveryOpsCost: Number(autoRecommendInputs.deliveryOpsCost),
        paymentFee: Number(autoRecommendInputs.paymentFee),
        riskBuffer: Number(autoRecommendInputs.riskBuffer),
        minimumProfitMargin: Number(autoRecommendInputs.minimumProfitMargin) / 100
      });
      setAutoRecommendResult(data);
      showToast(`Auto price calculated: BDT ${data.recommendedSellingPrice} recommended`);
    } catch (err) {
      setError(err.message || 'Failed to calculate auto price recommendation');
    } finally {
      setAutoRecommendLoading(false);
    }
  };

  const handleApplyAutoRecommend = () => {
    if (!autoRecommendResult) return;
    setPricingForm((prev) => ({
      ...prev,
      adminSellingPrice: String(autoRecommendResult.recommendedSellingPrice),
      adBudgetPlanned: String(autoRecommendResult.adsCostPerUnit),
      deliveryOpsCost: String(autoRecommendResult.deliveryOpsCost)
    }));
    showToast('Auto recommendation applied to pricing form. Review and Save Plan manually.');
  };

  const handleCompareLocations = async () => {
    if (!selectedAdsProductId) {
      setError('Select a product first to compare location fitness.');
      return;
    }
    try {
      setMultiLocationLoading(true);
      setMultiLocationResults([]);
      const locations = ['Uttara', 'Mirpur', 'Dhanmondi', 'Gulshan', 'Banani'];
      const promises = locations.map((loc) =>
        api.post('/api/admin/location-ads/analyze', {
          productId: Number(selectedAdsProductId),
          testedLocation: loc
        })
        .then((res) => res.suggestion)
        .catch((err) => ({
          testedLocation: loc,
          error: err.message || 'Analysis failed'
        }))
      );
      const results = await Promise.all(promises);
      setMultiLocationResults(results);
      showToast('Multi-location fitness comparison complete!');
    } catch (err) {
      setError(err.message || 'Failed to compare location ads opportunities');
    } finally {
      setMultiLocationLoading(false);
    }
  };

  const handleSelectLocationForCampaign = (sug) => {
    if (sug.error) return;
    setCampaignForm({
      selectedLocation: sug.testedLocation,
      platform: sug.platformSuggestion?.[0]?.platformName || 'Facebook',
      dailyBudgetBDT: String(sug.budgetSuggestion?.suggestedDailyBudgetMin || 500),
      expectedOrderRange: sug.expectedResult?.expectedOrderRange || '1-5',
      suggestionId: sug.suggestionId,
      notes: ''
    });
    // Sync the activeLocationSuggestion state so guard/profit calculations are instantly in sync
    setLocationAdsResult(sug);
    showToast(`Ecosystem location ${sug.testedLocation} selected for campaign approval workflow.`);
  };

  const handleApproveCampaign = async (e) => {
    e.preventDefault();
    if (!selectedAdsProductId) {
      setError('Select a product first.');
      return;
    }
    if (!campaignForm.selectedLocation || !campaignForm.platform || !campaignForm.dailyBudgetBDT) {
      setError('Location, platform, and daily budget are required.');
      return;
    }

    try {
      setCampaignApproving(true);
      const payload = {
        productId: Number(selectedAdsProductId),
        selectedLocation: campaignForm.selectedLocation,
        platform: campaignForm.platform,
        dailyBudgetBDT: Number(campaignForm.dailyBudgetBDT),
        expectedOrderRange: campaignForm.expectedOrderRange,
        suggestionId: campaignForm.suggestionId,
        fitScore: activeLocationSuggestion?.fitScore || 0,
        riskLevel: activeLocationSuggestion?.riskLevel || 'MEDIUM',
        notes: campaignForm.notes
      };

      const res = await api.post('/api/admin/campaigns/approve-test', payload);
      showToast(res.message || 'Campaign approved for test successfully! ✅');
      setCampaignForm({
        selectedLocation: '',
        platform: 'Facebook',
        dailyBudgetBDT: '',
        expectedOrderRange: '1-5',
        suggestionId: null,
        notes: ''
      });
      await fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to approve test campaign');
    } finally {
      setCampaignApproving(false);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId, status) => {
    try {
      const res = await api.post(`/api/admin/campaigns/${campaignId}/status`, { status });
      showToast(res.message || `Campaign status updated to ${status}`);
      await fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to update campaign status');
    }
  };

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
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease', display: 'none' }}
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
                onClick={() => setActiveTab('physicalSale')} 
                className={`sidebar-link w-full text-left ${activeTab === 'physicalSale' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <Layers size={18} style={{ color: 'hsl(var(--primary))' }} />
                POS / Physical Sale
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('revenue')} 
                className={`sidebar-link w-full text-left ${activeTab === 'revenue' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <BarChart3 size={18} style={{ color: '#ec4899' }} />
                Revenue Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('commissions')} 
                className={`sidebar-link w-full text-left ${activeTab === 'commissions' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <DollarSign size={18} style={{ color: '#10b981' }} />
                Commission Ledger
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
            <li>
              <button 
                onClick={() => setActiveTab('ads')} 
                className={`sidebar-link w-full text-left ${activeTab === 'ads' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <BarChart3 size={18} />
                Ads Command
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setActiveTab('whatsapp'); fetchWhatsAppData(); }} 
                className={`sidebar-link w-full text-left ${activeTab === 'whatsapp' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <MessageCircle size={18} />
                WhatsApp CRM
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

              {/* TAB 7: ADS COMMAND */}
              {activeTab === 'ads' && (
                <div>
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Admin Ads + Pricing + Profit Command Center</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem', maxWidth: '920px', lineHeight: 1.65 }}>
                      This is the admin brain of BrandCreator: supplier stock comes in, then admin decides selling price, ad budget, location strategy, platform priority, and expected BrandCreator profit before campaign approval.
                    </p>
                  </div>

                  {/* Phase 6: Ads Wallet & Profit Locking Dashboard Panel */}
                  <div style={{
                    background: 'rgba(234, 67, 53, 0.04)',
                    border: '1px solid rgba(234, 67, 53, 0.2)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#ea4335'
                  }}>
                    <AlertTriangle size={20} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                      Profit inside return window is not spendable. Only stable profit is usable for ads.
                    </span>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} style={{ color: 'hsl(var(--primary))' }} />
                        Ecosystem Wallet & Funding Telemetry
                      </h3>
                      <button
                        type="button"
                        onClick={handleReleaseMaturedProfit}
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.78rem', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        Release Matured Profits
                      </button>
                    </div>

                    {walletAuditReport?.maturationForecast && (
                      <div style={{ marginBottom: '28px', background: 'rgba(13, 17, 24, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px' }}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <RefreshCw size={14} style={{ color: 'hsl(var(--primary))' }} />
                          7-Day Dynamic Cash Flow Maturation Calendar
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                          {walletAuditReport.maturationForecast.map((day) => (
                            <div key={day.date} style={{
                              padding: '10px',
                              textAlign: 'center',
                              borderRadius: '10px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              background: day.amount > 0 ? 'rgba(52, 168, 83, 0.04)' : 'rgba(255,255,255,0.01)'
                            }}>
                              <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: '800' }}>
                                {day.dayName}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', marginTop: '1px' }}>
                                {day.date.substring(5)}
                              </div>
                              <div style={{ fontSize: '0.925rem', color: day.amount > 0 ? '#34a853' : '#fff', fontWeight: '900', margin: '4px 0 2px' }}>
                                ৳{day.amount.toFixed(0)}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>
                                {day.ordersCount} {day.ordersCount === 1 ? 'order' : 'orders'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      {[
                        ['Supplier Locked', walletSummary?.supplierPayableLocked || 0, 'Protected supplier liability wallet'],
                        ['Pending Profit', walletSummary?.pendingProfit || 0, 'Projected profit in return window'],
                        ['Stable Profit', walletSummary?.stableProfit || 0, 'Matured spendable profit'],
                        ['Return Window Risk', walletSummary?.returnWindowRisk || 0, 'Active return window exposure'],
                        ['Admin Top-up', walletSummary?.adminTopUp || 0, 'Admin manual balance top-ups'],
                        ['Supplier Deposit', walletSummary?.supplierCampaignDeposit || 0, 'Deposits for specific campaigns'],
                        ['Ads Spend Available', walletSummary?.adsSpendAvailable || 0, 'Total spendable campaign budget', true]
                      ].map(([label, value, desc, highlight]) => (
                        <div key={label} className="glass-card-premium" style={{ 
                          padding: '20px',
                          borderLeft: highlight ? '4px solid #34a853' : '1px solid rgba(255,255,255,0.05)',
                          background: highlight ? 'rgba(52, 168, 83, 0.05)' : 'rgba(13, 17, 24, 0.65)'
                        }}>
                          <div style={{ color: highlight ? '#34a853' : 'hsl(var(--text-muted))', fontSize: '0.74rem', fontWeight: '850', textTransform: 'uppercase' }}>
                            {label}
                          </div>
                          <div style={{ color: highlight ? '#34a853' : '#fff', fontWeight: '950', fontSize: '1.5rem', marginTop: '6px', marginBottom: '4px' }}>
                            BDT {Number(value || 0).toFixed(2)}
                          </div>
                          <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontStyle: 'italic' }}>
                            {desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {panelErrors.pricing && (
                    <div style={{
                      marginBottom: '18px', padding: '14px 16px', borderRadius: '14px',
                      background: 'rgba(234, 67, 53, 0.08)', border: '1px solid rgba(234, 67, 53, 0.22)',
                      color: '#ea4335', fontSize: '0.86rem', fontWeight: 700
                    }}>
                      {panelErrors.pricing}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(460px, 1.1fr)', gap: '24px', alignItems: 'start' }}>
                    <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(52, 168, 83, 0.12)',
                          border: '1px solid rgba(52, 168, 83, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#34a853'
                        }}>
                          <BarChart3 size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.12rem' }}>Campaign Product Control</h3>
                          <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                            Product select korle pricing, stock, and location intelligence same screen-e asbe.
                          </p>
                        </div>
                      </div>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Product
                        </span>
                        <select
                          value={selectedAdsProductId}
                          onChange={(e) => handleSelectAdsCommandProduct(e.target.value)}
                          className="styled-input"
                        >
                          <option value="">Select product for ads command</option>
                          {pricingProducts.map((product) => (
                            <option key={product.productId} value={product.productId}>
                              {product.productName || product.sku} {product.sku ? `(${product.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedPricingProduct ? (
                        <div style={{
                          display: 'grid', gridTemplateColumns: '72px 1fr', gap: '14px', padding: '14px',
                          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px'
                        }}>
                          <div style={{
                            width: '72px', height: '72px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(52,168,83,0.16))',
                            border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Package size={28} style={{ color: 'hsl(var(--primary))' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 950, color: '#fff', fontSize: '1rem', marginBottom: '5px' }}>
                              {selectedPricingProduct.productName}
                            </div>
                            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginBottom: '9px' }}>
                              {selectedPricingProduct.brand || 'No brand'} | {selectedPricingProduct.category || 'No category'} | {selectedPricingProduct.sku}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span className={`pill-badge ${getProfitBadge().className}`}>{getProfitBadge().label}</span>
                              <span className="pill-badge pill-pending">SELL {sellAvailableForCommand}</span>
                              <span className="pill-badge pill-draft">Supplier RPU BDT {supplierRpu.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.025)', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                          Select a product to start campaign pricing and ads intelligence.
                        </div>
                      )}

                      <form onSubmit={handleSavePricingPlan} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                        {[
                          ['Admin Selling Price', 'adminSellingPrice'],
                          ['Ads Budget Planned', 'adBudgetPlanned'],
                          ['Platform Commission', 'platformCommission'],
                          ['Delivery/Ops Cost', 'deliveryOpsCost'],
                          ['Discount Amount', 'discountAmount']
                        ].map(([label, key]) => (
                          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: key === 'discountAmount' ? 'span 2' : 'span 1' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '850', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {label}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pricingForm[key]}
                              onChange={(e) => setPricingForm((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="styled-input"
                              placeholder="0.00"
                            />
                          </label>
                        ))}

                        <button
                          type="submit"
                          disabled={pricingSaving || !selectedPricingProduct}
                          className="btn-primary"
                          style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px 18px' }}
                        >
                          {pricingSaving ? <RefreshCw size={16} className="spin-anim" /> : <DollarSign size={16} />}
                          {pricingSaving ? 'Saving pricing plan...' : 'Save Admin Pricing Plan'}
                        </button>
                      </form>
                    </div>

                    {/* Auto UTM Link Generator Widget */}
                    <div className="glass-card-premium" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'hsl(var(--primary))'
                        }}>
                          <Megaphone size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.12rem', color: '#fff' }}>Auto UTM Link Generator</h3>
                          <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                            Create unique campaign links for targeted tracking & dynamic ads
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Select Target Product
                          </span>
                          <select
                            value={utmGeneratorProductId}
                            onChange={(e) => {
                              setUtmGeneratorProductId(e.target.value);
                              setUtmGeneratedLink('');
                            }}
                            className="styled-input"
                          >
                            <option value="">Select product to generate link</option>
                            {pricingProducts.map((p) => (
                              <option key={p.productId} value={p.productId}>
                                {p.productName} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Campaign Source / UTM Tag
                          </span>
                          <input
                            type="text"
                            value={utmGeneratorSource}
                            onChange={(e) => {
                              setUtmGeneratorSource(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                              setUtmGeneratedLink('');
                            }}
                            placeholder="e.g. FB-ADS-DHANMONDI"
                            className="styled-input"
                          />
                          <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                            Alphanumeric with hyphens or underscores only. Auto-uppercased.
                          </span>
                        </label>

                        {/* Presets */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {['FB-ADS-DHANMONDI', 'FB-ADS-MIRPUR', 'FB-ADS-UTTARA', 'GOOGLE-SHOPPING', 'IG-INFLUENCER'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setUtmGeneratorSource(preset);
                                setUtmGeneratedLink('');
                              }}
                              className="pill-badge pill-draft"
                              style={{ border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={!utmGeneratorProductId || !utmGeneratorSource}
                          onClick={() => {
                            const storeOrigin = window.location.origin;
                            const generated = `${storeOrigin}/shop?productId=${utmGeneratorProductId}&utm_source=${utmGeneratorSource}`;
                            setUtmGeneratedLink(generated);
                            setUtmCopied(false);
                          }}
                          className="btn-secondary"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', marginTop: '4px' }}
                        >
                          <RefreshCw size={14} />
                          Generate Campaign Link
                        </button>

                        {utmGeneratedLink && (
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px',
                            background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.16)', borderRadius: '16px',
                            marginTop: '8px', animation: 'scaleIn 0.3s ease'
                          }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--primary))', textTransform: 'uppercase' }}>
                              Generated Campaign Tracking URL
                            </div>
                            <div style={{
                              fontSize: '0.8rem', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace',
                              background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              {utmGeneratedLink}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(utmGeneratedLink);
                                setUtmCopied(true);
                                setTimeout(() => setUtmCopied(false), 2000);
                              }}
                              className="btn-primary"
                              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px' }}
                            >
                              <Check size={14} style={{ display: utmCopied ? 'block' : 'none' }} />
                              {utmCopied ? 'Copied successfully!' : 'Copy to Clipboard'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div className="glass-card-premium">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div>
                            <span className={`pill-badge ${getProfitBadge().className}`}>{getProfitBadge().label}</span>
                            <h3 style={{ margin: '12px 0 6px', fontSize: '1.25rem' }}>Profit Simulator</h3>
                            <p style={{ margin: 0, color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineHeight: 1.6 }}>
                              Supplier RPU + ads budget + ops cost dhore BrandCreator projected net profit.
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 950, color: projectedNetProfit > 0 ? '#34a853' : '#ea4335' }}>
                              BDT {projectedNetProfit.toFixed(2)}
                            </div>
                            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase' }}>
                              Net Profit / Unit
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                          {[
                            ['Selling Price', adminSellingPrice],
                            ['Supplier Payable', supplierRpu],
                            ['Ads Cost', plannedAdsCost],
                            ['Delivery/Ops', deliveryOpsCost],
                            ['Discount', discountAmount],
                            ['Margin', `${projectedMarginPercent.toFixed(1)}%`]
                          ].map(([label, value]) => (
                            <div key={label} style={{ padding: '15px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                              <div style={{ color: '#fff', fontWeight: 950, marginTop: '7px' }}>
                                {typeof value === 'number' ? `BDT ${value.toFixed(2)}` : value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-card-premium">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.18rem' }}>Location + Platform Intelligence</h3>
                            <p style={{ margin: '6px 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.86rem' }}>
                              Sync korle real-time location recommendation and platform suggestion update hobe.
                            </p>
                          </div>
                          <span className={`pill-badge ${activeLocationSuggestion ? 'pill-approved' : 'pill-submitted'}`}>
                            {activeLocationSuggestion ? 'SYNCED' : 'NEED LOCATION SYNC'}
                          </span>
                        </div>

                        <form onSubmit={handleAnalyzeLocationAds} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '18px' }}>
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
                          <button
                            type="submit"
                            disabled={locationAdsLoading || !selectedAdsProductId}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}
                          >
                            {locationAdsLoading ? <RefreshCw size={15} className="spin-anim" /> : <MapPin size={15} />}
                            Sync
                          </button>
                        </form>

                        {activeLocationSuggestion ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '18px', alignItems: 'start' }}>
                            <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(59,130,246,0.09)', border: '1px solid rgba(59,130,246,0.22)' }}>
                              <div style={{ fontSize: '2rem', fontWeight: 950, color: 'hsl(var(--primary))' }}>{activeLocationSuggestion.fitScore}</div>
                              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 850, textTransform: 'uppercase' }}>Fit Score</div>
                            </div>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {(activeLocationSuggestion.suggestedAreas || []).slice(0, 4).map((area) => (
                                  <span key={area} className="pill-badge pill-approved">{area}</span>
                                ))}
                              </div>
                              <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '10px' }}>
                                {activeLocationSuggestion.reasonBangla || activeLocationSuggestion.reasonEnglish}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(activeLocationSuggestion.platformSuggestion || []).slice(0, 3).map((platform) => (
                                  <span key={platform.platformName} className="pill-badge pill-pending">
                                    #{platform.priority} {platform.platformName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '22px', textAlign: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', color: 'hsl(var(--text-muted))' }}>
                            Select product and sync a location to unlock platform and budget suggestions.
                          </div>
                        )}
                      </div>

                      {/* Topup wallet form */}
                      <div className="glass-card-premium" style={{ marginTop: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                          <DollarSign size={20} style={{ color: 'hsl(var(--primary))' }} />
                          <h3 style={{ margin: 0, fontSize: '1.18rem' }}>Admin / Supplier Wallet Top-up</h3>
                        </div>
                        <form onSubmit={handleTopUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase' }}>Transaction Type</span>
                            <select
                              value={topUpForm.txnType}
                              onChange={(e) => setTopUpForm(prev => ({ ...prev, txnType: e.target.value }))}
                              className="styled-input"
                            >
                              <option value="ADMIN_TOP_UP">Admin Top-up (ADMIN_TOP_UP)</option>
                              <option value="SUPPLIER_CAMPAIGN_DEPOSIT">Supplier Deposit (SUPPLIER_CAMPAIGN_DEPOSIT)</option>
                            </select>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase' }}>Amount (BDT)</span>
                            <input
                              type="number"
                              required
                              min="1"
                              max="1000000"
                              step="0.01"
                              placeholder="0.00"
                              value={topUpForm.amount}
                              onChange={(e) => setTopUpForm(prev => ({ ...prev, amount: e.target.value }))}
                              className="styled-input"
                            />
                            {Number(topUpForm.amount) > 1000000 && (
                              <span style={{ color: '#ea4335', fontSize: '0.75rem', fontWeight: '700', marginTop: '4px' }}>
                                ⚠️ Warning: Maximum top-up is BDT 1,000,000. Larger values will be blocked.
                              </span>
                            )}
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '850', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase' }}>Notes</span>
                            <input
                              type="text"
                              placeholder="Top-up reason, transaction reference..."
                              value={topUpForm.notes}
                              onChange={(e) => setTopUpForm(prev => ({ ...prev, notes: e.target.value }))}
                              className="styled-input"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={topUpLoading || Number(topUpForm.amount) > 1000000}
                            className="btn-primary"
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                          >
                            {topUpLoading ? <RefreshCw size={15} className="spin-anim" /> : <DollarSign size={15} />}
                            {topUpLoading ? 'Processing...' : 'Deposit Funding'}
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginTop: '24px' }}>
                    {[
                      ['Total Gross Revenue', profitLedgerSummary?.totalGrossRevenue || 0],
                      ['Supplier Payable', profitLedgerSummary?.totalSupplierPayable || 0],
                      ['Platform Commission', profitLedgerSummary?.totalPlatformCommissionRealized || 0],
                      ['Net Profit Realized', profitLedgerSummary?.totalNetProfitRealized || 0],
                      ['Return Loss', profitLedgerSummary?.totalReturnLoss || 0]
                    ].map(([label, value]) => (
                      <div key={label} className="glass-card-premium" style={{ padding: '20px' }}>
                        <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ color: label.includes('Loss') ? '#ea4335' : 'hsl(var(--primary))', fontWeight: 950, fontSize: '1.45rem', marginTop: '8px' }}>
                          BDT {Number(value || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unified Wallet History Audit Trail Table */}
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} style={{ color: 'hsl(var(--primary))' }} />
                      Unified Wallet Transaction & Profit Audit Trail
                    </h3>
                    <div className="premium-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Ref / ID</th>
                            <th>Txn Type</th>
                            <th>Flow</th>
                            <th>Amount</th>
                            <th>Initiator / Owner</th>
                            <th>Notes</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletHistory.length === 0 ? (
                            <tr>
                              <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                                No wallet audit trail entries found.
                              </td>
                            </tr>
                          ) : (
                            walletHistory.slice(0, 15).map((item) => (
                              <tr key={item.id} className="interactive-row">
                                <td style={{ fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
                                  {item.reference}
                                </td>
                                <td>
                                  <span className="pill-badge pill-draft" style={{ fontWeight: '850' }}>
                                    {item.txnType}
                                  </span>
                                </td>
                                <td>
                                  <span className={`pill-badge ${item.flowType === 'INFLOW' ? 'pill-approved' : 'pill-rejected'}`}>
                                    {item.flowType}
                                  </span>
                                </td>
                                <td style={{ fontWeight: '900', color: item.flowType === 'INFLOW' ? '#34a853' : '#ea4335' }}>
                                  ৳{item.amount.toFixed(2)}
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontFamily: 'monospace' }}>
                                  {item.createdBy}
                                </td>
                                <td style={{ fontSize: '0.825rem', color: 'hsl(var(--text-secondary))' }}>
                                  {item.notes}
                                </td>
                                <td style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                                  {new Date(item.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginTop: '32px' }} className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Admin Price</th>
                          <th>Supplier RPU</th>
                          <th>Ads Budget</th>
                          <th>Projected Profit</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingProducts.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                              No pricing products loaded yet.
                            </td>
                          </tr>
                        ) : pricingProducts.slice(0, 12).map((product) => {
                          const productCost = Number(product.rpuMrp || product.basePrice || 0);
                          const productNet = Number(product.netBrandCreatorProfit || 0);
                          return (
                            <tr key={product.productId} className="interactive-row">
                              <td>
                                <div style={{ fontWeight: 850, color: '#fff' }}>{product.productName}</div>
                                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.76rem' }}>{product.sku}</div>
                              </td>
                              <td style={{ fontWeight: 850 }}>BDT {Number(product.adminSellingPrice || product.suggestedRetailPrice || product.basePrice || 0).toFixed(2)}</td>
                              <td>BDT {productCost.toFixed(2)}</td>
                              <td>BDT {Number(product.adBudgetPlanned || 0).toFixed(2)}</td>
                              <td style={{ color: productNet > 0 ? '#34a853' : productNet < 0 ? '#ea4335' : 'hsl(var(--text-muted))', fontWeight: 950 }}>
                                BDT {productNet.toFixed(2)}
                              </td>
                              <td>
                                <span className={`pill-badge ${productNet > 0 ? 'pill-approved' : product.planStatus ? 'pill-submitted' : 'pill-draft'}`}>
                                  {product.planStatus || 'NO PLAN'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {profitLedgerItems.length > 0 && (
                    <div style={{ marginTop: '24px' }} className="premium-table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Product</th>
                            <th>Gross</th>
                            <th>Supplier</th>
                            <th>Ads Share</th>
                            <th>Net Profit</th>
                            <th>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profitLedgerItems.slice(0, 8).map((item) => (
                            <tr key={item.breakdownId} className="interactive-row">
                              <td style={{ fontFamily: 'monospace', fontWeight: 850 }}>{item.orderRef}</td>
                              <td>{item.productName}</td>
                              <td>BDT {Number(item.grossRevenue || 0).toFixed(2)}</td>
                              <td>BDT {Number(item.supplierPayable || 0).toFixed(2)}</td>
                              <td>BDT {Number(item.adSpendShare || 0).toFixed(2)}</td>
                              <td style={{ color: '#34a853', fontWeight: 950 }}>BDT {Number(item.netBrandCreatorProfit || 0).toFixed(2)}</td>
                              <td><span className="pill-badge pill-approved">{item.paymentStatus}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                   {/* AUTO PRICE RECOMMENDATION PANEL */}
                   <div style={{ marginTop: '32px' }}>
                     <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{
                         width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 188, 5, 0.12)',
                         border: '1px solid rgba(251, 188, 5, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbc05'
                       }}>
                         <DollarSign size={20} />
                       </div>
                       <div>
                         <h3 style={{ margin: 0, fontSize: '1.12rem' }}>Auto Price Recommendation Engine</h3>
                         <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                           Supplier RPU + Ads cost + Ops cost → minimum safe selling price at 15% profit protection.
                         </p>
                       </div>
                     </div>

                     <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.85fr) minmax(400px, 1.15fr)', gap: '24px', alignItems: 'start' }}>

                       {/* INPUT PANEL */}
                       <form onSubmit={handleAutoRecommend} className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                         <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.82rem', lineHeight: 1.6 }}>
                           Adjust cost inputs below. System will pull supplier RPU automatically from selected product + latest location ads suggestion.
                         </div>

                         {([
                           ['Delivery / Ops Cost (BDT)', 'deliveryOpsCost'],
                           ['Payment Gateway Fee (BDT)', 'paymentFee'],
                           ['Return / Risk Buffer (BDT)', 'riskBuffer'],
                           ['Minimum Profit Margin (%)', 'minimumProfitMargin']
                         ]).map(([label, key]) => (
                           <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                             <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                               {label}
                             </span>
                             <input
                               type="number"
                               min="0"
                               step={key === 'minimumProfitMargin' ? '1' : '1'}
                               value={autoRecommendInputs[key]}
                               onChange={(e) => setAutoRecommendInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                               className="styled-input"
                               placeholder={key === 'minimumProfitMargin' ? '15' : '0'}
                             />
                           </label>
                         ))}

                         <button
                           type="submit"
                           disabled={autoRecommendLoading || !selectedAdsProductId}
                           className="btn-primary"
                           style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '13px 18px' }}
                         >
                           {autoRecommendLoading ? <RefreshCw size={16} className="spin-anim" /> : <BarChart3 size={16} />}
                           {autoRecommendLoading ? 'Calculating...' : 'Calculate Safe Price'}
                         </button>
                       </form>

                       {/* RESULT PANEL */}
                       <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                         {!autoRecommendResult ? (
                           <div style={{ textAlign: 'center', padding: '40px 20px', color: 'hsl(var(--text-muted))' }}>
                             <DollarSign size={38} style={{ color: '#fbbc05', marginBottom: '12px' }} />
                             <h3 style={{ color: '#fff', marginBottom: '8px' }}>No recommendation yet</h3>
                             <p style={{ lineHeight: 1.6, maxWidth: '380px', margin: '0 auto' }}>
                               Select a product and click Calculate to get the minimum safe selling price with 15% profit guarantee.
                             </p>
                           </div>
                         ) : (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                             {/* Status Header */}
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                               <div>
                                 <span className={`pill-badge ${
                                   autoRecommendResult.status === 'PROFIT_GOOD' ? 'pill-approved' :
                                   autoRecommendResult.status === 'LOW_MARGIN' ? 'pill-submitted' :
                                   autoRecommendResult.status === 'NEED_LOCATION_SYNC' ? 'pill-pending' :
                                   'pill-rejected'
                                 }`}>
                                   {autoRecommendResult.status === 'PROFIT_GOOD' ? '✅ PROFIT GOOD' :
                                    autoRecommendResult.status === 'LOW_MARGIN' ? '⚠️ LOW MARGIN' :
                                    autoRecommendResult.status === 'NEED_LOCATION_SYNC' ? '🔄 NEED LOCATION SYNC' :
                                    autoRecommendResult.status === 'PRICE_BELOW_SAFE' ? '🚨 PRICE BELOW SAFE' :
                                    '🔴 LOSS RISK'}
                                 </span>
                                 <h3 style={{ margin: '10px 0 4px', fontSize: '1.1rem' }}>{autoRecommendResult.productName}</h3>
                                 <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>
                                   Based on: {autoRecommendResult.testedLocation} ads data
                                 </div>
                               </div>
                               <div style={{ textAlign: 'right', minWidth: '110px' }}>
                                 <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#34a853', lineHeight: 1 }}>
                                   BDT {autoRecommendResult.recommendedSellingPrice}
                                 </div>
                                 <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px' }}>
                                   Recommended Price
                                 </div>
                               </div>
                             </div>

                             {/* Warning */}
                             {autoRecommendResult.warning && (
                               <div style={{
                                 padding: '12px 14px', borderRadius: '12px',
                                 background: autoRecommendResult.status === 'PROFIT_GOOD' ? 'rgba(52,168,83,0.08)' : 'rgba(234, 67, 53, 0.08)',
                                 border: `1px solid ${autoRecommendResult.status === 'PROFIT_GOOD' ? 'rgba(52,168,83,0.2)' : 'rgba(234,67,53,0.2)'}`,
                                 color: autoRecommendResult.status === 'PROFIT_GOOD' ? '#34a853' : '#ea4335',
                                 fontSize: '0.83rem', lineHeight: 1.5
                               }}>
                                 {autoRecommendResult.warning}
                               </div>
                             )}

                             {/* Cost Breakdown Grid */}
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                               {[
                                 ['Supplier RPU/MRP', autoRecommendResult.supplierRpu],
                                 ['Ads Cost / Unit', autoRecommendResult.adsCostPerUnit],
                                 ['Delivery / Ops', autoRecommendResult.deliveryOpsCost],
                                 ['Payment Fee', autoRecommendResult.paymentFee],
                                 ['Risk Buffer', autoRecommendResult.riskBuffer],
                                 ['Total Cost', autoRecommendResult.totalCost]
                               ].map(([label, val]) => (
                                 <div key={label} style={{
                                   padding: '12px 14px', borderRadius: '12px',
                                   background: label === 'Total Cost' ? 'rgba(251,188,5,0.06)' : 'rgba(255,255,255,0.025)',
                                   border: `1px solid ${label === 'Total Cost' ? 'rgba(251,188,5,0.2)' : 'rgba(255,255,255,0.05)'}`
                                 }}>
                                   <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
                                   <div style={{ color: label === 'Total Cost' ? '#fbbc05' : '#fff', fontWeight: 950, marginTop: '5px' }}>
                                     BDT {Number(val || 0).toFixed(0)}
                                   </div>
                                 </div>
                               ))}
                             </div>

                             {/* Result Summary */}
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                               <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                                 <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Min Safe Price</div>
                                 <div style={{ color: 'hsl(var(--primary))', fontWeight: 950, fontSize: '1.2rem', marginTop: '6px' }}>BDT {autoRecommendResult.minimumSafePrice}</div>
                               </div>
                               <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.18)', textAlign: 'center' }}>
                                 <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Profit / Unit</div>
                                 <div style={{ color: '#34a853', fontWeight: 950, fontSize: '1.2rem', marginTop: '6px' }}>BDT {autoRecommendResult.expectedProfitPerUnit}</div>
                               </div>
                               <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.18)', textAlign: 'center' }}>
                                 <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Margin %</div>
                                 <div style={{ color: autoRecommendResult.expectedMarginPct >= 15 ? '#34a853' : '#fbbc05', fontWeight: 950, fontSize: '1.2rem', marginTop: '6px' }}>{autoRecommendResult.expectedMarginPct}%</div>
                               </div>
                             </div>

                             {/* Note */}
                             <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontStyle: 'italic', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                               {autoRecommendResult.breakdownNote}
                             </div>

                             <button
                               type="button"
                               onClick={handleApplyAutoRecommend}
                               className="btn-secondary"
                               style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '12px 18px', borderColor: 'rgba(52,168,83,0.3)', color: '#34a853' }}
                             >
                               <ArrowRight size={16} />
                               Apply to Pricing Form (then Save Plan manually)
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>

                    {/* PANEL A: MULTI-LOCATION COMPARISON */}
                    <div style={{ marginTop: '36px' }}>
                      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
                          }}>
                            <MapPin size={20} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.12rem' }}>Multi-Location Ads Opportunity Comparison</h3>
                            <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                              Compare market fitness and expected results across Uttara, Mirpur, Dhanmondi, Gulshan, and Banani in parallel.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCompareLocations}
                          disabled={multiLocationLoading || !selectedAdsProductId}
                          className="btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
                        >
                          {multiLocationLoading ? <RefreshCw size={15} className="spin-anim" /> : <Layers size={15} />}
                          Compare 5 locations
                        </button>
                      </div>

                      {multiLocationResults.length > 0 && (
                        <div className="premium-table-container tab-animation" style={{ marginBottom: '32px' }}>
                          <table className="premium-table">
                            <thead>
                              <tr>
                                <th>Location</th>
                                <th>Fit Score</th>
                                <th>Risk Level</th>
                                <th>Suggested Daily Budget</th>
                                <th>Expected Orders</th>
                                <th>Top Platform Recommendation</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {multiLocationResults.map((sug) => {
                                if (sug.error) {
                                  return (
                                    <tr key={sug.testedLocation}>
                                      <td style={{ fontWeight: '800', color: '#fff' }}>{sug.testedLocation}</td>
                                      <td colSpan="6" style={{ color: '#ea4335', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                        Error sync: {sug.error}
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={sug.testedLocation} className="interactive-row">
                                    <td style={{ fontWeight: '800', color: '#fff' }}>{sug.testedLocation}</td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                          fontSize: '1.1rem', fontWeight: '950',
                                          color: sug.fitScore >= 75 ? '#34a853' : sug.fitScore >= 55 ? '#fbbc05' : '#ea4335'
                                        }}>
                                          {sug.fitScore}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>/ 100</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`pill-badge ${
                                        sug.riskLevel === 'LOW' ? 'pill-approved' :
                                        sug.riskLevel === 'MEDIUM' ? 'pill-submitted' :
                                        'pill-rejected'
                                      }`}>
                                        {sug.riskLevel}
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: '750' }}>
                                      BDT {sug.budgetSuggestion?.suggestedDailyBudgetMin || 0} - {sug.budgetSuggestion?.suggestedDailyBudgetMax || 0}
                                    </td>
                                    <td style={{ fontWeight: '750', color: 'hsl(var(--primary))' }}>
                                      {sug.expectedResult?.expectedOrderRange || '0'}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {(sug.platformSuggestion || []).slice(0, 2).map((p) => (
                                          <span key={p.platformName} className="pill-badge pill-draft">
                                            {p.platformName}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectLocationForCampaign(sug)}
                                        className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderColor: 'rgba(59,130,246,0.3)', color: 'hsl(var(--primary))' }}
                                      >
                                        Select Target
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* PANEL B: CAMPAIGN APPROVAL WORKFLOW */}
                    <div style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(400px, 1.05fr)', gap: '24px', alignItems: 'start' }}>
                      {/* Approval Form */}
                      <form onSubmit={handleApproveCampaign} className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.12)',
                            border: '1px solid rgba(52, 168, 83, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853'
                          }}>
                            <Check size={20} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.12rem' }}>Ecosystem Campaign Approval</h3>
                            <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                              Approve draft campaign for testing. Auto-assigns APPROVED_FOR_TEST status if guards pass.
                            </p>
                          </div>
                        </div>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Location</span>
                          <input
                            type="text"
                            required
                            readOnly
                            placeholder="Select a location from comparison table above"
                            value={campaignForm.selectedLocation}
                            className="styled-input"
                            style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'hsl(var(--text-muted))', cursor: 'not-allowed' }}
                          />
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Platform</span>
                            <select
                              value={campaignForm.platform}
                              onChange={(e) => setCampaignForm((prev) => ({ ...prev, platform: e.target.value }))}
                              className="styled-input"
                            >
                              <option value="Facebook">Facebook</option>
                              <option value="Instagram">Instagram</option>
                              <option value="TikTok/Reels">TikTok/Reels</option>
                              <option value="Google Search">Google Search</option>
                              <option value="YouTube/Reels">YouTube/Reels</option>
                            </select>
                          </label>

                          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Daily Budget (BDT)</span>
                            <input
                              type="number"
                              required
                              min="1"
                              value={campaignForm.dailyBudgetBDT}
                              onChange={(e) => setCampaignForm((prev) => ({ ...prev, dailyBudgetBDT: e.target.value }))}
                              placeholder="500"
                              className="styled-input"
                            />
                          </label>
                        </div>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Campaign Approval Notes (Optional)</span>
                          <textarea
                            value={campaignForm.notes}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Specify target audience parameters, run duration or testing parameters..."
                            className="styled-textarea"
                            style={{ minHeight: '60px' }}
                          />
                        </label>

                        {/* Guard Checks Live Panel */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px'
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px', marginBottom: '2px' }}>
                            Ecosystem Campaign Validation Guards
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>1. Active Pricing Plan Exists</span>
                            {selectedPricingProduct && selectedPricingProduct.planStatus === 'ACTIVE' ? (
                              <span style={{ color: '#34a853', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> Active (BDT {Number(selectedPricingProduct.adminSellingPrice).toFixed(0)})
                              </span>
                            ) : (
                              <span style={{ color: '#ea4335', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Missing Active Plan
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>2. Target Location Synced</span>
                            {activeLocationSuggestion ? (
                              <span style={{ color: '#34a853', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> Synced ({activeLocationSuggestion.testedLocation})
                              </span>
                            ) : (
                              <span style={{ color: '#ea4335', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Need sync
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>3. SELL Available Stock &gt; 0</span>
                            {sellAvailableForCommand > 0 ? (
                              <span style={{ color: '#34a853', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> Available ({sellAvailableForCommand} units)
                              </span>
                            ) : (
                              <span style={{ color: '#ea4335', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Zero stock
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>4. Projected Net Margin &ge; 15%</span>
                            {projectedMarginPercent >= 15 ? (
                              <span style={{ color: '#34a853', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> Margin is {projectedMarginPercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: '#ea4335', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Low Margin ({projectedMarginPercent.toFixed(1)}%)
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>5. Spendable Ads Wallet Balance</span>
                            {(walletSummary?.adsSpendAvailable || 0) >= (Number(campaignForm.dailyBudgetBDT || 0) * 2) ? (
                              <span style={{ color: '#34a853', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> BDT {(walletSummary?.adsSpendAvailable || 0).toFixed(0)} available (&ge; ৳{Number(campaignForm.dailyBudgetBDT || 0) * 2})
                              </span>
                            ) : (
                              <span style={{ color: '#ea4335', fontSize: '0.82rem', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Insufficient (৳{(walletSummary?.adsSpendAvailable || 0).toFixed(0)} / ৳{Number(campaignForm.dailyBudgetBDT || 0) * 2})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={
                            campaignApproving ||
                            !selectedAdsProductId ||
                            !campaignForm.selectedLocation ||
                            !(selectedPricingProduct && selectedPricingProduct.planStatus === 'ACTIVE') ||
                            !activeLocationSuggestion ||
                            !(sellAvailableForCommand > 0) ||
                            !(projectedMarginPercent >= 15) ||
                            !((walletSummary?.adsSpendAvailable || 0) >= (Number(campaignForm.dailyBudgetBDT || 0) * 2))
                          }
                          className="btn-primary"
                          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'linear-gradient(135deg, #34a853, #1b7a32)', color: '#fff', border: 'none' }}
                        >
                          {campaignApproving ? <RefreshCw size={16} className="spin-anim" /> : <Megaphone size={16} />}
                          {campaignApproving ? 'Approving Campaign...' : 'Approve Test Campaign'}
                        </button>
                      </form>

                      {/* Active Campaigns Panel */}
                      <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 188, 5, 0.12)',
                            border: '1px solid rgba(251, 188, 5, 0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbc05'
                          }}>
                            <BarChart3 size={20} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.12rem' }}>Active Campaign Control</h3>
                            <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                              Ecosystem testing campaign status tracking & control.
                            </p>
                          </div>
                        </div>

                        {campaigns.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Megaphone size={28} style={{ color: 'hsl(var(--text-muted))' }} />
                            <span>No approved campaigns initialized yet.</span>
                          </div>
                        ) : (
                          <div className="custom-scrollbar" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {campaigns.map((camp) => (
                              <div key={camp.campaignId} style={{
                                padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontWeight: '850', color: '#fff', fontSize: '0.92rem' }}>{camp.productName}</div>
                                    <div style={{ fontSize: '0.76rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                                      Location: <strong>{camp.selectedLocation}</strong> | Platform: <strong>{camp.platform}</strong>
                                    </div>
                                  </div>
                                  <span className={`pill-badge ${
                                    camp.status === 'APPROVED_FOR_TEST' ? 'pill-approved' :
                                    camp.status === 'PAUSED' ? 'pill-submitted' :
                                    camp.status === 'COMPLETED' ? 'pill-draft' :
                                    'pill-pending'
                                  }`}>
                                    {camp.status}
                                  </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                  <div>
                                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Daily Budget</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>৳{camp.dailyBudgetBDT}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Total Budget</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>৳{camp.totalBudgetBDT}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Expected Orders</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'hsl(var(--primary))', marginTop: '2px' }}>{camp.expectedOrderRange}</div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '2px' }}>
                                  <span>Approved by: <strong>{camp.approvedByAdmin}</strong></span>
                                  
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {camp.status === 'APPROVED_FOR_TEST' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateCampaignStatus(camp.campaignId, 'PAUSED')}
                                        className="btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'rgba(251, 188, 5, 0.3)', color: '#fbbc05' }}
                                      >
                                        Pause
                                      </button>
                                    )}
                                    {camp.status === 'PAUSED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateCampaignStatus(camp.campaignId, 'APPROVED_FOR_TEST')}
                                        className="btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'rgba(52, 168, 83, 0.3)', color: '#34a853' }}
                                      >
                                        Resume
                                      </button>
                                    )}
                                    {(camp.status === 'APPROVED_FOR_TEST' || camp.status === 'PAUSED') && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateCampaignStatus(camp.campaignId, 'COMPLETED')}
                                        className="btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'hsl(var(--text-secondary))' }}
                                      >
                                        Complete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>


                </div>
              )}

              {/* TAB 8: LOCATION ADS */}
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

              {/* TAB 9.5: POS / PHYSICAL SALE */}
              {activeTab === 'physicalSale' && (
                <div className="tab-animation">
                  <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>POS / Physical Shop Sale</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                      Record instant walk-in physical sales directly reducing MASTER stock pool.
                    </p>
                  </div>

                  {posError && (
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(234, 67, 53, 0.1)', borderColor: 'rgba(234, 67, 53, 0.25)', color: '#ea4335', marginBottom: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={18} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{posError}</span>
                    </div>
                  )}

                  {posSuccess && (
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(52, 168, 83, 0.1)', borderColor: 'rgba(52, 168, 83, 0.25)', color: '#34a853', marginBottom: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={18} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{posSuccess}</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '30px', alignItems: 'start' }}>
                    {/* Left Column: Product Selector & Add Form */}
                    <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        Add Product to Cart
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>SELECT PRODUCT</label>
                        <select 
                          value={posSelectedProductId} 
                          onChange={(e) => {
                            setPosSelectedProductId(e.target.value);
                            const prod = products.find(p => p.productId === parseInt(e.target.value, 10));
                            if (prod) {
                              setPosSelectedPrice(prod.suggestedRetailPrice || prod.rpuMrp || '');
                            } else {
                              setPosSelectedPrice('');
                            }
                          }}
                          className="styled-input"
                          style={{ textTransform: 'none' }}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.filter(p => p.qcStatus === 'APPROVED').map(p => {
                            const avail = p.masterOnHand - (p.masterReserved || 0);
                            return (
                              <option key={p.productId} value={p.productId} disabled={avail <= 0}>
                                {p.productName} (SKU: {p.sku}) | Stock: {avail} units | SRP: ৳{p.suggestedRetailPrice || '0.00'}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>QUANTITY</label>
                          <input 
                            type="number" 
                            min="1"
                            value={posSelectedQty} 
                            onChange={(e) => setPosSelectedQty(parseInt(e.target.value, 10) || 1)}
                            className="styled-input" 
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>UNIT PRICE (৳)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Default to Retail"
                            value={posSelectedPrice} 
                            onChange={(e) => setPosSelectedPrice(e.target.value)}
                            className="styled-input" 
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleAddToPosCart}
                        className="btn-primary"
                        style={{ marginTop: '10px', padding: '12px' }}
                      >
                        Add to Cart
                      </button>
                    </div>

                    {/* Right Column: POS Cart & Checkout */}
                    <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>POS Cart</span>
                        <span style={{ fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', color: 'hsl(var(--primary))' }}>
                          {posCart.reduce((sum, item) => sum + item.qty, 0)} items
                        </span>
                      </h3>

                      {posCart.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                          POS Cart is empty. Select products on the left.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }} className="custom-scrollbar">
                            {posCart.map(item => (
                              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div>
                                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#fff' }}>{item.productName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '3px' }}>
                                    {item.qty} units × ৳{item.price}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontWeight: '700', color: '#fff' }}>৳{item.qty * item.price}</span>
                                  <button 
                                    onClick={() => handleRemoveFromPosCart(item.productId)}
                                    style={{ background: 'rgba(234, 67, 53, 0.1)', border: 'none', color: '#ea4335', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Total Display */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>TOTAL AMOUNT</span>
                              <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(var(--primary))' }}>
                                ৳{posCart.reduce((sum, item) => sum + (item.price * item.qty), 0)}
                              </span>
                            </div>

                            {/* Customer Phone & Payment Method */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>CUSTOMER PHONE (OPTIONAL)</label>
                                <input 
                                  type="text" 
                                  placeholder="017xxxxxxxx"
                                  value={posPhone} 
                                  onChange={(e) => setPosPhone(e.target.value)}
                                  className="styled-input" 
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700' }}>PAYMENT METHOD</label>
                                <select 
                                  value={posPaymentMethod} 
                                  onChange={(e) => setPosPaymentMethod(e.target.value)}
                                  className="styled-input"
                                >
                                  <option value="CASH">CASH</option>
                                  <option value="CARD">CARD</option>
                                  <option value="BKASH">BKASH</option>
                                </select>
                              </div>
                            </div>

                            <button 
                              onClick={handlePosCheckout}
                              disabled={posCheckingOut}
                              className="btn-primary"
                              style={{ padding: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                              <Check size={18} />
                              {posCheckingOut ? 'Recording...' : 'Confirm Physical Sale'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: REVENUE DASHBOARD */}
              {activeTab === 'revenue' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="tab-animation">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff' }}>Revenue Analytics</h2>
                      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Real-time hybrid business model sales split & profitability breakdown</p>
                    </div>
                    <button 
                      onClick={fetchRevenueData} 
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                      disabled={revenueLoading}
                    >
                      <RefreshCw size={14} className={revenueLoading ? 'spin-anim' : ''} />
                      Sync Analytics
                    </button>
                  </div>

                  {revenueLoading && !revenueSummary ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                      <RefreshCw size={36} className="spin-anim" style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                  ) : (
                    <>
                      {/* STATS OVERVIEW CARDS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #fff' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--text-secondary))', letterSpacing: '0.05em' }}>TOTAL GROSS SALES</span>
                          <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: '8px 0 0 0' }}>
                            ৳{Number(revenueSummary?.overview?.totalGrossRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #ec4899' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ec4899', letterSpacing: '0.05em' }}>DIRECT SALES (OWN)</span>
                          <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: '8px 0 0 0' }}>
                            ৳{Number(revenueSummary?.directSales?.grossRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '6px' }}>
                            {revenueSummary?.directSales?.revenueShare || 0}% share • {revenueSummary?.directSales?.orders || 0} orders
                          </span>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #10b981' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', letterSpacing: '0.05em' }}>MARKETPLACE SALES (SUPPLIER)</span>
                          <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: '8px 0 0 0' }}>
                            ৳{Number(revenueSummary?.commissionSales?.grossRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '6px' }}>
                            {revenueSummary?.commissionSales?.revenueShare || 0}% share • {revenueSummary?.commissionSales?.orders || 0} orders
                          </span>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>NET PLATFORM PROFIT</span>
                          <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'hsl(var(--primary))', margin: '8px 0 0 0' }}>
                            ৳{Number(revenueSummary?.overview?.totalNetProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '6px' }}>
                            Earned Commission: ৳{Number(revenueSummary?.commissionSales?.commissionEarned || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                        {/* PRODUCT PERFORMANCE */}
                        <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>Sales by Product</h3>
                            <select 
                              value={revenueFilter}
                              onChange={(e) => setRevenueFilter(e.target.value)}
                              className="styled-input"
                              style={{ width: '160px', padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                              <option value="">All Products</option>
                              <option value="OWN">Direct (OWN)</option>
                              <option value="SUPPLIER">Marketplace (SUPPLIER)</option>
                            </select>
                          </div>

                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>PRODUCT NAME</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>SKU</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>OWNERSHIP</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>QTY SOLD</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>GROSS REVENUE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>NET PROFIT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {revenueProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={6} style={{ padding: '40px', textStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No product sales recorded yet.</td>
                                </tr>
                              ) : (
                                revenueProducts.map(p => (
                                  <tr key={p.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: '700', color: '#fff' }}>{p.productName}</td>
                                    <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{p.sku}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                      <span style={{
                                        fontSize: '0.75rem',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        background: p.ownershipType === 'OWN' ? 'rgba(236,72,153,0.1)' : 'rgba(16,185,129,0.1)',
                                        color: p.ownershipType === 'OWN' ? '#ec4899' : '#10b981',
                                        border: p.ownershipType === 'OWN' ? '1px solid rgba(236,72,153,0.2)' : '1px solid rgba(16,185,129,0.2)'
                                      }}>{p.ownershipType}</span>
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{p.totalQty}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#fff' }}>৳{Number(p.grossRevenue).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'hsl(var(--primary))' }}>৳{Number(p.netProfit).toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* SUPPLIER PERFORMANCE */}
                        <div className="glass-card" style={{ padding: '24px' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Supplier Rankings</h3>
                          
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>SUPPLIER</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>SALES</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>COMMISSION</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>PAYABLE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {revenueSuppliers.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ padding: '40px', textStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No active suppliers found.</td>
                                </tr>
                              ) : (
                                revenueSuppliers.map(s => (
                                  <tr key={s.supplierEmail} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: '600', color: '#fff', fontSize: '0.85rem' }}>{s.supplierEmail}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700' }}>৳{Number(s.totalSales).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>৳{Number(s.totalCommission).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.85rem' }}>৳{Number(s.totalPayable).toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* CAMPAIGN ROI ANALYTICS */}
                      <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Target size={20} style={{ color: 'hsl(var(--primary))' }} />
                              Campaign Attribution & ROI Stats
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                              Real-time conversion tracking & ROAS efficiency derived from dynamic UTM tags
                            </p>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>CAMPAIGN SOURCE (UTM)</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>ATTRIBUTED ORDERS</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>UNITS SOLD</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>GROSS REVENUE</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>NET PLATFORM PROFIT</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>ESTIMATED ROAS TIER</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaignRoiStats.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '45px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                                  No UTM campaigns captured yet. Generate link and run target ads to track ROI!
                                </td>
                              </tr>
                            ) : (
                              campaignRoiStats.map((item, idx) => {
                                const profitPercent = item.grossRevenue > 0 ? (item.netPlatformProfit / item.grossRevenue) * 100 : 0;
                                let roasLabel = 'Tier 3 (Retargeting ROAS)';
                                let roasClass = 'pill-rejected';
                                if (profitPercent >= 10) {
                                  roasLabel = 'Tier 1 (High ROAS: 3.5x+)';
                                  roasClass = 'pill-approved';
                                } else if (profitPercent >= 5) {
                                  roasLabel = 'Tier 2 (Moderate: 2.0x+)';
                                  roasClass = 'pill-pending';
                                }
                                
                                return (
                                  <tr key={item.utmSource || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: '700', color: '#fff' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', padding: '4px 10px', borderRadius: '8px', color: 'hsl(var(--primary))' }}>
                                        {item.utmSource || 'Organic / Direct'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>{item.totalOrders}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.unitsSold}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#fff' }}>৳{Number(item.grossRevenue).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>৳{Number(item.netPlatformProfit).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                      <span className={`pill-badge ${roasClass}`} style={{ fontSize: '0.7rem' }}>
                                        {roasLabel}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: COMMISSION LEDGER */}
              {activeTab === 'commissions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="tab-animation">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff' }}>Marketplace Commission Ledger</h2>
                      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Manage supplier sales payouts, ledger balances, and custom rates</p>
                    </div>
                    <button 
                      onClick={fetchCommissionData} 
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                      disabled={commissionLoading}
                    >
                      <RefreshCw size={14} className={commissionLoading ? 'spin-anim' : ''} />
                      Sync Ledger
                    </button>
                  </div>

                  {commissionLoading && commissionLedger.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                      <RefreshCw size={36} className="spin-anim" style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                  ) : (
                    <>
                      {/* STATS PANELS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '700' }}>SUPPLIER SALES</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '4px' }}>
                            From {commissionSummary?.totalEntries || 0} items
                          </span>
                        </div>

                        <div className="glass-card" style={{ padding: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>COMMISSIONS EARNED</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.totalCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '4px' }}>
                            Avg rate resolved dynamically
                          </span>
                        </div>

                        <div className="glass-card" style={{ padding: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', fontWeight: '700' }}>PENDING PAYABLE (DUE)</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(var(--primary))', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.pendingCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '4px' }}>
                            Requires admin mark paid
                          </span>
                        </div>

                        <div className="glass-card" style={{ padding: '20px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '700' }}>PAID OUT TO SUPPLIERS</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.paidCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '4px' }}>
                            Setted manual balance ledger
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
                        {/* GLOBAL DEFAULT & OVERRIDES RULES MANAGER */}
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>Waterfall Commission Settings</h3>
                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Configure default rates and supplier/category exceptions</p>
                          </div>

                          {/* Global settings config */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>Global Default Commission Rate</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>Applies if no other override matching is resolved</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="number" 
                                value={commissionGlobalDefault} 
                                onChange={async (e) => {
                                  const val = parseFloat(e.target.value);
                                  setCommissionGlobalDefault(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    await commissionApi.updateGlobalDefault(val);
                                  }
                                }}
                                className="styled-input" 
                                style={{ width: '80px', padding: '6px 12px', textAlign: 'center', fontWeight: '700' }}
                              />
                              <span style={{ fontWeight: '700', color: '#fff' }}>%</span>
                            </div>
                          </div>

                          {/* Rule Addition Form */}
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!commissionRateForm.supplierEmail || !commissionRateForm.commissionRate) return;
                            setSettingRateLoading(true);
                            try {
                              await commissionApi.setCommissionRate(commissionRateForm);
                              setCommissionRateForm({ supplierEmail: '', category: '', commissionRate: '' });
                              fetchCommissionData();
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setSettingRateLoading(false);
                            }
                          }} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>Add Custom Commission Override Rule</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                              <input 
                                type="email" 
                                placeholder="Supplier Email" 
                                value={commissionRateForm.supplierEmail}
                                onChange={(e) => setCommissionRateForm({ ...commissionRateForm, supplierEmail: e.target.value })}
                                className="styled-input" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                required
                              />
                              <input 
                                type="text" 
                                placeholder="Category (Optional)" 
                                value={commissionRateForm.category}
                                onChange={(e) => setCommissionRateForm({ ...commissionRateForm, category: e.target.value })}
                                className="styled-input" 
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  type="number" 
                                  placeholder="Rate" 
                                  value={commissionRateForm.commissionRate}
                                  onChange={(e) => setCommissionRateForm({ ...commissionRateForm, commissionRate: e.target.value })}
                                  className="styled-input" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', width: '70px', textAlign: 'center' }}
                                  required
                                  min="0"
                                  max="100"
                                />
                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>%</span>
                              </div>
                            </div>
                            <button type="submit" disabled={settingRateLoading} className="btn-primary" style={{ padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {settingRateLoading ? 'Saving...' : 'Add Rule'}
                            </button>
                          </form>
                        </div>

                        {/* ACTIVE RULES LIST */}
                        <div className="glass-card" style={{ padding: '24px', overflowY: 'auto', maxHeight: '420px' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Active Commission Overrides</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '10px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>SUPPLIER</th>
                                <th style={{ padding: '10px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>CATEGORY</th>
                                <th style={{ padding: '10px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>RATE</th>
                                <th style={{ padding: '10px 6px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>ACTION</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commissionRates.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>No override rules defined yet.</td>
                                </tr>
                              ) : (
                                commissionRates.map(r => (
                                  <tr key={r.rateId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '10px 6px', fontSize: '0.8rem', color: '#fff' }}>{r.supplierEmail}</td>
                                    <td style={{ padding: '10px 6px', fontSize: '0.8rem' }}>{r.category || <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Global</span>}</td>
                                    <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>{r.commissionRate}%</td>
                                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                      <button 
                                        onClick={async () => {
                                          await commissionApi.deactivateCommissionRate(r.rateId);
                                          fetchCommissionData();
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ea4335', padding: '4px', cursor: 'pointer' }}
                                        title="Delete rule"
                                      >
                                        <X size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* TRANSACTIONS LEDGER */}
                      <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>Ledger Postings</h3>
                          
                          {/* Filters */}
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <input 
                              type="text" 
                              placeholder="Search Supplier Email" 
                              value={commissionFilters.supplierEmail}
                              onChange={(e) => setCommissionFilters({ ...commissionFilters, supplierEmail: e.target.value })}
                              className="styled-input" 
                              style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                            />
                            <select
                              value={commissionFilters.status}
                              onChange={(e) => setCommissionFilters({ ...commissionFilters, status: e.target.value })}
                              className="styled-input"
                              style={{ width: '130px', padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                              <option value="">All Statuses</option>
                              <option value="PENDING">PENDING</option>
                              <option value="PAID">PAID</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>ORDER REF</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>PRODUCT</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>SUPPLIER</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>SALE AMOUNT</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>COMMISSION RATE</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>COMMISSION AMOUNT</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>SUPPLIER PAYABLE</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>STATUS</th>
                              <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {commissionLedger.length === 0 ? (
                              <tr>
                                <td colSpan={9} style={{ padding: '40px', textStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No ledger entries matching criteria.</td>
                              </tr>
                            ) : (
                              commissionLedger.map(item => (
                                <tr key={item.entryId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <td style={{ padding: '12px 8px', fontWeight: '700', color: '#fff' }}>{item.orderRef}</td>
                                  <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{item.productName}</td>
                                  <td style={{ padding: '12px 8px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{item.supplierEmail}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>৳{Number(item.saleAmount).toFixed(2)}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>{item.commissionRate}%</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>৳{Number(item.commissionAmount).toFixed(2)}</td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#fff' }}>৳{Number(item.supplierPayable).toFixed(2)}</td>
                                  <td style={{ padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{
                                        fontSize: '0.75rem',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        background: item.status === 'PAID' ? 'rgba(16,185,129,0.1)' : item.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: item.status === 'PAID' ? '#10b981' : item.status === 'PENDING' ? '#f59e0b' : '#ef4444',
                                        border: item.status === 'PAID' ? '1px solid rgba(16,185,129,0.2)' : item.status === 'PENDING' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)',
                                        width: 'fit-content'
                                      }}>{item.status}</span>
                                      
                                      {item.status === 'PENDING' && (
                                        <span style={{
                                          fontSize: '0.68rem',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontWeight: '700',
                                          background: item.isLocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                          color: item.isLocked ? '#ef4444' : '#10b981',
                                          border: item.isLocked ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)',
                                          width: 'fit-content',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          {item.isLocked ? '🔒 LOCKED (7d Window)' : '🔑 RELEASED'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                    {item.status === 'PENDING' && (
                                      <button 
                                        disabled={item.isLocked}
                                        onClick={async () => {
                                          try {
                                            await commissionApi.markCommissionPaid(item.entryId);
                                            fetchCommissionData();
                                            setActionSuccess('Payout marked as PAID successfully!');
                                            setTimeout(() => setActionSuccess(''), 3000);
                                          } catch (err) {
                                            setError(err.message || 'Payout settlement failed.');
                                          }
                                        }}
                                        className="btn-primary" 
                                        style={{ 
                                          padding: '5px 10px', 
                                          fontSize: '0.75rem', 
                                          background: item.isLocked ? '#4b5563' : '#10b981', 
                                          borderColor: item.isLocked ? '#4b5563' : '#10b981',
                                          cursor: item.isLocked ? 'not-allowed' : 'pointer',
                                          opacity: item.isLocked ? 0.6 : 1
                                        }}
                                      >
                                        {item.isLocked ? 'Locked' : 'Mark Paid'}
                                      </button>
                                    )}
                                    {item.status === 'PAID' && (
                                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                        Paid at {new Date(item.paidAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 10: WHATSAPP CRM */}
              {activeTab === 'whatsapp' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '24px', height: 'calc(100vh - 240px)', minHeight: '650px' }} className="tab-animation">
                  
                  {/* Left Column: Contacts list */}
                  <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageCircle size={18} style={{ color: 'hsl(var(--primary))' }} />
                        Conversations
                      </h3>
                      <button onClick={fetchWhatsAppData} className="btn-secondary" style={{ padding: '6px', borderRadius: '6px' }} title="Sync contacts">
                        <RefreshCw size={12} className={whatsappLoading ? 'spin-anim' : ''} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                      {whatsappContacts.length === 0 ? (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                          No active WhatsApp threads registered yet.
                        </div>
                      ) : (
                        whatsappContacts.map(c => {
                          const isSelected = selectedContact?.contactId === c.contactId;
                          return (
                            <button
                              key={c.contactId}
                              onClick={() => handleSelectContact(c)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: isSelected ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid rgba(255,255,255,0.04)',
                                background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                                color: '#fff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{c.name || c.phone}</span>
                                <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                                  {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                {c.lastMessage || 'Template notification sent'}
                              </span>
                              {c.lastMessageStatus && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: c.lastMessageStatus === 'SKIPPED_CONFIG_MISSING' ? '#fbbc05' : c.lastMessageStatus === 'FAILED' ? '#ea4335' : '#34a853',
                                  alignSelf: 'flex-end',
                                  fontWeight: '800'
                                }}>
                                  {c.lastMessageStatus}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Center Column: Live Chat Messenger */}
                  <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {selectedContact ? (
                      <>
                        {/* Chat Header */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{selectedContact.name || selectedContact.phone}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>{selectedContact.phone}</span>
                          </div>
                          <span style={{
                            fontSize: '0.7rem',
                            background: selectedContact.optedIn ? 'rgba(52,168,83,0.1)' : 'rgba(234,67,53,0.1)',
                            color: selectedContact.optedIn ? '#34a853' : '#ea4335',
                            padding: '3px 8px',
                            borderRadius: '30px',
                            border: '1px solid rgba(52,168,83,0.2)',
                            fontWeight: '800'
                          }}>
                            {selectedContact.optedIn ? 'Opted In' : 'Opted Out'}
                          </span>
                        </div>

                        {/* Messages Thread Container */}
                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }} className="custom-scrollbar">
                          {whatsappHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                              No messages recorded for this number.
                            </div>
                          ) : (
                            whatsappHistory.map(m => {
                              const isSent = m.direction === 'SENT';
                              return (
                                <div
                                  key={m.messageId}
                                  style={{
                                    alignSelf: isSent ? 'flex-end' : 'flex-start',
                                    maxWidth: '75%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}
                                >
                                  <div
                                    style={{
                                      background: isSent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                      border: isSent ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(255,255,255,0.06)',
                                      padding: '12px 16px',
                                      borderRadius: isSent ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                      color: '#fff',
                                      fontSize: '0.88rem',
                                      lineHeight: '1.45'
                                    }}
                                  >
                                    {m.bodyText}
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: isSent ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
                                    {m.templateName && (
                                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', color: 'hsl(var(--primary))' }}>
                                        Template: {m.templateName}
                                      </span>
                                    )}
                                    {m.orderRef && (
                                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', color: '#fbbc05' }}>
                                        Order: {m.orderRef}
                                      </span>
                                    )}
                                    <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                                      {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isSent && (
                                      <span style={{
                                        fontSize: '0.65rem',
                                        color: m.deliveryStatus === 'SKIPPED_CONFIG_MISSING' ? '#fbbc05' : m.deliveryStatus === 'FAILED' ? '#ea4335' : '#34a853',
                                        fontWeight: '800'
                                      }}>
                                        ({m.deliveryStatus})
                                      </span>
                                    )}
                                  </div>
                                  {m.errorMessage && (
                                    <span style={{ fontSize: '0.65rem', color: '#ea4335', alignSelf: 'flex-end', fontStyle: 'italic' }}>
                                      Error: {m.errorMessage}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'hsl(var(--text-muted))' }}>
                        <MessageCircle size={48} style={{ opacity: 0.3 }} />
                        <span>Select a customer conversation thread from the sidebar</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Template controls & dynamic console */}
                  <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
                    <div>
                      <h4 style={{ fontWeight: '700', fontSize: '1rem', color: '#fff', marginBottom: '4px' }}>CRM Notification Engine</h4>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Send transactional templates manually to target number</p>
                    </div>

                    <form onSubmit={handleSendManualTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Target Phone Number</label>
                        <input
                          type="text"
                          value={manualTemplatePhone}
                          onChange={(e) => setManualTemplatePhone(e.target.value)}
                          className="styled-input"
                          placeholder="+88017XXXXXXXX"
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Template Type</label>
                        <select
                          value={selectedTemplateName}
                          onChange={(e) => {
                            setSelectedTemplateName(e.target.value);
                            setManualTemplateParams(['', '', '']);
                          }}
                          className="styled-input"
                        >
                          {whatsappTemplates.map(t => (
                            <option key={t.templateName} value={t.templateName}>{t.templateName}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Related Order ID (Optional)</label>
                        <input
                          type="number"
                          value={manualTemplateOrderId}
                          onChange={(e) => setManualTemplateOrderId(e.target.value)}
                          className="styled-input"
                          placeholder="e.g. 104"
                        />
                      </div>

                      {/* Display Template Body Text Preview */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: 'hsl(var(--primary))' }}>Raw Template Structure:</strong>
                        {whatsappTemplates.find(t => t.templateName === selectedTemplateName)?.bodyPattern || 'Select template'}
                      </div>

                      {/* Template parameter inputs based on name */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>Template Variables</label>
                        
                        {selectedTemplateName === 'order_confirmation' && (
                          <>
                            <input
                              type="text"
                              value={manualTemplateParams[0]}
                              onChange={(e) => setManualTemplateParams([e.target.value, manualTemplateParams[1], manualTemplateParams[2]])}
                              className="styled-input"
                              placeholder="Param 1: Customer Name"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[1]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], e.target.value, manualTemplateParams[2]])}
                              className="styled-input"
                              placeholder="Param 2: Order Reference (e.g. BC-ORD-123)"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[2]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], manualTemplateParams[1], e.target.value])}
                              className="styled-input"
                              placeholder="Param 3: Total Amount (e.g. 849.00)"
                              required
                            />
                          </>
                        )}

                        {selectedTemplateName === 'payment_reminder' && (
                          <>
                            <input
                              type="text"
                              value={manualTemplateParams[0]}
                              onChange={(e) => setManualTemplateParams([e.target.value, manualTemplateParams[1], ''])}
                              className="styled-input"
                              placeholder="Param 1: Customer Name"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[1]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], e.target.value, ''])}
                              className="styled-input"
                              placeholder="Param 2: Order Reference"
                              required
                            />
                          </>
                        )}

                        {selectedTemplateName === 'payment_verified' && (
                          <>
                            <input
                              type="text"
                              value={manualTemplateParams[0]}
                              onChange={(e) => setManualTemplateParams([e.target.value, manualTemplateParams[1], ''])}
                              className="styled-input"
                              placeholder="Param 1: Customer Name"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[1]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], e.target.value, ''])}
                              className="styled-input"
                              placeholder="Param 2: Order Reference"
                              required
                            />
                          </>
                        )}

                        {selectedTemplateName === 'delivery_update' && (
                          <>
                            <input
                              type="text"
                              value={manualTemplateParams[0]}
                              onChange={(e) => setManualTemplateParams([e.target.value, manualTemplateParams[1], ''])}
                              className="styled-input"
                              placeholder="Param 1: Customer Name"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[1]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], e.target.value, ''])}
                              className="styled-input"
                              placeholder="Param 2: Order Reference"
                              required
                            />
                          </>
                        )}

                        {selectedTemplateName === 'review_request' && (
                          <>
                            <input
                              type="text"
                              value={manualTemplateParams[0]}
                              onChange={(e) => setManualTemplateParams([e.target.value, manualTemplateParams[1], ''])}
                              className="styled-input"
                              placeholder="Param 1: Customer Name"
                              required
                            />
                            <input
                              type="text"
                              value={manualTemplateParams[1]}
                              onChange={(e) => setManualTemplateParams([manualTemplateParams[0], e.target.value, ''])}
                              className="styled-input"
                              placeholder="Param 2: Order Reference"
                              required
                            />
                          </>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={whatsappLoading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                      >
                        {whatsappLoading ? (
                          <span className="spin-anim" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%' }} />
                        ) : <Send size={14} />}
                        {whatsappLoading ? 'Sending...' : 'Dispatch Template Message'}
                      </button>
                    </form>

                    {/* Diagnostics & Webhook receipts list */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                      <h5 style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'hsl(var(--text-muted))', marginBottom: '8px' }}>
                        Webhook Events Logs
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
                        {whatsappWebhooks.length === 0 ? (
                          <span style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'hsl(var(--text-muted))' }}>No webhooks registered</span>
                        ) : (
                          whatsappWebhooks.map(wh => (
                            <div key={wh.eventId} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                                <span style={{ color: 'hsl(var(--primary))' }}>{wh.eventType}</span>
                                <span style={{ color: 'hsl(var(--text-muted))' }}>{new Date(wh.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <span style={{ color: 'hsl(var(--text-secondary))', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Ref: {wh.eventRef}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
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
