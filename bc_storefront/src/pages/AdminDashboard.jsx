// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { 
  ShieldAlert, BarChart3, AlertCircle, 
  DollarSign, LogOut, Package, RefreshCw, Layers, Check, X, 
  ArrowRight, UserPlus, Sliders, AlertTriangle, Play, FileText, Send,
  MapPin, Target, Megaphone, MessageCircle, Star, KeyRound, Barcode,
  Tag, Percent, ToggleLeft, ToggleRight, PlusCircle, Calendar, Hash, Wallet
} from 'lucide-react';
import { api, getBackendUrl } from '../services/api';
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
  
  .revenue-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) !important;
    gap: 24px !important;
  }
  .commissions-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) !important;
    gap: 24px !important;
  }
  @media (max-width: 1200px) {
    .revenue-grid, .commissions-grid {
      grid-template-columns: 1fr !important;
    }
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
  const backendUrl = getBackendUrl();

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
  
  // Marketing Wallet payment confirmation state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // AI dynamic pricing pick states
  const [aiPicks, setAiPicks] = useState([]);
  const [aiPicksLoading, setAiPicksLoading] = useState(false);

  // Onboarding state variables
  const [onboardings, setOnboardings] = useState([]);
  const [onboardingsLoading, setOnboardingsLoading] = useState(false);
  
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

  // Phase 3D: Admin Override States
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [modalTrustLevel, setModalTrustLevel] = useState('Bronze');
  const [modalHoldDays, setModalHoldDays] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [isUpdatingTrust, setIsUpdatingTrust] = useState(false);

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

  // License Management States
  const [licenses, setLicenses] = useState([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newLicenseEmail, setNewLicenseEmail] = useState('');
  const [newLicenseFee, setNewLicenseFee] = useState('');
  const [newLicenseExpiry, setNewLicenseExpiry] = useState('');
  const [newLicenseNotes, setNewLicenseNotes] = useState('');
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewLicenseId, setRenewLicenseId] = useState(null);
  const [renewDays, setRenewDays] = useState(30);

  // Advanced POS Modules States
  // 1. Inbound Logistics (GRN) States
  const [grns, setGrns] = useState([]);
  const [grnsLoading, setGrnsLoading] = useState(false);
  const [showCreateGrnModal, setShowCreateGrnModal] = useState(false);
  const [showQcGrnModal, setShowQcGrnModal] = useState(false);
  const [selectedGrnForQc, setSelectedGrnForQc] = useState(null);
  const [newGrnForm, setNewGrnForm] = useState({ supplierEmail: '', invoiceNumber: '', notes: '', items: [] });
  const [qcFormItems, setQcFormItems] = useState([]);

  // 2. Returns and Reverse Logistics States
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [showCreateReturnModal, setShowCreateReturnModal] = useState(false);
  const [newReturnForm, setNewReturnForm] = useState({ items: [], reason: '', refundMethod: 'CASH', cancellationType: 'PARTIAL_RETURN' });
  const [selectedReturnForReject, setSelectedReturnForReject] = useState(null);
  const [rejectReturnReason, setRejectReturnReason] = useState('');
  const [showRejectReturnModal, setShowRejectReturnModal] = useState(false);

  // 3. Promotions & Campaign Manager States
  const [promotions, setPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    promoCode: '', promoName: '', promoType: 'PERCENTAGE',
    discountValue: '', minOrderAmount: '', minOrderQty: '1',
    startDate: '', endDate: '', maxUsageLimit: '', productIds: []
  });
  const [promoTogglingId, setPromoTogglingId] = useState(null);

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

  const fetchGrns = async () => {
    setGrnsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/grn');
      if (res.success) {
        setGrns(res.items || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch Goods Received Notes.');
    } finally {
      setGrnsLoading(false);
    }
  };

  const fetchReturnRequests = async () => {
    setReturnsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/returns');
      if (res.success) {
        setReturnRequests(res.items || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch Return Requests.');
    } finally {
      setReturnsLoading(false);
    }
  };

  const fetchPromotions = async () => {
    setPromotionsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/promotions');
      if (res.success) {
        setPromotions(res.items || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch promotions.');
    } finally {
      setPromotionsLoading(false);
    }
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    if (!promoForm.promoCode || !promoForm.promoName || !promoForm.discountValue || !promoForm.startDate || !promoForm.endDate) {
      setError('Please fill in all required promotion fields.');
      return;
    }
    try {
      setError(null);
      const payload = {
        ...promoForm,
        discountValue: parseFloat(promoForm.discountValue),
        minOrderAmount: parseFloat(promoForm.minOrderAmount || 0),
        minOrderQty: parseInt(promoForm.minOrderQty || 1),
        maxUsageLimit: promoForm.maxUsageLimit ? parseInt(promoForm.maxUsageLimit) : null,
      };
      const res = await api.post('/api/admin/promotions', payload);
      if (res.success) {
        showToast(`Promotion "${res.promoCode}" created successfully!`);
        setShowCreatePromoModal(false);
        setPromoForm({ promoCode: '', promoName: '', promoType: 'PERCENTAGE', discountValue: '', minOrderAmount: '', minOrderQty: '1', startDate: '', endDate: '', maxUsageLimit: '', productIds: [] });
        fetchPromotions();
      }
    } catch (err) {
      setError(err.message || 'Failed to create promotion.');
    }
  };

  const handleTogglePromoStatus = async (promoId) => {
    setPromoTogglingId(promoId);
    try {
      const res = await api.put(`/api/admin/promotions/${promoId}/toggle`);
      if (res.success) {
        showToast(`Promotion ${res.isActive ? 'activated' : 'deactivated'} successfully.`);
        setPromotions(prev => prev.map(p =>
          p.promoId === promoId ? { ...p, isActive: res.isActive } : p
        ));
      }
    } catch (err) {
      setError(err.message || 'Failed to toggle promotion status.');
    } finally {
      setPromoTogglingId(null);
    }
  };

  const viewOrderDetails = async (orderRef) => {
    setOrderDetailsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/orders/${orderRef}`);
      setSelectedOrderForDetails(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch order details.');
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleCreateGrn = async (e) => {
    e.preventDefault();
    if (!newGrnForm.supplierEmail || newGrnForm.items.length === 0) {
      setError('Supplier email and at least one item are required.');
      return;
    }
    try {
      setError(null);
      const res = await api.post('/api/admin/grn', newGrnForm);
      if (res.success) {
        showToast('Goods Received Note initialized successfully.');
        setShowCreateGrnModal(false);
        setNewGrnForm({ supplierEmail: '', invoiceNumber: '', notes: '', items: [] });
        fetchGrns();
      }
    } catch (err) {
      setError(err.message || 'Failed to create Goods Received Note.');
    }
  };

  const handleSubmitGrnQc = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        items: qcFormItems.map(item => ({
          grnItemId: item.grnItemId,
          qtyAccepted: Number(item.qtyAccepted),
          qtyRejected: Number(item.qtyRejected),
          qcStatus: item.qcStatus,
          qcNotes: item.qcNotes
        }))
      };
      const res = await api.post(`/api/admin/grn/${selectedGrnForQc.grnId}/qc`, payload);
      if (res.success) {
        showToast(`QC completed. GRN Status: ${res.status}`);
        setShowQcGrnModal(false);
        setSelectedGrnForQc(null);
        fetchGrns();
        fetchAllData();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit GRN QC.');
    }
  };

  const handleCreateReturnRequest = async (e) => {
    e.preventDefault();
    const activeItems = newReturnForm.items.filter(i => i.selected);
    if (activeItems.length === 0) {
      setError('At least one item is required for return.');
      return;
    }
    try {
      setError(null);
      const payload = {
        items: activeItems.map(item => ({
          productId: Number(item.productId),
          qty: Number(item.qty)
        })),
        reason: newReturnForm.reason,
        refundMethod: newReturnForm.refundMethod,
        cancellationType: newReturnForm.cancellationType
      };
      const res = await api.post(`/api/orders/${selectedOrderForDetails.orderRef}/return`, payload);
      if (res.success) {
        showToast('Return request submitted successfully.');
        setShowCreateReturnModal(false);
        setNewReturnForm({ items: [], reason: '', refundMethod: 'CASH', cancellationType: 'PARTIAL_RETURN' });
        viewOrderDetails(selectedOrderForDetails.orderRef);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit return request.');
    }
  };

  const handleApproveReturn = async (returnRequestId, ledgerTarget) => {
    try {
      setError(null);
      const res = await api.post(`/api/admin/returns/${returnRequestId}/approve`, { targetLedger: ledgerTarget });
      if (res.success) {
        showToast('Return request approved. Stock restored.');
        fetchReturnRequests();
        fetchAllData();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve return request.');
    }
  };

  const handleRejectReturn = async (e) => {
    e.preventDefault();
    if (!rejectReturnReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    try {
      setError(null);
      const res = await api.post(`/api/admin/returns/${selectedReturnForReject.returnRequestId}/reject`, { rejectReason: rejectReturnReason });
      if (res.success) {
        showToast('Return request rejected.');
        setShowRejectReturnModal(false);
        setSelectedReturnForReject(null);
        setRejectReturnReason('');
        fetchReturnRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject return request.');
    }
  };

  const handleProcessRefund = async (returnRequestId) => {
    try {
      setError(null);
      const res = await api.post(`/api/admin/returns/${returnRequestId}/refund`);
      if (res.success) {
        showToast('Refund processed successfully.');
        fetchReturnRequests();
        fetchAllData();
      }
    } catch (err) {
      setError(err.message || 'Failed to process refund.');
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

  const handleUpdateSupplierTrust = async (e) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.supplierUserId) return;
    setIsUpdatingTrust(true);
    setError(null);

    try {
      await commissionApi.updateSupplierTrustAndHold(editingSupplier.supplierUserId, {
        trustLevel: modalTrustLevel,
        customHoldDays: modalHoldDays === '' ? null : parseInt(modalHoldDays),
        reason: modalReason.trim() || 'Manual admin override'
      });

      setEditingSupplier(null);
      setModalTrustLevel('Bronze');
      setModalHoldDays('');
      setModalReason('');

      // Reload rankings data
      fetchRevenueData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update supplier trust level');
    } finally {
      setIsUpdatingTrust(false);
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
    if (currentUser?.role === 'Supplier' && activeTab === 'overview') {
      setActiveTab('locationAds');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueData();
    } else if (activeTab === 'commissions') {
      fetchCommissionData();
    } else if (activeTab === 'licenses') {
      fetchLicenses();
    } else if (activeTab === 'onboardings') {
      fetchOnboardings();
    } else if (activeTab === 'grn') {
      fetchGrns();
    } else if (activeTab === 'returns') {
      fetchReturnRequests();
    } else if (activeTab === 'promotions') {
      fetchPromotions();
    } else if (activeTab === 'aiPricing') {
      fetchAiPicks();
    }
  }, [activeTab, revenueFilter, commissionFilters]);

  const fetchLicenses = async () => {
    setLicensesLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/licenses');
      setLicenses(res.licenses || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch supplier licenses');
    } finally {
      setLicensesLoading(false);
    }
  };

  const fetchOnboardings = async () => {
    setOnboardingsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/onboarding/pending');
      if (res.success) {
        setOnboardings(res.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching onboardings:', err);
      setError('Failed to fetch pending onboardings.');
    } finally {
      setOnboardingsLoading(false);
    }
  };

  const handleApproveOnboarding = async (email) => {
    setError(null);
    try {
      const res = await api.post(`/api/admin/onboarding/${email}/approve`);
      if (res.success) {
        fetchOnboardings();
        showToast('Supplier approved successfully!');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to approve supplier.');
    }
  };

  const handleRejectOnboarding = async (email) => {
    const reason = prompt('Please specify a rejection reason:');
    if (!reason) return;
    setError(null);
    try {
      const res = await api.post(`/api/admin/onboarding/${email}/reject`, { rejectReason: reason });
      if (res.success) {
        fetchOnboardings();
        showToast('Supplier application rejected.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reject supplier.');
    }
  };

  const handleIssueLicense = async (e) => {
    e.preventDefault();
    if (!newLicenseEmail.trim()) {
      setError('Supplier email is required');
      return;
    }
    try {
      setError(null);
      await api.post('/api/admin/licenses', {
        supplierEmail: newLicenseEmail.trim(),
        monthlyFee: newLicenseFee || 0,
        expiresAt: newLicenseExpiry || null,
        notes: newLicenseNotes || ''
      });
      showToast('License issued successfully');
      setShowIssueModal(false);
      setNewLicenseEmail('');
      setNewLicenseFee('');
      setNewLicenseExpiry('');
      setNewLicenseNotes('');
      fetchLicenses();
    } catch (err) {
      setError(err.message || 'Failed to issue license');
    }
  };

  const handleRenewLicense = async (e) => {
    e.preventDefault();
    if (!renewLicenseId) return;
    try {
      setError(null);
      await api.patch(`/api/admin/licenses/${renewLicenseId}/renew`, {
        days: renewDays || 30
      });
      showToast('License renewed successfully');
      setShowRenewModal(false);
      fetchLicenses();
    } catch (err) {
      setError(err.message || 'Failed to renew license');
    }
  };

  const handleRevokeLicense = async (licenseId) => {
    if (!window.confirm('Are you sure you want to revoke this license? The supplier will lose POS access.')) {
      return;
    }
    try {
      setError(null);
      await api.patch(`/api/admin/licenses/${licenseId}/revoke`);
      showToast('License revoked successfully');
      fetchLicenses();
    } catch (err) {
      setError(err.message || 'Failed to revoke license');
    }
  };

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

  const handleConfirmOrder = async (orderRef) => {
    try {
      await api.post(`/api/orders/${orderRef}/confirm`);
      showToast(`Order ${orderRef} confirmed successfully!`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to confirm order');
    }
  };

  const handleCancelOrder = async (orderRef) => {
    try {
      await api.post(`/api/orders/${orderRef}/cancel`);
      showToast(`Order ${orderRef} cancelled successfully!`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
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
      const endpoint = currentUser?.role === 'Supplier'
        ? `/api/marketing-budget/suggestions?productId=${productId}`
        : `/api/admin/location-ads/products/${productId}/suggestions`;
      const data = await api.get(endpoint);
      setLocationAdsHistory(data.items || []);
    } catch (err) {
      setLocationAdsHistory([]);
      setPanelErrors((prev) => ({
        ...prev,
        locationAds: err.message || 'Failed to load previous location suggestions'
      }));
    }
  };

  const fetchWalletData = async () => {
    try {
      const [walletData, walletAuditData, walletHistoryData] = await Promise.all([
        api.get('/api/admin/wallet/summary').catch(() => null),
        api.get('/api/admin/wallet/audit-report').catch(() => null),
        api.get('/api/admin/wallet/history').catch(() => ({ items: [] }))
      ]);
      setWalletSummary(walletData || null);
      setWalletAuditReport(walletAuditData || null);
      setWalletHistory(walletHistoryData?.items || []);
    } catch (err) {
      console.warn('Failed to load wallet data:', err);
    }
  };

  const handleConfirmBudgetPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    try {
      setPaymentLoading(true);
      const res = await api.post('/api/marketing-budget/payment-confirm', {
        amount: parseFloat(paymentAmount),
        notes: paymentNotes,
        txnType: currentUser?.role === 'Supplier' ? 'SUPPLIER_CAMPAIGN_DEPOSIT' : 'ADMIN_TOP_UP'
      });
      showToast('Marketing budget payment confirmed and credited successfully!');
      setShowPaymentModal(false);
      fetchWalletData();
    } catch (err) {
      alert(err.message || 'Failed to confirm budget payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchAiPicks = async () => {
    try {
      setAiPicksLoading(true);
      const data = await api.get('/api/admin/ai-picks');
      setAiPicks(data.items || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch AI Daily Picks');
    } finally {
      setAiPicksLoading(false);
    }
  };

  const handleApproveAiPrice = async (productId, approvedPrice) => {
    try {
      await api.post('/api/admin/ai-picks/approve', { productId, approvedPrice });
      showToast('AI Dynamic Price approved successfully!');
      fetchAiPicks();
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to approve AI Price');
    }
  };

  useEffect(() => {
    const activeSuggestion = locationAdsResult || locationAdsHistory[0] || null;
    if (activeSuggestion) {
      const budget = activeSuggestion.budgetSuggestion?.suggestedTotalBudgetMin || 1000;
      setPaymentAmount(budget);
      setPaymentNotes(`Payment confirmation for product ${activeSuggestion.productName || activeSuggestion.sku} in ${activeSuggestion.testedLocation}`);
    }
  }, [locationAdsResult, locationAdsHistory, showPaymentModal]);

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
            {currentUser?.role === 'Supplier' ? (
              <>
                <li>
                  <button 
                    onClick={() => setActiveTab('locationAds')} 
                    className={`sidebar-link w-full text-left ${activeTab === 'locationAds' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <MapPin size={18} />
                    Location Ads Suggestions
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveTab('grn'); fetchGrns(); }} 
                    className={`sidebar-link w-full text-left ${activeTab === 'grn' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <Layers size={18} />
                    Inbound Cargo (GRN)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveTab('returns'); fetchReturnRequests(); }} 
                    className={`sidebar-link w-full text-left ${activeTab === 'returns' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <RefreshCw size={18} />
                    Returns & Refunds
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => window.open('/pos', '_blank')} 
                    className="sidebar-link w-full text-left"
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease', color: 'hsl(var(--primary))' }}
                  >
                    <Barcode size={18} />
                    POS Cashier Terminal ↗
                  </button>
                </li>
              </>
            ) : (
              <>
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
                    onClick={() => { setActiveTab('aiPricing'); fetchAiPicks(); }} 
                    className={`sidebar-link w-full text-left ${activeTab === 'aiPricing' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <Sliders size={18} style={{ color: 'hsl(var(--primary))' }} />
                    AI Pricing Queue
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
                <li>
                  <button 
                    onClick={() => setActiveTab('licenses')} 
                    className={`sidebar-link w-full text-left ${activeTab === 'licenses' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <KeyRound size={18} />
                    Supplier Licenses
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('onboardings')} 
                    className={`sidebar-link w-full text-left ${activeTab === 'onboardings' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <UserPlus size={18} />
                    Pending Onboardings
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setActiveTab('promotions'); fetchPromotions(); }} 
                    className={`sidebar-link w-full text-left ${activeTab === 'promotions' ? 'active' : ''}`}
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <Tag size={18} />
                    Promotions & Campaigns
                  </button>
                </li>
              </>
            )}
          </ul>

          {/* Marketing Wallet Sidebar Widget */}
          <div style={{ padding: '16px 20px', margin: '20px 0', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Wallet size={16} style={{ color: 'hsl(var(--primary))' }} />
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '850' }}>Marketing Wallet</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '950', color: '#fff', marginBottom: '4px' }}>
              BDT {Number(walletSummary?.adsSpendAvailable || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
              Spendable Ads Balance
            </div>
            {currentUser?.role === 'Supplier' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary"
                style={{ width: '100%', marginTop: '12px', padding: '6px 12px', fontSize: '0.78rem', justifyContent: 'center', height: 'auto', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981' }}
              >
                + Add Funds
              </button>
            )}
          </div>

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
                    {currentUser?.role === 'Supplier' ? (
                      <div className="glass-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#3b82f6'
                          }}>
                            <Target size={22} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Select Product</h3>
                            <p style={{ margin: '4px 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>
                              Select one of your products to load the active marketing suggestions.
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
                            Your Product
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
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.productId} value={product.productId}>
                                {product.productName || product.sku} {product.sku ? `(${product.sku})` : ''}
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
                      </div>
                    ) : (
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
                    )}

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

                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="btn-primary"
                            style={{
                              marginTop: '24px',
                              width: '100%',
                              justifyContent: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '14px 18px',
                              background: 'linear-gradient(135deg, #34a853, #10b981)',
                              border: 'none',
                              fontWeight: '700'
                            }}
                          >
                            <DollarSign size={16} />
                            Proceed to Budget Payment Confirmation
                          </button>
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelErrors.orders ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#ea4335' }}>
                              <AlertCircle style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} size={16} />
                              {panelErrors.orders}
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
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
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => viewOrderDetails(order.orderRef)}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: '#fff',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontWeight: '700'
                                    }}
                                  >
                                    View
                                  </button>
                                  {order.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleConfirmOrder(order.orderRef)}
                                        style={{
                                          padding: '6px 12px',
                                          fontSize: '0.75rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(52, 168, 83, 0.15)',
                                          color: '#34a853',
                                          border: '1px solid rgba(52, 168, 83, 0.3)',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: '700'
                                        }}
                                      >
                                        <Check size={12} /> Confirm
                                      </button>
                                      <button
                                        onClick={() => handleCancelOrder(order.orderRef)}
                                        style={{
                                          padding: '6px 12px',
                                          fontSize: '0.75rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(234, 67, 53, 0.15)',
                                          color: '#ea4335',
                                          border: '1px solid rgba(234, 67, 53, 0.3)',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: '700'
                                        }}
                                      >
                                        <X size={12} /> Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
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

                      <div className="revenue-grid">
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
                        <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Supplier Rankings</h3>
                          
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>SUPPLIER</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>SALES</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>PAYABLE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>TRUST LEVEL</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>PAYOUT HOLD</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>RETURN RATE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {revenueSuppliers.length === 0 ? (
                                <tr>
                                  <td colSpan={7} style={{ padding: '40px', textStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No active suppliers found.</td>
                                </tr>
                              ) : (
                                revenueSuppliers.map(s => {
                                  const resolvedHold = s.customHoldDays !== null && s.customHoldDays !== undefined
                                    ? `${s.customHoldDays} days (Override)`
                                    : s.trustLevel === 'Platinum' || s.trustLevel === 'Gold'
                                    ? '3 days (Gold/Plat)'
                                    : s.trustLevel === 'Silver'
                                    ? '5 days (Silver)'
                                    : '7 days (Bronze)';

                                  return (
                                    <tr key={s.supplierEmail} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                      <td style={{ padding: '12px 8px', fontWeight: '600', color: '#fff', fontSize: '0.85rem' }}>{s.supplierEmail}</td>
                                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700' }}>৳{Number(s.totalSales).toFixed(2)}</td>
                                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.85rem', color: 'hsl(var(--primary))', fontWeight: '700' }}>৳{Number(s.totalPayable).toFixed(2)}</td>
                                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                        <span style={{
                                          fontSize: '0.7rem',
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          fontWeight: '800',
                                          textTransform: 'uppercase',
                                          background: s.trustLevel === 'Platinum' 
                                            ? 'rgba(168,85,247,0.12)' 
                                            : s.trustLevel === 'Gold'
                                            ? 'rgba(234,179,8,0.12)'
                                            : s.trustLevel === 'Silver'
                                            ? 'rgba(148,163,184,0.12)'
                                            : 'rgba(251,146,60,0.12)',
                                          color: s.trustLevel === 'Platinum' 
                                            ? '#c084fc' 
                                            : s.trustLevel === 'Gold'
                                            ? '#eab308'
                                            : s.trustLevel === 'Silver'
                                            ? '#94a3b8'
                                            : '#fb923c',
                                          border: `1px solid ${
                                            s.trustLevel === 'Platinum' 
                                              ? 'rgba(168,85,247,0.25)' 
                                              : s.trustLevel === 'Gold'
                                              ? 'rgba(234,179,8,0.25)'
                                              : s.trustLevel === 'Silver'
                                              ? 'rgba(148,163,184,0.25)'
                                              : 'rgba(251,146,60,0.25)'
                                          }`
                                        }}>{s.trustLevel || 'Bronze'}</span>
                                      </td>
                                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem' }}>{resolvedHold}</td>
                                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', color: s.returnRate > 5 ? '#ea4335' : '#10b981', fontWeight: '700' }}>
                                        {(s.returnRate || 0).toFixed(1)}%
                                      </td>
                                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                        {s.supplierUserId ? (
                                          <button 
                                            onClick={() => {
                                              setEditingSupplier(s);
                                              setModalTrustLevel(s.trustLevel || 'Bronze');
                                              setModalHoldDays(s.customHoldDays === null || s.customHoldDays === undefined ? '' : s.customHoldDays);
                                              setModalReason('');
                                            }}
                                            className="btn-secondary"
                                            style={{
                                              padding: '4px 8px',
                                              fontSize: '0.75rem',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              background: 'rgba(255,255,255,0.03)',
                                              border: '1px solid rgba(255,255,255,0.08)'
                                            }}
                                          >
                                            <Star size={12} fill="currentColor" style={{ color: 'hsl(var(--primary))' }} />
                                            Manage Trust
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Standard User</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* CAMPAIGN ROI ANALYTICS */}
                      <div className="glass-card" style={{ padding: '24px', marginTop: '24px', overflowX: 'auto' }}>
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

                      <div className="commissions-grid">
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
                        <div className="glass-card" style={{ padding: '24px', overflow: 'auto', maxHeight: '420px' }}>
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
                      <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
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

              {/* TAB: SUPPLIER LICENSES */}
              {activeTab === 'licenses' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <KeyRound style={{ color: 'hsl(var(--primary))' }} size={28} />
                        Supplier License Key System
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                        Manage license keys, view status, issue new software licenses, or extend access for suppliers.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowIssueModal(true)}
                      className="btn-primary"
                      style={{ padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      <UserPlus size={16} />
                      Issue New License
                    </button>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {licensesLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : licenses.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <KeyRound size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No supplier licenses issued yet.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "Issue New License" above to grant POS access to a supplier.</p>
                      </div>
                    ) : (
                      <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>License Key</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Supplier Email</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Monthly Fee</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Issued At</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Expires At</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Status</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Notes</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {licenses.map((lic) => {
                            const isExpired = lic.ExpiresAt && new Date(lic.ExpiresAt) < new Date();
                            const isValid = lic.IsActive && !isExpired && !lic.RevokedAt;
                            
                            return (
                              <tr key={lic.LicenseId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '14px' }}>
                                  <span style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: isValid ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                    fontWeight: '700'
                                  }}>
                                    {lic.LicenseKey}
                                  </span>
                                </td>
                                <td style={{ padding: '14px', fontSize: '0.88rem', color: '#fff' }}>{lic.SupplierEmail}</td>
                                <td style={{ padding: '14px', fontSize: '0.88rem', color: '#fff', fontWeight: '700' }}>
                                  ৳{parseFloat(lic.MonthlyFee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '14px', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                                  {new Date(lic.IssuedAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '14px', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                                  {lic.ExpiresAt ? new Date(lic.ExpiresAt).toLocaleDateString() : 'Never'}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  {lic.RevokedAt ? (
                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '20px', background: 'rgba(234, 67, 53, 0.1)', color: '#ea4335', fontWeight: '700', border: '1px solid rgba(234, 67, 53, 0.2)' }}>
                                      Revoked
                                    </span>
                                  ) : isExpired ? (
                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '20px', background: 'rgba(242, 153, 74, 0.1)', color: '#f2994a', fontWeight: '700', border: '1px solid rgba(242, 153, 74, 0.2)' }}>
                                      Expired
                                    </span>
                                  ) : !lic.IsActive ? (
                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--text-muted))', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                      Inactive
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '20px', background: 'rgba(52, 168, 83, 0.1)', color: '#34a853', fontWeight: '700', border: '1px solid rgba(52, 168, 83, 0.2)' }}>
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '14px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {lic.Notes || '—'}
                                </td>
                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={() => { setRenewLicenseId(lic.LicenseId); setShowRenewModal(true); }}
                                      className="btn-secondary"
                                      style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem' }}
                                    >
                                      Renew
                                    </button>
                                    {isValid && (
                                      <button
                                        onClick={() => handleRevokeLicense(lic.LicenseId)}
                                        className="btn-danger"
                                        style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(234, 67, 53, 0.15)', border: '1px solid rgba(234, 67, 53, 0.3)', color: '#ea4335' }}
                                      >
                                        Revoke
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PENDING ONBOARDINGS */}
              {activeTab === 'onboardings' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserPlus style={{ color: 'hsl(var(--primary))' }} size={28} />
                        Pending Supplier Onboardings
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                        Review, verify, and approve new supplier partnership registrations.
                      </p>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {onboardingsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : onboardings.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <UserPlus size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No pending onboardings.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>New supplier registrations waiting for review will appear here.</p>
                      </div>
                    ) : (
                      <table className="styled-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Shop / Brand</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Contact</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Location</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Identifiers</th>
                            <th style={{ padding: '14px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {onboardings.map((prof) => (
                            <tr key={prof.Email} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '14px' }}>
                                <div style={{ fontWeight: '700', color: '#fff' }}>{prof.ShopName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{prof.Email}</div>
                              </td>
                              <td style={{ padding: '14px', color: 'hsl(var(--text-secondary))' }}>
                                {prof.PhoneNumber}
                              </td>
                              <td style={{ padding: '14px', color: 'hsl(var(--text-secondary))' }}>
                                {prof.ShopLocation}
                              </td>
                              <td style={{ padding: '14px', fontSize: '0.8rem' }}>
                                <div style={{ color: 'hsl(var(--text-secondary))' }}><strong>NID:</strong> {prof.NID}</div>
                                <div style={{ color: 'hsl(var(--text-secondary))' }}><strong>License:</strong> {prof.TradeLicense}</div>
                              </td>
                              <td style={{ padding: '14px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => handleApproveOnboarding(prof.Email)}
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', background: 'hsl(var(--primary))' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectOnboarding(prof.Email)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: GRN INTAKE LOGISTICS */}
              {activeTab === 'grn' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layers style={{ color: 'hsl(var(--primary))' }} size={28} />
                        Goods Received Notes (Inbound Cargo)
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                        Initialize Goods Received Notes (GRN) for supplier shipments, perform QC inspections, and import approved batches.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreateGrnModal(true);
                        setNewGrnForm({ supplierEmail: '', invoiceNumber: '', notes: '', items: [] });
                      }}
                      className="btn-primary"
                      style={{ padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      <UserPlus size={16} />
                      Receive New Cargo (GRN)
                    </button>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {grnsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : grns.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Layers size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No Goods Received Notes recorded.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "Receive New Cargo" above to record inbound supplier stock.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {grns.map((grn) => (
                          <div key={grn.grnId} className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                              <div>
                                <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '1rem' }}>
                                  {grn.grnNumber}
                                </span>
                                <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                  Received: {new Date(grn.receivedDate).toLocaleString()}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={`pill-badge ${grn.status === 'COMPLETED' ? 'pill-approved' : grn.status === 'REJECTED' ? 'pill-rejected' : 'pill-submitted'}`}>
                                  {grn.status}
                                </span>
                                {grn.status === 'PENDING' && (
                                  <button
                                    onClick={() => {
                                      setSelectedGrnForQc(grn);
                                      setQcFormItems(grn.items.map(item => ({
                                        grnItemId: item.grnItemId,
                                        productId: item.productId,
                                        productName: item.productName,
                                        batchNumber: item.batchNumber,
                                        qtyReceived: item.qtyReceived,
                                        qtyAccepted: item.qtyReceived,
                                        qtyRejected: 0,
                                        qcStatus: 'PASSED',
                                        qcNotes: ''
                                      })));
                                      setShowQcGrnModal(true);
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                                  >
                                    Perform QC Verdict
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '14px' }}>
                              <div><strong>Supplier:</strong> {grn.supplierEmail}</div>
                              <div><strong>Invoice No:</strong> {grn.invoiceNumber || '—'}</div>
                              <div><strong>Total Qty:</strong> {grn.totalQtyReceived} units</div>
                              <div><strong>Received By:</strong> {grn.receivedByEmail}</div>
                            </div>
                            {grn.notes && <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'hsl(var(--text-muted))', marginBottom: '14px', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px' }}><strong>Note:</strong> {grn.notes}</div>}

                            <div className="premium-table-container">
                              <table className="premium-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                  <tr>
                                    <th>Product ID / Name</th>
                                    <th>Batch Number</th>
                                    <th>Expiry Date</th>
                                    <th>Qty Received</th>
                                    <th>Qty Accepted</th>
                                    <th>Qty Rejected</th>
                                    <th>QC Status</th>
                                    <th>QC Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grn.items && grn.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td style={{ fontWeight: '700', color: '#fff' }}>
                                        {item.productName} <span style={{ fontWeight: 'normal', color: 'hsl(var(--text-muted))' }}>(#{item.productId})</span>
                                      </td>
                                      <td style={{ fontFamily: 'monospace' }}>{item.batchNumber}</td>
                                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'No Expiry'}</td>
                                      <td style={{ fontWeight: '700' }}>{item.qtyReceived}</td>
                                      <td style={{ color: '#34a853', fontWeight: '700' }}>{item.qtyAccepted}</td>
                                      <td style={{ color: '#ea4335', fontWeight: '700' }}>{item.qtyRejected}</td>
                                      <td>
                                        <span className={`pill-badge ${item.qcStatus === 'PASSED' ? 'pill-approved' : item.qcStatus === 'FAILED' ? 'pill-rejected' : 'pill-submitted'}`}>
                                          {item.qcStatus}
                                        </span>
                                      </td>
                                      <td>{item.qcNotes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: RETURNS & REFUNDS (REVERSE LOGISTICS) */}
              {activeTab === 'returns' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <RefreshCw style={{ color: 'hsl(var(--primary))' }} size={28} />
                      Returns & Refunds (Reverse Logistics)
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                      Approve returned stock to warehouse MASTER ledger (QC check) or sellable SELL ledger, reverse supplier commissions atomically, and process payout refunds.
                    </p>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {returnsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : returnRequests.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <RefreshCw size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No return requests found.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Customer returns and cancellation requests will be listed here.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {returnRequests.map((ret) => (
                          <div key={ret.returnRequestId} className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                              <div>
                                <span style={{ fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '1rem' }}>
                                  Return #{ret.returnRequestId}
                                </span>
                                <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#fff', fontWeight: '600' }}>
                                  Order Ref: {ret.orderRef}
                                </span>
                                <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                  Submitted: {new Date(ret.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={`pill-badge ${ret.status === 'REFUNDED' ? 'pill-approved' : ret.status === 'APPROVED' ? 'pill-pending' : ret.status === 'REJECTED' ? 'pill-rejected' : ret.status === 'PARTIAL_RETURN' ? 'pill-pending' : 'pill-submitted'}`}>
                                  {ret.status}
                                </span>
                                {ret.status === 'PENDING' && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => {
                                        const target = prompt('Select target ledger for stock reversion: Type "MASTER" (for warehouse QC holding) or "SELL" (for immediate resellable stock):', 'MASTER');
                                        if (target === 'MASTER' || target === 'SELL') {
                                          handleApproveReturn(ret.returnRequestId, target);
                                        } else if (target !== null) {
                                          alert('Invalid ledger type. Use MASTER or SELL.');
                                        }
                                      }}
                                      className="btn-primary"
                                      style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#34a853' }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedReturnForReject(ret);
                                        setRejectReturnReason('');
                                        setShowRejectReturnModal(true);
                                      }}
                                      className="btn-secondary"
                                      style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#ea4335', borderColor: 'rgba(234, 67, 53, 0.3)' }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {ret.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleProcessRefund(ret.returnRequestId)}
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))' }}
                                  >
                                    Process Refund Payout & Reverse Commission
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '14px' }}>
                              <div><strong>Customer:</strong> {ret.customerEmail}</div>
                              <div><strong>Refund Method:</strong> {ret.refundMethod || 'STORE_CREDIT'}</div>
                              <div><strong>Type:</strong> {ret.cancellationType || 'PARTIAL_RETURN'}</div>
                              <div><strong>Total Refund:</strong> ৳{ret.refundTotal} BDT</div>
                            </div>
                            {ret.reason && <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'hsl(var(--text-muted))', marginBottom: '14px', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px' }}><strong>Reason:</strong> {ret.reason}</div>}
                            {ret.rejectReason && <div style={{ fontSize: '0.82rem', color: '#ea4335', marginBottom: '14px', background: 'rgba(234,67,53,0.04)', border: '1px solid rgba(234,67,53,0.1)', padding: '8px 12px', borderRadius: '8px' }}><strong>Rejection Comment:</strong> {ret.rejectReason}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
                              <div className="premium-table-container">
                                <table className="premium-table" style={{ fontSize: '0.82rem' }}>
                                  <thead>
                                    <tr>
                                      <th>Product Details</th>
                                      <th>Quantity</th>
                                      <th style={{ textAlign: 'right' }}>Refund Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ret.items && ret.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td style={{ fontWeight: '700', color: '#fff' }}>{item.productName} <span style={{ fontWeight: 'normal', color: 'hsl(var(--text-muted))' }}>(#{item.productId})</span></td>
                                        <td>{item.qty}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'hsl(var(--primary))' }}>৳{item.refundLineAmount} BDT</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', fontWeight: '800' }}>Audit Timeline / Transitions</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                  {ret.auditLog ? (
                                    ret.auditLog.map((log, lIdx) => (
                                      <div key={lIdx} style={{ fontSize: '0.74rem', borderLeft: '2px solid hsl(var(--primary))', paddingLeft: '8px', display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: '#fff', fontWeight: '600' }}>{log.action} by {log.user}</span>
                                        <span style={{ color: 'hsl(var(--text-muted))' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'hsl(var(--text-muted))' }}>No audit timeline records.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PROMOTIONS & CAMPAIGNS */}
              {activeTab === 'promotions' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tag style={{ color: 'hsl(var(--primary))' }} size={28} />
                        Promotions & Campaign Manager
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                        Create coupon codes, set discount rules, manage validity windows, and track usage analytics.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreatePromoModal(true)}
                      className="btn-primary"
                      style={{ padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
                    >
                      <PlusCircle size={16} /> New Promotion
                    </button>
                  </div>

                  {/* Metrics Summary Row */}
                  {!promotionsLoading && promotions.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      {[
                        { label: 'Total Campaigns', value: promotions.length, icon: <Tag size={20} />, color: 'hsl(var(--primary))' },
                        { label: 'Active Campaigns', value: promotions.filter(p => p.isActive).length, icon: <ToggleRight size={20} />, color: '#34a853' },
                        { label: 'Total Usages', value: promotions.reduce((sum, p) => sum + (p.usageCount || 0), 0), icon: <Hash size={20} />, color: '#fbbc05' },
                        { label: 'Expired / Inactive', value: promotions.filter(p => !p.isActive || new Date(p.endDate) < new Date()).length, icon: <ToggleLeft size={20} />, color: '#ea4335' },
                      ].map((m, i) => (
                        <div key={i} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                          <div style={{ color: m.color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{m.icon}</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>{m.value}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Promotions Table */}
                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {promotionsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : promotions.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Tag size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No promotions created yet.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "New Promotion" above to create your first coupon or discount campaign.</p>
                      </div>
                    ) : (
                      <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Code & Name</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Type</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Discount</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Min. Order</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Validity Window</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Usage</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Status</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Toggle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promotions.map(promo => {
                            const now = new Date();
                            const isExpired = new Date(promo.endDate) < now;
                            const usagePct = promo.maxUsageLimit ? Math.round((promo.usageCount / promo.maxUsageLimit) * 100) : null;
                            const statusColor = !promo.isActive ? '#ea4335' : isExpired ? '#fbbc05' : '#34a853';
                            const statusLabel = !promo.isActive ? 'Inactive' : isExpired ? 'Expired' : 'Active';
                            return (
                              <tr key={promo.promoId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '14px 12px' }}>
                                  <div style={{ fontFamily: 'monospace', fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '0.9rem' }}>{promo.promoCode}</div>
                                  <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.78rem', marginTop: '2px' }}>{promo.promoName}</div>
                                </td>
                                <td style={{ padding: '14px 12px' }}>
                                  <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', padding: '3px 8px', fontWeight: '700', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {promo.promoType}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 12px', fontWeight: '800', color: '#fff' }}>
                                  {promo.promoType === 'PERCENTAGE' ? `${promo.discountValue}%` : `৳${parseFloat(promo.discountValue).toFixed(0)}`}
                                </td>
                                <td style={{ padding: '14px 12px', color: 'hsl(var(--text-secondary))' }}>
                                  {promo.minOrderAmount > 0 ? `৳${parseFloat(promo.minOrderAmount).toFixed(0)}` : '—'}
                                  {promo.minOrderQty > 0 ? ` / ${promo.minOrderQty} items` : ''}
                                </td>
                                <td style={{ padding: '14px 12px', fontSize: '0.78rem', color: 'hsl(var(--text-secondary))' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={12} />
                                    {new Date(promo.startDate).toLocaleDateString()} {' → '} {new Date(promo.endDate).toLocaleDateString()}
                                  </div>
                                </td>
                                <td style={{ padding: '14px 12px' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff', marginBottom: '5px' }}>
                                    {promo.usageCount}{promo.maxUsageLimit ? ` / ${promo.maxUsageLimit}` : ' uses'}
                                  </div>
                                  {usagePct !== null && (
                                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '5px', width: '80px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(usagePct, 100)}%`, height: '100%', background: usagePct > 90 ? '#ea4335' : usagePct > 60 ? '#fbbc05' : 'hsl(var(--primary))', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                  <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`, borderRadius: '6px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleTogglePromoStatus(promo.promoId)}
                                    disabled={promoTogglingId === promo.promoId}
                                    title={promo.isActive ? 'Deactivate this promotion' : 'Activate this promotion'}
                                    style={{
                                      background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                                      transition: 'all 0.2s ease', borderRadius: '6px',
                                      opacity: promoTogglingId === promo.promoId ? 0.5 : 1
                                    }}
                                  >
                                    {promo.isActive
                                      ? <ToggleRight size={26} style={{ color: '#34a853' }} />
                                      : <ToggleLeft size={26} style={{ color: 'rgba(255,255,255,0.25)' }} />
                                    }
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'aiPricing' && (
                <div className="tab-animation" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sliders style={{ color: 'hsl(var(--primary))' }} size={28} />
                        AI Daily Picks & Dynamic Pricing Approval
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
                        Review and approve AI-generated dynamic pricing optimized for demand, stock levels, and supplier costs.
                      </p>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                    {aiPicksLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <div className="spin-anim" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
                      </div>
                    ) : aiPicks.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        <Sliders size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', fontWeight: '500' }}>No pending dynamic pricing reviews.</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>AI runs daily optimizations. Check back later.</p>
                      </div>
                    ) : (
                      <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Product</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Supplier Cost</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Current Price</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>AI Recommended Price</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Sales Volume</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Stock Status</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiPicks.map(item => (
                            <tr key={item.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '14px 12px' }}>
                                <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{item.productName}</div>
                                <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem', marginTop: '2px' }}>SKU: {item.sku}</div>
                              </td>
                              <td style={{ padding: '14px 12px', color: 'hsl(var(--text-secondary))' }}>
                                ৳{parseFloat(item.supplierCost || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 12px', color: 'hsl(var(--text-secondary))' }}>
                                ৳{parseFloat(item.currentPrice || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 12px', fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '0.95rem' }}>
                                ৳{parseFloat(item.recommendedPrice || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                <span style={{ 
                                  background: item.salesVolume > 5 ? 'rgba(234,67,53,0.15)' : 'rgba(52,168,83,0.15)', 
                                  color: item.salesVolume > 5 ? '#ea4335' : '#34a853',
                                  borderRadius: '4px', padding: '3px 8px', fontWeight: '700' 
                                }}>
                                  {item.salesVolume > 5 ? 'High Demand' : 'Normal'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 12px', color: item.availableStock < 10 ? '#ea4335' : '#fff' }}>
                                {item.availableStock} units
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleApproveAiPrice(item.productId, item.recommendedPrice)}
                                  className="btn-primary"
                                  style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Check size={14} /> Approve
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* Phase 3D: Trust Management Modal */}
      {editingSupplier && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}>
          <div className="glass-card-premium" style={{
            width: '100%', maxWidth: '480px', padding: '32px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setEditingSupplier(null)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star style={{ color: 'hsl(var(--primary))' }} size={22} fill="currentColor" />
              Manage Supplier Trust
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '24px' }}>
              Override trust status, adjust payout hold constraints, and save audit logs for <strong>{editingSupplier.supplierEmail}</strong>.
            </p>

            <form onSubmit={handleUpdateSupplierTrust} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TRUST LEVEL TIER</label>
                <select 
                  value={modalTrustLevel}
                  onChange={(e) => setModalTrustLevel(e.target.value)}
                  className="styled-input"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                >
                  <option value="Bronze">Bronze (7-day Hold, 10% Fee)</option>
                  <option value="Silver">Silver (5-day Hold, 8% Fee)</option>
                  <option value="Gold">Gold (3-day Hold, 6% Fee)</option>
                  <option value="Platinum">Platinum (3-day Hold, 5% Fee)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CUSTOM PAYOUT HOLD (DAYS)</label>
                <input 
                  type="number"
                  min="0"
                  max="90"
                  placeholder="e.g. 3 (leave blank for tier default)"
                  value={modalHoldDays}
                  onChange={(e) => setModalHoldDays(e.target.value)}
                  className="styled-input"
                />
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '4px', display: 'block' }}>
                  Define a manual hold period to override standard tier hold days.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CHANGE REASON / AUDIT LOG</label>
                <textarea 
                  required
                  placeholder="e.g. High-performance supplier manual trust upgrade"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  className="styled-textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingSupplier(null)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isUpdatingTrust}
                  style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800' }}
                >
                  {isUpdatingTrust ? 'Saving Override...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue License Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}>
          <div className="glass-card-premium" style={{
            width: '100%', maxWidth: '480px', padding: '32px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowIssueModal(false)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound style={{ color: 'hsl(var(--primary))' }} size={22} />
              Issue Supplier License
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '24px' }}>
              Generate a unique license key to grant POS sale channel access to a supplier.
            </p>

            <form onSubmit={handleIssueLicense} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supplier Email</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. supplier@example.com"
                  value={newLicenseEmail}
                  onChange={(e) => setNewLicenseEmail(e.target.value)}
                  className="styled-input"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly Fee (BDT)</label>
                <input 
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={newLicenseFee}
                  onChange={(e) => setNewLicenseFee(e.target.value)}
                  className="styled-input"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiry Date</label>
                <input 
                  type="date"
                  value={newLicenseExpiry}
                  onChange={(e) => setNewLicenseExpiry(e.target.value)}
                  className="styled-input"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                />
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '4px', display: 'block' }}>
                  Defaults to 30 days from now if left blank.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notes / Internal Memo</label>
                <textarea 
                  placeholder="e.g. Promo license key for premium supplier shop"
                  value={newLicenseNotes}
                  onChange={(e) => setNewLicenseNotes(e.target.value)}
                  className="styled-textarea"
                  style={{ minHeight: '80px', width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowIssueModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', fontWeight: '800' }}
                >
                  Generate & Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew License Modal */}
      {showRenewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}>
          <div className="glass-card-premium" style={{
            width: '100%', maxWidth: '400px', padding: '32px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowRenewModal(false)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw style={{ color: 'hsl(var(--primary))' }} size={22} />
              Renew License
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '24px' }}>
              Extend the expiration date of this supplier license.
            </p>

            <form onSubmit={handleRenewLicense} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Extension Duration (Days)</label>
                <select 
                  value={renewDays}
                  onChange={(e) => setRenewDays(e.target.value)}
                  className="styled-input"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={180}>180 Days (6 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRenewModal(false)} 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', fontWeight: '800' }}
                >
                  Renew License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '100%', maxWidth: '700px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <button 
              onClick={() => setSelectedOrderForDetails(null)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Order Details: {selectedOrderForDetails.orderRef}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>Customer Email</div>
                <div style={{ color: '#fff', fontWeight: '700', marginTop: '2px' }}>{selectedOrderForDetails.customerEmail}</div>
              </div>
              <div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>Status</div>
                <div style={{ marginTop: '2px' }}>
                  <span className={`pill-badge ${selectedOrderForDetails.status === 'CONFIRMED' ? 'pill-approved' : selectedOrderForDetails.status === 'CANCELLED' ? 'pill-rejected' : 'pill-submitted'}`}>
                    {selectedOrderForDetails.status}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>Total Amount</div>
                <div style={{ color: 'hsl(var(--primary))', fontWeight: '800', marginTop: '2px' }}>৳{selectedOrderForDetails.totalAmount}</div>
              </div>
              <div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>Paid Amount</div>
                <div style={{ color: '#fff', fontWeight: '700', marginTop: '2px' }}>৳{selectedOrderForDetails.paidAmount || '0.00'} ({selectedOrderForDetails.paymentStatus})</div>
              </div>
            </div>

            <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '12px', fontWeight: '700' }}>Items ordered</h4>
            <div className="premium-table-container" style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderForDetails.items && selectedOrderForDetails.items.map((item, idx) => {
                    const prod = products.find(p => p.productId === item.productId);
                    return (
                      <tr key={idx}>
                        <td style={{ color: '#fff', fontWeight: '700' }}>
                          {prod ? prod.productName : `Product #${item.productId}`}
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>
                            {prod ? `SKU: ${prod.sku}` : ''}
                          </span>
                        </td>
                        <td>{item.qty}</td>
                        <td>৳{item.unitPrice}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: 'hsl(var(--primary))' }}>৳{item.lineTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setSelectedOrderForDetails(null)} 
                className="btn-secondary" 
                style={{ padding: '10px 20px', fontSize: '0.875rem' }}
              >
                Close
              </button>
              {selectedOrderForDetails.status === 'CONFIRMED' && (
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateReturnModal(true);
                    setNewReturnForm({
                      items: selectedOrderForDetails.items.map(item => ({
                        productId: item.productId,
                        qty: item.qty,
                        maxQty: item.qty,
                        unitPrice: item.unitPrice,
                        selected: true
                      })),
                      reason: '',
                      refundMethod: 'CASH',
                      cancellationType: 'PARTIAL_RETURN'
                    });
                  }}
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.875rem', background: '#ea4335', color: '#fff' }}
                >
                  Request Return / Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ads Suggestion & Payment Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.82)', backdropFilter: 'blur(12px)',
          zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '500px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet style={{ color: 'hsl(var(--primary))' }} size={22} />
                  Budget Payment Confirmation
                </h3>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', margin: '4px 0 0' }}>
                  Confirm funding for your local marketing campaign.
                </p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="btn-secondary" 
                style={{ padding: '6px', minWidth: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmBudgetPayment} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Confirm Amount (BDT)
                </span>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="styled-input"
                  placeholder="e.g. 3000"
                  min="1"
                  max="1000000"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Transaction Notes / Reference
                </span>
                <textarea
                  required
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="styled-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Add deposit payment method/transaction ID reference details"
                />
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #34a853, #10b981)', border: 'none' }}
                >
                  {paymentLoading ? <RefreshCw size={14} className="spin-anim" /> : <Check size={14} />}
                  {paymentLoading ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Return Request Modal */}
      {showCreateReturnModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.82)', backdropFilter: 'blur(12px)',
          zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '580px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw style={{ color: 'hsl(var(--primary))' }} size={22} />
              Request Order Return / Cancellation
            </h3>
            
            <form onSubmit={handleCreateReturnRequest}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Cancellation Type</label>
                <select 
                  value={newReturnForm.cancellationType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewReturnForm(prev => {
                      const updatedItems = prev.items.map(item => ({
                        ...item,
                        qty: val === 'FULL_CANCELLATION' ? item.maxQty : item.qty,
                        selected: val === 'FULL_CANCELLATION' ? true : item.selected
                      }));
                      return { ...prev, cancellationType: val, items: updatedItems };
                    });
                  }}
                  className="styled-input"
                >
                  <option value="PARTIAL_RETURN">Partial Return (Select Items)</option>
                  <option value="FULL_CANCELLATION">Full Cancellation (Entire Order)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Refund Method</label>
                <select 
                  value={newReturnForm.refundMethod}
                  onChange={(e) => setNewReturnForm(prev => ({ ...prev, refundMethod: e.target.value }))}
                  className="styled-input"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                  <option value="MOBILE_MONEY">bKash / Nagad / Mobile Money</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Items to Return</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {newReturnForm.items.map((item, idx) => {
                    const prod = products.find(p => p.productId === item.productId);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '8px', borderBottom: idx < newReturnForm.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {newReturnForm.cancellationType !== 'FULL_CANCELLATION' && (
                            <input 
                              type="checkbox" 
                              checked={item.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setNewReturnForm(prev => {
                                  const updated = [...prev.items];
                                  updated[idx] = { ...updated[idx], selected: checked };
                                  return { ...prev, items: updated };
                                });
                              }}
                              style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                            />
                          )}
                          <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '700' }}>
                            {prod ? prod.productName : `Prod #${item.productId}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>Qty:</span>
                          <input 
                            type="number"
                            min="1"
                            max={item.maxQty}
                            disabled={!item.selected || newReturnForm.cancellationType === 'FULL_CANCELLATION'}
                            value={item.qty}
                            onChange={(e) => {
                              const qtyVal = Math.min(item.maxQty, Math.max(1, Number(e.target.value)));
                              setNewReturnForm(prev => {
                                const updated = [...prev.items];
                                updated[idx] = { ...updated[idx], qty: qtyVal };
                                return { ...prev, items: updated };
                              });
                            }}
                            className="styled-input"
                            style={{ width: '70px', padding: '6px', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>/ {item.maxQty}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Reason / Notes</label>
                <textarea 
                  value={newReturnForm.reason}
                  onChange={(e) => setNewReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  placeholder="Reason for return, e.g. defective jeans zipper, size mismatch"
                  className="styled-textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateReturnModal(false)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.875rem', background: '#ea4335', color: '#fff', fontWeight: '800' }}
                  disabled={newReturnForm.items.filter(i => i.selected).length === 0}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Return Modal */}
      {showRejectReturnModal && selectedReturnForReject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.82)', backdropFilter: 'blur(12px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '460px', padding: '32px', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
            <h3 style={{ marginBottom: '16px', color: '#ea4335', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <X size={20} />
              Reject Return Request #{selectedReturnForReject.returnRequestId}
            </h3>
            <form onSubmit={handleRejectReturn}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: '600' }}>
                  Specify rejection reason (Required)
                </label>
                <textarea 
                  required
                  rows="4"
                  value={rejectReturnReason}
                  onChange={(e) => setRejectReturnReason(e.target.value)}
                  placeholder="Provide audit feedback on why this request is rejected..."
                  className="styled-textarea"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowRejectReturnModal(false); setSelectedReturnForReject(null); }} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ background: '#ea4335', color: '#fff', padding: '10px 20px', fontSize: '0.875rem', fontWeight: '850' }}
                  disabled={!rejectReturnReason.trim()}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Promotion Modal */}
      {showCreatePromoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(4, 6, 10, 0.85)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'scaleIn 0.3s ease' }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '680px', padding: '32px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={22} style={{ color: 'hsl(var(--primary))' }} />
                Create New Promotion / Coupon
              </h3>
              <button onClick={() => setShowCreatePromoModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreatePromotion} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Promo Code * <span style={{ color: 'hsl(var(--primary))' }}>(Auto-uppercased)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUMMER20"
                    value={promoForm.promoCode}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                    className="styled-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Campaign Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Eid Mega Sale 2026"
                    value={promoForm.promoName}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoName: e.target.value }))}
                    className="styled-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Discount Type *</label>
                  <select
                    value={promoForm.promoType}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, promoType: e.target.value }))}
                    className="styled-input"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (৳)</option>
                    <option value="BOGO">Buy One Get One (BOGO)</option>
                    <option value="TIERED">Tiered Discount</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Discount Value * {promoForm.promoType === 'PERCENTAGE' ? '(%)' : '(৳ Amount)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={promoForm.promoType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 200'}
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, discountValue: e.target.value }))}
                    className="styled-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min. Order Amount (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500 (0 = no minimum)"
                    value={promoForm.minOrderAmount}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                    className="styled-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min. Item Quantity</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2"
                    value={promoForm.minOrderQty}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, minOrderQty: e.target.value }))}
                    className="styled-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="styled-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expiry Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="styled-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max Usage Limit (leave blank for unlimited)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={promoForm.maxUsageLimit}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, maxUsageLimit: e.target.value }))}
                  className="styled-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                <button type="button" onClick={() => setShowCreatePromoModal(false)} className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: '800' }}>
                  <PlusCircle size={14} /> Create Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create GRN Modal */}
      {showCreateGrnModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.82)', backdropFilter: 'blur(12px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '640px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ color: 'hsl(var(--primary))' }} size={22} />
              Initialize Goods Received Note (GRN)
            </h3>

            <form onSubmit={handleCreateGrn}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Supplier Email</label>
                  <input 
                    type="email"
                    required
                    list="supplier-emails-list"
                    value={newGrnForm.supplierEmail}
                    onChange={(e) => setNewGrnForm(prev => ({ ...prev, supplierEmail: e.target.value }))}
                    placeholder="e.g. supplier@example.com"
                    className="styled-input"
                  />
                  <datalist id="supplier-emails-list">
                    {revenueSuppliers.map(s => <option key={s.supplierEmail} value={s.supplierEmail} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Supplier Invoice #</label>
                  <input 
                    type="text"
                    value={newGrnForm.invoiceNumber}
                    onChange={(e) => setNewGrnForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="e.g. INV-1002"
                    className="styled-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>Inbound Logistics Notes</label>
                <input 
                  type="text"
                  value={newGrnForm.notes}
                  onChange={(e) => setNewGrnForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Received via DHL Cargo shipment"
                  className="styled-input"
                />
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', background: 'rgba(255,255,255,0.01)', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#fff', fontWeight: '700' }}>Add Shipment Items</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <select 
                    id="grn-product-select" 
                    className="styled-input" 
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>{p.productName} ({p.sku})</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    id="grn-batch-input" 
                    placeholder="Batch Number (e.g. BATCH-01)" 
                    className="styled-input" 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input 
                    type="date" 
                    id="grn-expiry-input" 
                    placeholder="Expiry Date" 
                    className="styled-input" 
                  />
                  <input 
                    type="number" 
                    id="grn-qty-input" 
                    placeholder="Qty Received" 
                    min="1" 
                    className="styled-input" 
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const prodSelect = document.getElementById('grn-product-select');
                    const batchInput = document.getElementById('grn-batch-input');
                    const expiryInput = document.getElementById('grn-expiry-input');
                    const qtyInput = document.getElementById('grn-qty-input');

                    const pId = Number(prodSelect.value);
                    const batch = batchInput.value.trim();
                    const expiry = expiryInput.value;
                    const qty = Number(qtyInput.value);

                    if (!pId || !batch || qty <= 0) {
                      alert('Product, Batch Number, and positive Qty are required.');
                      return;
                    }

                    const productObj = products.find(p => p.productId === pId);
                    setNewGrnForm(prev => ({
                      ...prev,
                      items: [...prev.items, {
                        productId: pId,
                        productName: productObj?.productName || `Prod #${pId}`,
                        batchNumber: batch,
                        expiryDate: expiry || null,
                        qtyReceived: qty
                      }]
                    }));

                    // Reset item fields
                    prodSelect.value = '';
                    batchInput.value = '';
                    expiryInput.value = '';
                    qtyInput.value = '';
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', width: '100%' }}
                >
                  + Add Item to Manifest
                </button>
              </div>

              {newGrnForm.items.length > 0 && (
                <div className="premium-table-container" style={{ marginBottom: '24px', maxHeight: '150px', overflowY: 'auto' }}>
                  <table className="premium-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Batch</th>
                        <th>Expiry</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newGrnForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '700', color: '#fff' }}>{item.productName}</td>
                          <td>{item.batchNumber}</td>
                          <td>{item.expiryDate || 'No Expiry'}</td>
                          <td>{item.qtyReceived}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setNewGrnForm(prev => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx)
                                }));
                              }}
                              style={{ border: 'none', background: 'none', color: '#ea4335', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateGrnModal(false)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: '800' }}
                  disabled={newGrnForm.items.length === 0}
                >
                  Initialize GRN Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QC GRN Modal */}
      {showQcGrnModal && selectedGrnForQc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(4, 6, 10, 0.82)', backdropFilter: 'blur(12px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'scaleIn 0.3s ease'
        }}>
          <div className="glass-card-premium" style={{ width: '90%', maxWidth: '680px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check style={{ color: 'hsl(var(--primary))' }} size={22} />
              Quality Check: {selectedGrnForQc.grnNumber}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginBottom: '20px' }}>
              Audit inbound items. Approved counts increment the physical MASTER ledger. Rejected items are logged.
            </p>

            <form onSubmit={handleSubmitGrnQc}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '320px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
                {qcFormItems.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '800', color: '#fff', fontSize: '0.9rem' }}>{item.productName}</span>
                      <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>Batch: {item.batchNumber} (Inbound: {item.qtyReceived} units)</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', marginBottom: '4px' }}>Qty Accepted</label>
                        <input 
                          type="number"
                          min="0"
                          max={item.qtyReceived}
                          value={item.qtyAccepted}
                          onChange={(e) => {
                            const accepted = Math.min(item.qtyReceived, Math.max(0, Number(e.target.value)));
                            const rejected = item.qtyReceived - accepted;
                            setQcFormItems(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], qtyAccepted: accepted, qtyRejected: rejected, qcStatus: accepted > 0 ? 'PASSED' : 'FAILED' };
                              return updated;
                            });
                          }}
                          className="styled-input"
                          style={{ padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', marginBottom: '4px' }}>Qty Rejected</label>
                        <input 
                          type="number"
                          min="0"
                          max={item.qtyReceived}
                          value={item.qtyRejected}
                          onChange={(e) => {
                            const rejected = Math.min(item.qtyReceived, Math.max(0, Number(e.target.value)));
                            const accepted = item.qtyReceived - rejected;
                            setQcFormItems(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], qtyAccepted: accepted, qtyRejected: rejected, qcStatus: accepted > 0 ? 'PASSED' : 'FAILED' };
                              return updated;
                            });
                          }}
                          className="styled-input"
                          style={{ padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', marginBottom: '4px' }}>QC Verdict</label>
                        <select 
                          value={item.qcStatus}
                          onChange={(e) => {
                            const status = e.target.value;
                            setQcFormItems(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], qcStatus: status };
                              return updated;
                            });
                          }}
                          className="styled-input"
                          style={{ padding: '8px' }}
                        >
                          <option value="PASSED">Passed</option>
                          <option value="FAILED">Failed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', marginBottom: '4px' }}>QC Inspection Notes</label>
                      <input 
                        type="text"
                        placeholder="e.g. Verified batch seals intact. No tears."
                        value={item.qcNotes}
                        onChange={(e) => {
                          const notes = e.target.value;
                          setQcFormItems(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], qcNotes: notes };
                            return updated;
                          });
                        }}
                        className="styled-input"
                        style={{ padding: '8px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowQcGrnModal(false); setSelectedGrnForQc(null); }} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: '800' }}
                >
                  Submit QC Verdict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
