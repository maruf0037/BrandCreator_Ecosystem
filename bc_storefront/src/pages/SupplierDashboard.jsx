// src/pages/SupplierDashboard.jsx
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { 
  Package, HardDrive, KeyRound, CheckCircle, 
  BarChart, PlusCircle, LogOut, RefreshCw, Send, Check, X, 
  AlertCircle, History, Upload, Image as ImageIcon, ArrowLeft, ArrowRight, Star, Trash2,
  Layers, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { commissionApi } from '../services/commissionApi';

export default function SupplierDashboard({ currentUser }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // States
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Supplier License Status State
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);

  // Phase 2: Supplier Commission States
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [commissionRecent, setCommissionRecent] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionCurrentRate, setCommissionCurrentRate] = useState(null);
  const [commissionSupplier, setCommissionSupplier] = useState(null);

  // Key secrets state
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // New Product Form State
  const [newSku, setNewSku] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newSupplierNotes, setNewSupplierNotes] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newRpuMrp, setNewRpuMrp] = useState('');
  const [newSuggestedRetailPrice, setNewSuggestedRetailPrice] = useState('');
  const [newCostNote, setNewCostNote] = useState('');
  const [newVariantsJson, setNewVariantsJson] = useState('');
  const [newSupplierLocation, setNewSupplierLocation] = useState('');
  const [newDeliveryCoverageJson, setNewDeliveryCoverageJson] = useState('');
  const [newOnlineSellingRequested, setNewOnlineSellingRequested] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImages, setNewImages] = useState([]); // Array of { imageUrl, isPrimary, altText }
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMeta, setImageUploadMeta] = useState(null);
  const [creating, setCreating] = useState(false);

  // Existing product images modal states
  const [editingImagesProductId, setEditingImagesProductId] = useState(null);
  const [editingImagesProductName, setEditingImagesProductName] = useState('');
  const [editingImagesList, setEditingImagesList] = useState([]); // Array of { imageUrl, isPrimary, altText }
  const [editingUploadLoading, setEditingUploadLoading] = useState(false);
  const [editingDragOver, setEditingDragOver] = useState(false);

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

  const fetchLicenseInfo = async () => {
    setLicenseLoading(true);
    try {
      const res = await api.get('/api/supplier/license/status');
      setLicenseInfo(res || null);
    } catch (err) {
      console.error('Failed to fetch supplier license info:', err);
    } finally {
      setLicenseLoading(false);
    }
  };

  const fetchSupplierData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, transRes] = await Promise.all([
        api.get('/api/products').catch(() => ({ items: [] })),
        api.get('/api/inventory/transfers').catch(() => ({ items: [] })),
        fetchLicenseInfo().catch(() => null)
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

  const fetchCommissionData = async () => {
    setCommissionLoading(true);
    try {
      const data = await commissionApi.getSupplierCommissionSummary();
      setCommissionSummary(data.summary || null);
      setCommissionRecent(data.recentEntries || []);
      setCommissionCurrentRate(data.currentRate || null);
      setCommissionSupplier(data.supplier || null);
    } catch (err) {
      console.error('Failed to load supplier commissions:', err);
    } finally {
      setCommissionLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierData();
    fetchCommissionData();
  }, []);

  useEffect(() => {
    if (activeTab === 'commissions') {
      fetchCommissionData();
    }
  }, [activeTab]);

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
      fetchSupplierData();
    } catch (err) {
      setPosError(err.message || 'Checkout failed. Please inspect quantities and try again.');
    } finally {
      setPosCheckingOut(false);
    }
  };

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
        supplierNotes: newSupplierNotes.trim() || null,
        barcode: newBarcode.trim() || null,
        brand: newBrand.trim() || null,
        category: newCategory.trim() || null,
        rpuMrp: newRpuMrp ? parseFloat(newRpuMrp) : null,
        suggestedRetailPrice: newSuggestedRetailPrice ? parseFloat(newSuggestedRetailPrice) : null,
        costNote: newCostNote.trim() || null,
        variantsJson: newVariantsJson.trim() || null,
        supplierLocation: newSupplierLocation.trim() || null,
        deliveryCoverageJson: newDeliveryCoverageJson.trim() || null,
        onlineSellingRequested: newOnlineSellingRequested,
        imageUrl: newImageUrl.trim() || null,
        images: newImages
      });
      showToast(`Product ${newProductName} initialized and double ledgers registered!`);
      setNewSku('');
      setNewProductName('');
      setNewBasePrice('');
      setNewSupplierNotes('');
      setNewBarcode('');
      setNewBrand('');
      setNewCategory('');
      setNewRpuMrp('');
      setNewSuggestedRetailPrice('');
      setNewCostNote('');
      setNewVariantsJson('');
      setNewSupplierLocation('');
      setNewDeliveryCoverageJson('');
      setNewOnlineSellingRequested(true);
      setNewImageUrl('');
      setNewImages([]);
      setImageUploadMeta(null);
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'Failed to create new product. Check for duplicate SKU.');
    } finally {
      setCreating(false);
    }
  };

  // Multi-Image Upload logic
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    setError(null);
    setUploadProgress(`Compressing & processing ${files.length} image(s)...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('image', files[i]);
      }

      const result = await api.upload('/api/uploads/product-image', formData);
      const uploadedImages = result.images || [result];
      
      const newItems = uploadedImages.map((img, idx) => ({
        imageUrl: img.imageUrl,
        isPrimary: newImages.length === 0 && idx === 0,
        altText: 'Product Image'
      }));

      setNewImages(prev => {
        const combined = [...prev, ...newItems];
        const hasPrimary = combined.some(item => item.isPrimary);
        if (!hasPrimary && combined.length > 0) {
          combined[0].isPrimary = true;
        }
        return combined;
      });

      showToast(`Processed and compressed ${newItems.length} image(s) successfully.`);
    } catch (err) {
      setError(err.message || 'Image processing or upload failed.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  };

  // Handle drag drop events for new product form
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files) {
      uploadFiles(files);
    }
  };

  const handleProductImageUpload = async (event) => {
    const files = event.target.files;
    if (files) {
      uploadFiles(files);
    }
    event.target.value = '';
  };

  // Gallery management actions helper
  const handleSetPrimary = (index, list, setList) => {
    const updated = list.map((img, idx) => ({
      ...img,
      isPrimary: idx === index
    }));
    setList(updated);
  };

  const handleDeleteImage = (index, list, setList) => {
    const updated = list.filter((_, idx) => idx !== index);
    if (list[index]?.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setList(updated);
  };

  const handleMoveImage = (index, direction, list, setList) => {
    if (index === 0 && direction === -1) return;
    if (index === list.length - 1 && direction === 1) return;
    
    const updated = [...list];
    const targetIdx = index + direction;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    
    setList(updated);
  };

  // Existing product images modal functions
  const handleOpenManageImagesModal = (product) => {
    setEditingImagesProductId(product.productId);
    setEditingImagesProductName(product.productName);
    setEditingImagesList(product.images || []);
    setError(null);
  };

  const uploadFilesForExistingProduct = async (files) => {
    if (!files || files.length === 0 || !editingImagesProductId) return;
    
    setEditingUploadLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('image', files[i]);
      }

      const result = await api.upload('/api/uploads/product-image', formData);
      const uploadedImages = result.images || [result];
      
      const newItems = uploadedImages.map((img, idx) => ({
        imageUrl: img.imageUrl,
        isPrimary: editingImagesList.length === 0 && idx === 0,
        altText: 'Product Image'
      }));

      setEditingImagesList(prev => {
        const combined = [...prev, ...newItems];
        const hasPrimary = combined.some(item => item.isPrimary);
        if (!hasPrimary && combined.length > 0) {
          combined[0].isPrimary = true;
        }
        return combined;
      });

      showToast(`Added ${newItems.length} image(s) to product gallery.`);
    } catch (err) {
      setError(err.message || 'Failed to upload images.');
    } finally {
      setEditingUploadLoading(false);
    }
  };

  const handleSaveProductImages = async () => {
    if (!editingImagesProductId) return;
    try {
      await api.put(`/api/products/${editingImagesProductId}/images`, { images: editingImagesList });
      showToast('Product gallery updated successfully.');
      setEditingImagesProductId(null);
      setEditingImagesList([]);
      fetchSupplierData();
    } catch (err) {
      setError(err.message || 'Failed to save product images.');
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

          {commissionSupplier && (
            <div 
              title={`Hold Lock: ${commissionSupplier.customHoldDays !== null ? commissionSupplier.customHoldDays + ' days (Custom Override)' : commissionSupplier.trustLevel === 'Platinum' || commissionSupplier.trustLevel === 'Gold' ? '3-day Lock' : commissionSupplier.trustLevel === 'Silver' ? '5-day Lock' : '7-day Lock'} | Return Rate: ${(commissionSupplier.returnRate || 0).toFixed(1)}%`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: commissionSupplier.trustLevel === 'Platinum' 
                  ? 'rgba(168,85,247,0.12)' 
                  : commissionSupplier.trustLevel === 'Gold'
                  ? 'rgba(234,179,8,0.12)'
                  : commissionSupplier.trustLevel === 'Silver'
                  ? 'rgba(148,163,184,0.12)'
                  : 'rgba(251,146,60,0.12)',
                color: commissionSupplier.trustLevel === 'Platinum' 
                  ? '#c084fc' 
                  : commissionSupplier.trustLevel === 'Gold'
                  ? '#eab308'
                  : commissionSupplier.trustLevel === 'Silver'
                  ? '#94a3b8'
                  : '#fb923c',
                border: `1px solid ${
                  commissionSupplier.trustLevel === 'Platinum' 
                    ? 'rgba(168,85,247,0.25)' 
                    : commissionSupplier.trustLevel === 'Gold'
                    ? 'rgba(234,179,8,0.25)'
                    : commissionSupplier.trustLevel === 'Silver'
                    ? 'rgba(148,163,184,0.25)'
                    : 'rgba(251,146,60,0.25)'
                }`,
                boxShadow: commissionSupplier.trustLevel === 'Gold' || commissionSupplier.trustLevel === 'Platinum'
                  ? `0 0 10px ${commissionSupplier.trustLevel === 'Gold' ? 'rgba(234,179,8,0.15)' : 'rgba(168,85,247,0.15)'}`
                  : 'none',
                cursor: 'help'
              }}
            >
              <Star size={12} fill="currentColor" />
              <span>{commissionSupplier.trustLevel || 'Bronze'} Supplier</span>
            </div>
          )}

          {licenseInfo && (
            <div 
              title={
                licenseInfo.isValid 
                  ? `License key is active! Expires at: ${licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString() : 'Never'} (${licenseInfo.daysRemaining} days remaining)`
                  : licenseInfo.hasLicense 
                  ? 'Your license key is expired or inactive. Renew your license with administration.'
                  : 'You have no physical shop POS license. Contact administration to purchase.'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: licenseInfo.isValid 
                  ? 'rgba(52,168,83,0.12)' 
                  : 'rgba(234,67,53,0.12)',
                color: licenseInfo.isValid 
                  ? '#34a853' 
                  : '#ea4335',
                border: `1px solid ${
                  licenseInfo.isValid 
                    ? 'rgba(52,168,83,0.25)' 
                    : 'rgba(234,67,53,0.25)'
                }`,
                cursor: 'help'
              }}
            >
              <KeyRound size={12} fill="none" />
              <span>POS License: {licenseInfo.isValid ? 'Active' : 'Inactive'}</span>
            </div>
          )}

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
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease', display: 'none' }}
              >
                <Send size={18} />
                Transfer Requests ({transfers.length})
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('commissions')} 
                className={`sidebar-link w-full text-left ${activeTab === 'commissions' ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <PlusCircle size={18} style={{ color: '#10b981' }} />
                My Commissions
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
                    <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                      {/* Section 1: Basic Identity */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          1. Product Identity & Category
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
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
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BARCODE</label>
                            <input 
                              type="text"
                              value={newBarcode}
                              onChange={(e) => setNewBarcode(e.target.value)}
                              placeholder="e.g. 8801234567890"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BRAND</label>
                            <input 
                              type="text"
                              value={newBrand}
                              onChange={(e) => setNewBrand(e.target.value)}
                              placeholder="e.g. Zara, BrandCreator Wear"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CATEGORY</label>
                            <input 
                              type="text"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="e.g. Clothing > Kurti"
                              className="styled-input"
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                             <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRODUCT GALLERY IMAGES</label>
                             
                             {/* Glassmorphic Drag & Drop zone */}
                             <div 
                               onDragOver={handleDragOver}
                               onDragLeave={handleDragLeave}
                               onDrop={handleDrop}
                               style={{
                                 border: isDragOver ? '2px dashed hsl(var(--primary))' : '2px dashed rgba(255,255,255,0.12)',
                                 borderRadius: '16px',
                                 padding: '36px 20px',
                                 textAlign: 'center',
                                 background: isDragOver ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.18)',
                                 boxShadow: isDragOver ? '0 0 24px hsl(var(--primary) / 0.1)' : 'none',
                                 transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                 cursor: uploadingImage ? 'wait' : 'pointer',
                                 position: 'relative',
                                 backdropFilter: 'blur(8px)'
                               }}
                             >
                               <input
                                 type="file"
                                 multiple
                                 accept="image/png,image/jpeg,image/webp"
                                 onChange={handleProductImageUpload}
                                 disabled={uploadingImage}
                                 style={{
                                   position: 'absolute',
                                   top: 0, left: 0, width: '100%', height: '100%',
                                   opacity: 0, cursor: 'pointer'
                                 }}
                               />
                               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                 <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--secondary))' }}>
                                   {uploadingImage ? <RefreshCw className="spin-anim" size={20} /> : <Upload size={20} />}
                                 </div>
                                 <div>
                                   <h5 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '6px', color: '#fff' }}>
                                     {uploadingImage ? 'Processing files...' : 'Drag & drop product images here, or click to browse'}
                                   </h5>
                                   <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                                     {uploadingImage ? uploadProgress : 'Supports PNG, JPG, or WEBP (up to 10 files, automated WebP compression & Local Fallback)'}
                                   </p>
                                 </div>
                               </div>
                             </div>

                             {/* Fallback Paste Input */}
                             <div style={{ marginTop: '12px' }}>
                               <input 
                                 type="text"
                                 placeholder="Or paste external image URL and press Enter to add..."
                                 className="styled-input"
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     e.preventDefault();
                                     const val = e.target.value.trim();
                                     if (val) {
                                       setNewImages(prev => [
                                         ...prev, 
                                         { imageUrl: val, isPrimary: prev.length === 0, altText: 'Product Image' }
                                       ]);
                                       e.target.value = '';
                                       showToast('External image URL linked successfully.');
                                     }
                                   }
                                 }}
                               />
                             </div>

                             {/* Interactive Gallery Thumbnails */}
                             {newImages.length > 0 && (
                               <div style={{ marginTop: '20px' }}>
                                 <label style={{ display: 'block', fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                   Product Gallery Items ({newImages.length})
                                 </label>
                                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                                   {newImages.map((img, idx) => (
                                     <div 
                                       key={idx} 
                                       style={{
                                         position: 'relative',
                                         borderRadius: '12px',
                                         border: img.isPrimary ? '1px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.06)',
                                         overflow: 'hidden',
                                         background: 'rgba(13, 17, 24, 0.7)',
                                         boxShadow: img.isPrimary ? '0 4px 15px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0,0,0,0.2)',
                                         transition: 'all 0.25s ease'
                                       }}
                                     >
                                       <img src={img.imageUrl.startsWith('/uploads') ? `${backendUrl}${img.imageUrl}` : img.imageUrl} alt={img.altText} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                                       
                                       {/* Primary star label overlay */}
                                       {img.isPrimary && (
                                         <span style={{
                                           position: 'absolute', top: '6px', left: '6px',
                                           background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))',
                                           fontSize: '0.62rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px',
                                           display: 'flex', alignItems: 'center', gap: '3px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                         }}>
                                           <Star size={8} fill="currentColor" /> Primary
                                         </span>
                                       )}

                                       {/* Delete button overlay */}
                                       <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                                         <button
                                           type="button"
                                           onClick={() => handleDeleteImage(idx, newImages, setNewImages)}
                                           style={{
                                             width: '22px', height: '22px', borderRadius: '4px',
                                             background: 'rgba(234, 67, 53, 0.85)', border: 'none', color: '#fff',
                                             display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                             transition: 'background 0.2s'
                                           }}
                                           title="Delete Image"
                                         >
                                           <Trash2 size={11} />
                                         </button>
                                       </div>

                                       {/* Navigation & Action Footer */}
                                       <div style={{
                                         padding: '6px',
                                         background: 'rgba(9, 13, 20, 0.9)',
                                         display: 'flex',
                                         alignItems: 'center',
                                         justifyContent: 'space-between',
                                         borderTop: '1px solid rgba(255,255,255,0.06)'
                                       }}>
                                         <div style={{ display: 'flex', gap: '4px' }}>
                                           <button
                                             type="button"
                                             disabled={idx === 0}
                                             onClick={() => handleMoveImage(idx, -1, newImages, setNewImages)}
                                             style={{
                                               width: '18px', height: '18px', borderRadius: '3px',
                                               background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                               display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                               opacity: idx === 0 ? 0.3 : 0.8
                                             }}
                                           >
                                             <ArrowLeft size={10} />
                                           </button>
                                           <button
                                             type="button"
                                             disabled={idx === newImages.length - 1}
                                             onClick={() => handleMoveImage(idx, 1, newImages, setNewImages)}
                                             style={{
                                               width: '18px', height: '18px', borderRadius: '3px',
                                               background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                               display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === newImages.length - 1 ? 'not-allowed' : 'pointer',
                                               opacity: idx === newImages.length - 1 ? 0.3 : 0.8
                                             }}
                                           >
                                             <ArrowRight size={10} />
                                           </button>
                                         </div>

                                         {!img.isPrimary && (
                                           <button
                                             type="button"
                                             onClick={() => handleSetPrimary(idx, newImages, setNewImages)}
                                             style={{
                                               fontSize: '0.62rem', fontWeight: '700', color: 'hsl(var(--primary))',
                                               background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px'
                                             }}
                                           >
                                             Set Primary
                                           </button>
                                         )}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      </div>

                      {/* Section 2: Pricing & Sourcing */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          2. Sourcing & Pricing Details
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BASE PRICE / PAYABLE (৳)</label>
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
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RPU / MRP (৳)</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={newRpuMrp}
                              onChange={(e) => setNewRpuMrp(e.target.value)}
                              placeholder="e.g. 1850.00"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUGGESTED RETAIL PRICE (৳)</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={newSuggestedRetailPrice}
                              onChange={(e) => setNewSuggestedRetailPrice(e.target.value)}
                              placeholder="e.g. 1750.00"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COST NOTE / BREAKDOWN</label>
                            <input 
                              type="text"
                              value={newCostNote}
                              onChange={(e) => setNewCostNote(e.target.value)}
                              placeholder="e.g. Packaging includes premium box (৳50)"
                              className="styled-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Logistics & Variants */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          3. Variants & Fulfillment
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VARIANTS / SIZE / COLOR NOTES</label>
                            <input 
                              type="text"
                              value={newVariantsJson}
                              onChange={(e) => setNewVariantsJson(e.target.value)}
                              placeholder="e.g. Red: M, L | Blue: S, M"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUPPLIER LOCATION / HUB</label>
                            <input 
                              type="text"
                              value={newSupplierLocation}
                              onChange={(e) => setNewSupplierLocation(e.target.value)}
                              placeholder="e.g. Uttara Dhaka Warehouse"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DELIVERY COVERAGE</label>
                            <input 
                              type="text"
                              value={newDeliveryCoverageJson}
                              onChange={(e) => setNewDeliveryCoverageJson(e.target.value)}
                              placeholder="e.g. Nationwide, Inside Dhaka Only"
                              className="styled-input"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SUPPLIER REMARKS / NOTES</label>
                            <input 
                              type="text"
                              value={newSupplierNotes}
                              onChange={(e) => setNewSupplierNotes(e.target.value)}
                              placeholder="e.g. 100% premium cotton weave"
                              className="styled-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Submission & Flags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '18px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                            type="checkbox"
                            id="onlineSellingRequested"
                            checked={newOnlineSellingRequested}
                            onChange={(e) => setNewOnlineSellingRequested(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'hsl(var(--secondary))' }}
                          />
                          <label htmlFor="onlineSellingRequested" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
                            Online Selling Requested (Auto-approve for E-Store storefront list once QC approved)
                          </label>
                        </div>
                        <button type="submit" disabled={creating} className="btn-primary" style={{ padding: '12px 30px', fontSize: '0.9rem', borderRadius: '10px', height: '46px', background: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--secondary) / 0.8))', color: '#fff', boxShadow: '0 4px 15px hsl(var(--secondary) / 0.2)', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
                          {creating ? 'Initializing...' : 'Create Double Ledger & Product'}
                        </button>
                      </div>
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
                                 <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                   {p.imageUrl ? (
                                     <img 
                                       src={p.imageUrl} 
                                       alt={p.productName} 
                                       style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                     />
                                   ) : (
                                     <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
                                       No Image
                                     </div>
                                   )}
                                   <div>
                                     <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{p.productName}</div>
                                     <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '2px' }}>{p.sku}</div>
                                     
                                     <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                       {p.category && (
                                         <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(96, 165, 250, 0.15)', fontWeight: '600' }}>
                                           {p.category}
                                         </span>
                                       )}
                                       {p.brand && (
                                         <span style={{ fontSize: '0.7rem', color: '#c084fc', background: 'rgba(192, 132, 252, 0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(192, 132, 252, 0.15)', fontWeight: '600' }}>
                                           {p.brand}
                                         </span>
                                       )}
                                       {p.barcode && (
                                         <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' }}>
                                           Code: {p.barcode}
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                                 
                                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', paddingLeft: p.imageUrl ? '60px' : '0px' }}>
                                   <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: '700' }}>
                                     Base Price: {p.basePrice ? `৳${p.basePrice}` : '৳0.00'}
                                   </span>
                                   {p.rpuMrp && (
                                     <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.15)', fontWeight: '700' }}>
                                       RPU/MRP: ৳{p.rpuMrp}
                                     </span>
                                   )}
                                   {p.suggestedRetailPrice && (
                                     <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: '700' }}>
                                       SRP: ৳{p.suggestedRetailPrice}
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
                                  <button 
                                    onClick={() => handleOpenManageImagesModal(p)}
                                    className="btn-secondary" 
                                    style={{ padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                    title="Manage Product Images"
                                  >
                                    <ImageIcon size={13} style={{ color: 'hsl(var(--primary))' }} />
                                    Images ({p.images?.length || 0})
                                  </button>
                                  
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
                                        cursor: p.masterOnHand - p.masterReserved <= 0 ? 'not-allowed' : 'pointer',
                                        display: 'none'
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
                                  {historyEvents.map((evt, index) => (
                                    <div key={evt.EventId || evt.eventId || `event-${index}`} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                                  {historyJobs.map((job, index) => (
                                    <div key={job.JobId || job.jobId || `job-${index}`} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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

                  {/* Manage Product Images Modal */}
                  {editingImagesProductId && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'rgba(4, 6, 10, 0.85)', backdropFilter: 'blur(12px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      animation: 'scaleIn 0.25s ease'
                    }}>
                      <div className="glass-card-premium custom-scrollbar" style={{ padding: '36px', maxWidth: '640px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                            <ImageIcon style={{ color: 'hsl(var(--primary))' }} size={20} />
                            Manage Gallery for {editingImagesProductName}
                          </h3>
                          <button onClick={() => setEditingImagesProductId(null)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', display: 'flex' }}>
                            <X size={20} />
                          </button>
                        </div>

                        {/* Drag & Drop zone for existing product */}
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setEditingDragOver(true); }}
                          onDragLeave={() => setEditingDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setEditingDragOver(false); const files = e.dataTransfer?.files; if (files) uploadFilesForExistingProduct(files); }}
                          style={{
                            border: editingDragOver ? '2px dashed hsl(var(--primary))' : '2px dashed rgba(255,255,255,0.12)',
                            borderRadius: '16px',
                            padding: '30px 20px',
                            textAlign: 'center',
                            background: editingDragOver ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0,0,0,0.18)',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            cursor: editingUploadLoading ? 'wait' : 'pointer',
                            position: 'relative',
                            backdropFilter: 'blur(8px)',
                            marginBottom: '20px'
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => { if (e.target.files) uploadFilesForExistingProduct(e.target.files); e.target.value = ''; }}
                            disabled={editingUploadLoading}
                            style={{
                              position: 'absolute',
                              top: 0, left: 0, width: '100%', height: '100%',
                              opacity: 0, cursor: 'pointer'
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))' }}>
                              {editingUploadLoading ? <RefreshCw className="spin-anim" size={16} /> : <Upload size={16} />}
                            </div>
                            <div>
                              <h5 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px', color: '#fff' }}>
                                {editingUploadLoading ? 'Processing files...' : 'Drag & drop more images here, or click to browse'}
                              </h5>
                              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                                Supports PNG, JPG, or WEBP (WebP auto compression & Local Storage fallback)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Paste input for existing product */}
                        <div style={{ marginBottom: '20px' }}>
                          <input 
                            type="text"
                            placeholder="Or paste external image URL and press Enter to add..."
                            className="styled-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.target.value.trim();
                                if (val) {
                                  setEditingImagesList(prev => [
                                    ...prev, 
                                    { imageUrl: val, isPrimary: prev.length === 0, altText: 'Product Image' }
                                  ]);
                                  e.target.value = '';
                                  showToast('External image URL added.');
                                }
                              }
                            }}
                          />
                        </div>

                        {/* Grid for existing product */}
                        {editingImagesList.length === 0 ? (
                          <div style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', marginBottom: '24px' }}>
                            No images in gallery yet. Drag files above to upload!
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            {editingImagesList.map((img, idx) => (
                              <div 
                                key={idx} 
                                style={{
                                  position: 'relative',
                                  borderRadius: '12px',
                                  border: img.isPrimary ? '1px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.06)',
                                  overflow: 'hidden',
                                  background: 'rgba(13, 17, 24, 0.7)',
                                  boxShadow: img.isPrimary ? '0 4px 15px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0,0,0,0.2)',
                                  transition: 'all 0.25s ease'
                                }}
                              >
                                <img src={img.imageUrl.startsWith('/uploads') ? `${backendUrl}${img.imageUrl}` : img.imageUrl} alt={img.altText} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                                
                                {img.isPrimary && (
                                  <span style={{
                                    position: 'absolute', top: '6px', left: '6px',
                                    background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))',
                                    fontSize: '0.62rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', gap: '3px'
                                  }}>
                                    <Star size={8} fill="currentColor" /> Primary
                                  </span>
                                )}

                                <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(idx, editingImagesList, setEditingImagesList)}
                                    style={{
                                      width: '22px', height: '22px', borderRadius: '4px',
                                      background: 'rgba(234, 67, 53, 0.85)', border: 'none', color: '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                    }}
                                    title="Delete Image"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>

                                <div style={{
                                  padding: '6px',
                                  background: 'rgba(9, 13, 20, 0.9)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderTop: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveImage(idx, -1, editingImagesList, setEditingImagesList)}
                                      style={{
                                        width: '18px', height: '18px', borderRadius: '3px',
                                        background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                        opacity: idx === 0 ? 0.3 : 0.8
                                      }}
                                    >
                                      <ArrowLeft size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === editingImagesList.length - 1}
                                      onClick={() => handleMoveImage(idx, 1, editingImagesList, setEditingImagesList)}
                                      style={{
                                        width: '18px', height: '18px', borderRadius: '3px',
                                        background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: idx === editingImagesList.length - 1 ? 'not-allowed' : 'pointer',
                                        opacity: idx === editingImagesList.length - 1 ? 0.3 : 0.8
                                      }}
                                    >
                                      <ArrowRight size={10} />
                                    </button>
                                  </div>

                                  {!img.isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimary(idx, editingImagesList, setEditingImagesList)}
                                      style={{
                                        fontSize: '0.62rem', fontWeight: '700', color: 'hsl(var(--primary))',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px'
                                      }}
                                    >
                                      Primary
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                          <button type="button" onClick={() => setEditingImagesProductId(null)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px', cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button type="button" onClick={handleSaveProductImages} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '10px', cursor: 'pointer' }}>
                            Save Gallery Changes
                          </button>
                        </div>
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
              {activeTab === 'byok' &&
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
              }

              {/* TAB: POS / PHYSICAL SALE */}
              {activeTab === 'physicalSale' && (
                <div className="tab-animation">
                  <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers style={{ color: 'hsl(var(--primary))' }} size={28} />
                        POS / Physical Shop Sale
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.925rem' }}>
                        Record instant walk-in physical sales directly reducing MASTER stock pool.
                      </p>
                    </div>
                    {licenseInfo?.isValid && (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'rgba(52, 168, 83, 0.12)',
                        color: '#34a853',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid rgba(52, 168, 83, 0.25)'
                      }}>
                        License Key: {licenseInfo.licenseKey}
                      </span>
                    )}
                  </div>

                  {!licenseInfo?.isValid ? (
                    /* LICENSE GATE SCREEN */
                    <div className="glass-card-premium" style={{
                      padding: '80px 40px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '24px',
                      background: 'rgba(13, 17, 24, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                      maxWidth: '680px',
                      margin: '40px auto',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Background blur decorative element */}
                      <div style={{
                        position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px',
                        background: 'hsl(var(--primary) / 0.15)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
                      }} />
                      <div style={{
                        position: 'absolute', bottom: '-50px', right: '-50px', width: '200px', height: '200px',
                        background: 'hsl(var(--primary) / 0.1)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
                      }} />

                      <div style={{
                        position: 'relative',
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        background: 'rgba(234, 67, 53, 0.1)',
                        border: '2px solid rgba(234, 67, 53, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ea4335',
                        marginBottom: '8px',
                        zIndex: 1
                      }}>
                        <KeyRound size={42} style={{ filter: 'drop-shadow(0 0 10px rgba(234,67,53,0.3))' }} />
                      </div>

                      <div style={{ zIndex: 1 }}>
                        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>
                          POS Access Restricted
                        </h3>
                        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto' }}>
                          To activate the physical POS / Point of Sale panel and sync your walk-in shop orders directly with the shared stock ledger, you must have an active monthly license key.
                        </p>
                      </div>

                      <div className="glass-card" style={{
                        padding: '16px 24px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        color: 'hsl(var(--text-muted))',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        width: '100%',
                        maxWidth: '440px',
                        textAlign: 'left'
                      }}>
                        <div><strong>Current Status:</strong> <span style={{ color: '#ea4335', fontWeight: '700' }}>Inactive</span></div>
                        {licenseInfo?.licenseKey ? (
                          <>
                            <div><strong>License Key:</strong> <span style={{ fontFamily: 'monospace' }}>{licenseInfo.licenseKey}</span></div>
                            {licenseInfo.expiresAt && (
                              <div><strong>Expired On:</strong> {new Date(licenseInfo.expiresAt).toLocaleString()}</div>
                            )}
                          </>
                        ) : (
                          <div><strong>License Key:</strong> None Issued</div>
                        )}
                        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', fontSize: '0.78rem', color: '#ffb300' }}>
                          💡 Please contact the BrandCreator admin team at <strong>admin@brandcreator.com</strong> to get a new license key or renew your subscription.
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* FULL POS SCREEN */
                    <>
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
                              style={{ textTransform: 'none', width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
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
                                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}
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
                    </>
                  )}
                </div>
              )}

              {/* TAB: MY COMMISSIONS */}
              {activeTab === 'commissions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="tab-animation">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff' }}>My Commissions & Sales Payable</h2>
                      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Audited payout ledger for your multi-vendor sales and platform commissions</p>
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

                  {commissionLoading && !commissionSummary ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                      <RefreshCw size={36} className="spin-anim" style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                  ) : (
                    <>
                      {/* STATS TILES */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #fff' }}>
                          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', fontWeight: '700', letterSpacing: '0.05em' }}>MY GROSS SALES</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '4px' }}>
                            Across {commissionSummary?.totalOrders || 0} ordered items
                          </span>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #ea4335' }}>
                          <span style={{ fontSize: '0.72rem', color: '#ea4335', fontWeight: '700', letterSpacing: '0.05em' }}>PLATFORM COMMISSION FEES</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ea4335', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.totalCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '4px' }}>
                            Waterfall fee resolved on sale
                          </span>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
                          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', fontWeight: '700', letterSpacing: '0.05em' }}>PENDING PAYOUT (DUE)</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(var(--primary))', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.pendingPayable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '4px' }}>
                            Awaiting admin manual payout
                          </span>
                        </div>

                        <div className="glass-card-premium" style={{ borderLeft: '4px solid #3b82f6' }}>
                          <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: '700', letterSpacing: '0.05em' }}>SETTLED PAYOUTS (RECEIVED)</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6', margin: '6px 0 0 0' }}>
                            ৳{Number(commissionSummary?.paidPayable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </h4>
                          <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '4px' }}>
                            Transferred to bank/wallet
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.8fr', gap: '24px' }}>
                        {/* LEFT COLUMN: ACTIVE RATE WIDGET, PROGRESS, CALCULATOR */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>Waterfall Fee Status</h3>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: '700' }}>MY BASE COMMISSION RATE</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(var(--primary))' }}>
                                  {commissionCurrentRate?.rate !== undefined ? commissionCurrentRate.rate : 10.00}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>%</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                                Source resolved via: <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'hsl(var(--primary))' }}>{commissionCurrentRate?.source || 'GLOBAL_DEFAULT'}</span>
                              </div>
                            </div>

                            {/* Phase 3D: Volume Tier Progress Bar */}
                            {(() => {
                              const currentSales = Number(commissionSummary?.totalSales || 0);
                              let currentTierName = 'Bronze';
                              let nextTierName = 'Silver';
                              let nextTierMin = 10000;
                              let tierProgress = 0;
                              let nextTierDiff = 0;

                              if (currentSales >= 100000) {
                                currentTierName = 'Platinum';
                                nextTierName = null;
                                tierProgress = 100;
                              } else if (currentSales >= 50000) {
                                currentTierName = 'Gold';
                                nextTierName = 'Platinum';
                                nextTierMin = 100000;
                                tierProgress = ((currentSales - 50000) / 50000) * 100;
                                nextTierDiff = 100000 - currentSales;
                              } else if (currentSales >= 10000) {
                                currentTierName = 'Silver';
                                nextTierName = 'Gold';
                                nextTierMin = 50000;
                                tierProgress = ((currentSales - 10000) / 40000) * 100;
                                nextTierDiff = 50000 - currentSales;
                              } else {
                                currentTierName = 'Bronze';
                                nextTierName = 'Silver';
                                nextTierMin = 10000;
                                tierProgress = (currentSales / 10000) * 100;
                                nextTierDiff = 10000 - currentSales;
                              }

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: '700', color: 'hsl(var(--text-secondary))' }}>
                                    <span>VOLUME TIER: {currentTierName}</span>
                                    <span>{tierProgress.toFixed(0)}%</span>
                                  </div>
                                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, tierProgress))}%`, background: 'linear-gradient(90deg, hsl(var(--primary)), #10b981)', borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                  </div>
                                  {nextTierName && (
                                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: '1.4' }}>
                                      Sell <strong style={{ color: 'hsl(var(--primary))' }}>৳{nextTierDiff.toLocaleString()}</strong> more to reach <strong style={{ color: '#fff' }}>{nextTierName} Tier</strong> ({nextTierName === 'Silver' ? '8%' : nextTierName === 'Gold' ? '6%' : '5%'} fee)!
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Phase 3D: Commission Savings Calculator */}
                          {(() => {
                            const currentSales = Number(commissionSummary?.totalSales || 0);
                            const actualRate = commissionCurrentRate?.rate !== undefined ? commissionCurrentRate.rate : 10.00;
                            const marketplaceRate = 15.00;
                            const savedPercentage = Math.max(0, marketplaceRate - actualRate);
                            const moneySaved = currentSales * (savedPercentage / 100.0);

                            return (
                              <div className="glass-card" style={{ padding: '20px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '800', letterSpacing: '0.04em' }}>🔥 ECOSYSTEM SAVINGS</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>৳{moneySaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                                  You saved <strong style={{ color: '#10b981' }}>{savedPercentage.toFixed(0)}%</strong> in fee deductions compared to other standard 15% marketplaces!
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* RIGHT COLUMN: TRANSACTIONS TABLE */}
                        <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Recent Postings</h3>
                          
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="styled-table">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>ORDER REF</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>PRODUCT</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>GROSS SALE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>COMMISSION RATE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>COMMISSION DEDUCTED</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>MY PAYABLE</th>
                                <th style={{ padding: '12px 8px', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: '700' }}>STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commissionRecent.length === 0 ? (
                                <tr>
                                  <td colSpan={7} style={{ padding: '40px', textStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No sales postings recorded yet.</td>
                                </tr>
                              ) : (
                                commissionRecent.map(item => (
                                  <tr key={item.entryId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: '700', color: '#fff' }}>{item.orderRef}</td>
                                    <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>{item.productName}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>৳{Number(item.saleAmount).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{item.commissionRate}%</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ea4335' }}>৳{Number(item.commissionAmount).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'hsl(var(--primary))' }}>৳{Number(item.supplierPayable).toFixed(2)}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                          fontSize: '0.72rem',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          fontWeight: '700',
                                          background: item.status === 'PAID' ? 'rgba(16,185,129,0.1)' : item.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                          color: item.status === 'PAID' ? '#10b981' : item.status === 'PENDING' ? '#f59e0b' : '#ef4444',
                                          border: item.status === 'PAID' ? '1px solid rgba(16,185,129,0.2)' : item.status === 'PENDING' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)'
                                        }}>{item.status}</span>
                                        {item.status === 'PENDING' && (
                                          <span 
                                            title={item.isLocked === 1 ? 'Locked: Order is currently within the return lock-out window.' : 'Released: Locked return period expired, eligible for payout!'}
                                            style={{
                                              display: 'inline-flex',
                                              color: item.isLocked === 1 ? '#fbbf24' : '#10b981',
                                              cursor: 'help'
                                            }}
                                          >
                                            {item.isLocked === 1 ? <KeyRound size={12} /> : <CheckCircle size={12} />}
                                          </span>
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
                    </>
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
