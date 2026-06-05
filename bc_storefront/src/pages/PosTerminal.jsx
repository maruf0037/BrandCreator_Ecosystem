// src/pages/PosTerminal.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, DollarSign, 
  CreditCard, Smartphone, Check, Printer, ArrowLeft, Layers, 
  Tag, RefreshCw, FileText, X, Barcode, Wifi, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { api, getBackendUrl } from '../services/api';

const posStyles = `
  @keyframes scanPulse {
    0% { border-color: rgba(255,255,255,0.06); box-shadow: none; }
    50% { border-color: hsl(var(--primary) / 0.6); box-shadow: 0 0 15px hsl(var(--primary) / 0.15); }
    100% { border-color: rgba(255,255,255,0.06); box-shadow: none; }
  }
  @keyframes blinkGlow {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
  
  .pos-container {
    display: grid;
    grid-template-columns: 1.1fr 1fr 0.9fr;
    gap: 20px;
    height: calc(100vh - 120px);
    overflow: hidden;
  }
  
  .pos-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    box-shadow: var(--glass-shadow);
    padding: 20px;
    overflow: hidden;
  }
  
  .scanner-active {
    animation: scanPulse 2s infinite;
  }
  
  .glow-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #34a853;
    box-shadow: 0 0 8px #34a853;
    animation: blinkGlow 1.5s infinite;
  }
  
  .product-quick-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .product-quick-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: hsl(var(--primary) / 0.3);
    transform: translateY(-2px);
  }
  
  .shortcut-key {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: bold;
    color: hsl(var(--primary));
    box-shadow: 0 2px 0 rgba(0,0,0,0.2);
  }
  
  .payment-method-btn {
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: hsl(var(--text-secondary));
  }
  .payment-method-btn:hover {
    background: rgba(255,255,255,0.04);
    color: #fff;
  }
  .payment-method-btn.active {
    background: hsl(var(--primary-glow));
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
  }
  
  .receipt-box {
    background: #ffffff;
    color: #000000;
    font-family: 'Courier New', Courier, monospace;
    border-radius: 4px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    max-height: 500px;
    overflow-y: auto;
  }

  @media (max-width: 1200px) {
    .pos-container {
      grid-template-columns: 1fr;
      height: auto;
      overflow: visible;
    }
    .pos-panel {
      height: 600px;
    }
  }
`;

export default function PosTerminal() {
  const navigate = useNavigate();
  const backendUrl = getBackendUrl();
  const barcodeInputRef = useRef(null);
  const promoInputRef = useRef(null);

  // Core State
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  
  // Cart/Invoice State
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Settlement details
  const [customerPhone, setCustomerPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  // UI Status
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // success, error, info
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // 1. Fetch user on mount and inject custom stylesheet
  useEffect(() => {
    // Inject Custom Stylesheet
    const styleEl = document.createElement('style');
    styleEl.className = 'pos-custom-styles-injected';
    styleEl.innerHTML = posStyles;
    document.head.appendChild(styleEl);

    // Retrieve currentUser from sessionStorage
    try {
      const cached = sessionStorage.getItem('bc_user');
      if (cached) {
        setCurrentUser(JSON.parse(cached));
      }
    } catch (_) {}

    // Initial Data Fetch
    fetchProducts();

    return () => {
      document.querySelectorAll('.pos-custom-styles-injected').forEach(el => el.remove());
    };
  }, []);

  // 2. Keyboard shortcut event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2: Focus Barcode Search Input
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        showToast('Scanner Search focused (F2)', 'info');
      }
      // F8: Focus Promotion Code Input
      else if (e.key === 'F8') {
        e.preventDefault();
        promoInputRef.current?.focus();
        showToast('Promotion Coupon focused (F8)', 'info');
      }
      // F9: Quick Cash Settlement
      else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length === 0) {
          showToast('Cannot checkout: Cart is empty!', 'error');
          return;
        }
        setPaymentMethod('CASH');
        handleCheckout('CASH');
      }
      // F10: Clear Cart/Invoice
      else if (e.key === 'F10') {
        e.preventDefault();
        clearCart();
        showToast('Current cart cleared (F10)', 'info');
      }
      // ESC: Close Modal
      else if (e.key === 'Escape') {
        setShowReceiptModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerPhone, promoCode, appliedPromo, paymentMethod]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get('/api/products');
      setProducts(data.items || data || []);
      setDbConnected(true);
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast('Database Offline or Server Error', 'error');
      setDbConnected(false);
    } finally {
      setLoadingProducts(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const getProductPrice = (product) => {
    if (product.retailPrice) return parseFloat(product.retailPrice);
    if (product.suggestedRetailPrice) return parseFloat(product.suggestedRetailPrice);
    if (product.rpuMrp) return parseFloat(product.rpuMrp);
    return product.basePrice ? parseFloat(product.basePrice) : 1200;
  };

  const getProductStock = (product) => {
    if (product.sellOnHand !== undefined) {
      return product.sellOnHand - (product.sellReserved || 0);
    }
    return product.onHandQty !== undefined ? product.onHandQty : 100;
  };

  const addToCart = (product) => {
    const availableStock = getProductStock(product);
    const inCart = cart.find(item => item.product.productId === product.productId);
    const currentQtyInCart = inCart ? inCart.qty : 0;

    if (availableStock <= currentQtyInCart) {
      showToast(`Out of stock! Only ${availableStock} units available.`, 'error');
      return;
    }

    if (inCart) {
      setCart(cart.map(item => 
        item.product.productId === product.productId
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, qty: 1, unitPrice: getProductPrice(product) }]);
    }
    
    // Clear applied kopt/promo when cart items change to force re-validation
    if (appliedPromo) {
      setAppliedPromo(null);
      showToast('Cart updated: Please validate coupon code again.', 'info');
    }

    showToast(`Added: ${product.productName}`);
  };

  const updateQty = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(i => i.product.productId === productId);
    if (!item) return;

    const availableStock = getProductStock(item.product);
    if (newQty > availableStock) {
      showToast(`Out of stock! Max available is ${availableStock} units.`, 'error');
      return;
    }

    setCart(cart.map(i => i.product.productId === productId ? { ...i, qty: newQty } : i));
    
    if (appliedPromo) {
      setAppliedPromo(null);
      showToast('Quantities changed: Re-validate coupon.', 'info');
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.productId !== productId));
    if (appliedPromo) {
      setAppliedPromo(null);
    }
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
    setPromoCode('');
    setCustomerPhone('');
  };

  // 3. Barcode Scanner Simulation Handler
  const handleScannerSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const searchVal = searchQuery.trim().toUpperCase();
    
    // Search by Barcode or SKU
    const matchedProduct = products.find(p => 
      (p.barcode && p.barcode.toUpperCase() === searchVal) || 
      (p.sku && p.sku.toUpperCase() === searchVal)
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setSearchQuery('');
    } else {
      // Fallback search by Product ID (direct number check)
      const isNum = /^\d+$/.test(searchVal);
      if (isNum) {
        const pIdMatch = products.find(p => p.productId === parseInt(searchVal));
        if (pIdMatch) {
          addToCart(pIdMatch);
          setSearchQuery('');
          return;
        }
      }
      
      // If not barcode/sku/id, we check if there's exactly one partial name match
      const nameMatches = products.filter(p => 
        p.productName.toUpperCase().includes(searchVal)
      );

      if (nameMatches.length === 1) {
        addToCart(nameMatches[0]);
        setSearchQuery('');
      } else if (nameMatches.length > 1) {
        showToast(`Multiple matches (${nameMatches.length}). Select manually.`, 'info');
      } else {
        showToast(`Product not found: "${searchQuery}"`, 'error');
      }
    }
  };

  // 4. Coupon Validation Handler
  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    if (cart.length === 0) {
      showToast('Add items to cart before applying coupon!', 'error');
      return;
    }

    setValidatingPromo(true);
    try {
      const itemsPayload = cart.map(item => ({
        productId: item.product.productId,
        qty: item.qty,
        unitPrice: item.unitPrice
      }));

      const response = await api.post('/api/promotions/validate', {
        promoCode: promoCode.trim(),
        items: itemsPayload
      });

      if (response.valid) {
        setAppliedPromo({
          promoCode: response.promoCode,
          discountAmount: parseFloat(response.discountAmount),
          promoType: response.promoType,
          discountValue: response.discountValue
        });
        showToast(`Coupon ${response.promoCode} applied successfully!`);
      } else {
        setAppliedPromo(null);
        showToast(response.message || 'Invalid or expired coupon', 'error');
      }
    } catch (err) {
      console.error(err);
      setAppliedPromo(null);
      showToast(err.message || 'Coupon validation failed', 'error');
    } finally {
      setValidatingPromo(false);
    }
  };

  // 5. Compute Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  
  let calculatedDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountAmount !== undefined) {
      // Use amount calculated by backend directly
      calculatedDiscount = appliedPromo.discountAmount;
    } else {
      // Fallback calculation logic
      calculatedDiscount = appliedPromo.promoType === 'PERCENTAGE' 
        ? (subtotal * appliedPromo.discountValue / 100) 
        : appliedPromo.discountValue;
    }
  }

  const grandTotal = Math.max(0, subtotal - calculatedDiscount);

  // 6. Checkout Submission Handler
  const handleCheckout = async (forcePaymentMethod = null) => {
    if (cart.length === 0) {
      showToast('Cannot settle: Cart is empty!', 'error');
      return;
    }

    const currentPaymentMethod = forcePaymentMethod || paymentMethod;

    setIsSubmitting(true);
    try {
      const uniqueOrderRef = `POS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const itemsPayload = cart.map(item => ({
        productId: item.product.productId,
        qty: item.qty,
        unitPrice: item.unitPrice
      }));

      const checkoutPayload = {
        orderRef: uniqueOrderRef,
        items: itemsPayload,
        currency: 'BDT',
        customerPhone: customerPhone.trim() || '01888888888', // Default walk-in number
        saleChannel: 'PHYSICAL_SHOP',
        paymentMethod: currentPaymentMethod,
        promoCode: appliedPromo ? appliedPromo.promoCode : null
      };

      const response = await api.post('/api/orders', checkoutPayload);
      
      // Store checkout result for Receipt Modal
      setReceiptData({
        orderId: response.orderId || Math.floor(Math.random() * 10000),
        orderRef: uniqueOrderRef,
        customerPhone: checkoutPayload.customerPhone,
        paymentMethod: checkoutPayload.paymentMethod,
        subtotal: subtotal,
        discount: calculatedDiscount,
        total: grandTotal,
        items: cart,
        promoCodeApplied: checkoutPayload.promoCode,
        createdAt: new Date().toISOString()
      });

      // Clear Cart
      clearCart();
      showToast('Checkout Completed Successfully!');
      setShowReceiptModal(true);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Settlement failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by search query (text input fallback) and category tabs
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div className="main-content" style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '40px', zIndex: 1000,
          background: toastType === 'error' ? 'rgba(234,67,53,0.95)' : toastType === 'info' ? 'rgba(52,152,219,0.95)' : 'rgba(52,168,83,0.95)',
          color: '#fff', padding: '12px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontWeight: '600', animation: 'scaleIn 0.2s ease-out'
        }}>
          {toastType === 'error' && <AlertTriangle size={18} />}
          {toastType === 'success' && <CheckCircle2 size={18} />}
          {toastType === 'info' && <Wifi size={18} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(currentUser?.role === 'Supplier' ? '/supplier' : '/admin')} 
            className="btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
              <Barcode style={{ color: 'hsl(var(--primary))' }} size={24} />
              BrandCreator Cashier Terminal
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))' }}>
              Walk-in checkout console. Optimized for speed & barcode scanning.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className={dbConnected ? 'glow-dot' : 'glow-dot'} style={{ backgroundColor: dbConnected ? '#34a853' : '#ea4335', boxShadow: dbConnected ? '0 0 8px #34a853' : '0 0 8px #ea4335' }} />
            <span>{dbConnected ? 'Database Connected' : 'Database Disconnected'}</span>
          </div>
          <div className="user-badge" style={{ fontSize: '0.85rem' }}>
            <span style={{ fontWeight: '600' }}>{currentUser?.email || 'cashier@brandcreator.com'}</span>
            <span className="role-tag role-admin" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              {currentUser?.role || 'Admin'}
            </span>
          </div>
        </div>
      </div>

      {/* POS Console Core Layout */}
      <div className="pos-container">
        
        {/* PANEL 1: PRODUCT SEARCH & GRID QUICK SELECT */}
        <div className="pos-panel scanner-active" style={{ gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>
                BARCODE / SKU INPUT (SIMULATION)
              </label>
              <span className="shortcut-key">F2</span>
            </div>
            
            <form onSubmit={handleScannerSubmit} style={{ display: 'flex', position: 'relative' }}>
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan GTIN/EAN or type SKU... (Press Enter)"
                style={{
                  width: '100%', padding: '12px 14px', paddingLeft: '40px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: '0.9rem', outline: 'none'
                }}
                autoFocus
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 12px', borderRadius: '6px', fontSize: '0.8rem' }}
              >
                Scan
              </button>
            </form>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.05)',
                  background: activeCategory === cat ? 'hsl(var(--primary-glow))' : 'rgba(255,255,255,0.02)',
                  color: activeCategory === cat ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product list quick selector */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }} className="custom-scrollbar">
            {loadingProducts ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div className="spin-anim" style={{ width: '25px', height: '25px', border: '3px solid rgba(255,255,255,0.06)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '40px 10px', fontSize: '0.85rem' }}>
                No products found.
              </div>
            ) : (
              filteredProducts.map(p => {
                const stock = getProductStock(p);
                const price = getProductPrice(p);
                const imageSrc = p.imageUrl || (p.images && p.images[0]?.imageUrl);
                const resolvedImgUrl = imageSrc?.startsWith('/uploads') ? `${backendUrl}${imageSrc}` : imageSrc || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=150';
                
                return (
                  <div 
                    key={p.productId} 
                    className="product-quick-card"
                    onClick={() => addToCart(p)}
                  >
                    <img
                      src={resolvedImgUrl}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=150'; }}
                      alt={p.productName}
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.productName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>
                        <span>SKU: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{p.sku || 'N/A'}</strong></span>
                        {p.barcode && <span>Code: <strong style={{ color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>{p.barcode}</strong></span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'hsl(var(--primary))', fontSize: '0.9rem' }}>
                        ৳{price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: stock <= 0 ? '#ea4335' : stock <= 5 ? '#fbbc05' : 'hsl(var(--text-muted))', fontWeight: '700', marginTop: '2px' }}>
                        {stock <= 0 ? 'Out of stock' : `${stock} Units`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: CURRENT INVOICE CART */}
        <div className="pos-panel" style={{ gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: 'hsl(var(--primary))' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>Current Invoice Items</h2>
            </div>
            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: '700' }}>
              {cart.reduce((sum, item) => sum + item.qty, 0)} Items
            </span>
          </div>

          {/* Cart Table Container */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px', color: 'hsl(var(--text-muted))' }}>
                <ShoppingCart size={32} style={{ opacity: 0.1 }} />
                <span style={{ fontSize: '0.85rem' }}>Invoice is currently empty.</span>
                <span style={{ fontSize: '0.72rem', textAlign: 'center' }}>Type code and Enter, or click on the product list.</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'hsl(var(--text-secondary))', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Product</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>Price</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', width: '100px' }}>Qty</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px 4px', width: '30px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 4px' }}>
                        <div style={{ fontWeight: '700', color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.product.productName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', marginTop: '2px' }}>
                          #{item.product.productId}
                        </div>
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '600' }}>
                        ৳{item.unitPrice.toFixed(0)}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <button
                            onClick={() => updateQty(item.product.productId, item.qty - 1)}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateQty(item.product.productId, parseInt(e.target.value) || 0)}
                            style={{ width: '28px', background: 'none', border: 'none', color: '#fff', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
                          />
                          <button
                            onClick={() => updateQty(item.product.productId, item.qty + 1)}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '800', color: 'hsl(var(--primary))' }}>
                        ৳{(item.qty * item.unitPrice).toFixed(0)}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                        <button
                          onClick={() => removeFromCart(item.product.productId)}
                          style={{ background: 'none', border: 'none', color: 'rgba(234,67,53,0.7)', cursor: 'pointer', transition: 'color 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#ea4335'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'rgba(234,67,53,0.7)'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pricing Ledger Summaries */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-secondary))' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: '600' }}>৳{subtotal.toFixed(2)}</span>
            </div>
            
            {appliedPromo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34a853', fontWeight: '600' }}>
                <span>Discount ({appliedPromo.promoCode}):</span>
                <span>-৳{calculatedDiscount.toFixed(2)}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
              <span>NET PAYABLE:</span>
              <span style={{ color: 'hsl(var(--primary))' }}>৳{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PANEL 3: CUSTOMER CRM & PAY SETTLEMENT */}
        <div className="pos-panel" style={{ gap: '16px' }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'hsl(var(--primary))' }} />
              Customer & Settlement
            </h2>
          </div>

          {/* Customer CRM info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--text-secondary))' }}>
              CUSTOMER PHONE (CRM TRACKING)
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 018XXXXXXXX"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#fff', fontSize: '0.85rem', outline: 'none'
              }}
            />
          </div>

          {/* Promotion / Coupon Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--text-secondary))' }}>
                PROMOTION CODE / COUPON
              </label>
              <span className="shortcut-key">F8</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                ref={promoInputRef}
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="PROMO10"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#fff', fontSize: '0.85rem', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleValidatePromo}
                disabled={validatingPromo || !promoCode}
                className="btn-secondary"
                style={{ padding: '0 16px', borderRadius: '8px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                {validatingPromo ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {appliedPromo && (
              <div style={{ fontSize: '0.75rem', color: '#34a853', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', marginTop: '2px' }}>
                <Check size={12} /> Coupon "{appliedPromo.promoCode}" active!
                <button
                  onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                  style={{ background: 'none', border: 'none', color: '#ea4335', fontSize: '0.75rem', cursor: 'pointer', padding: '0 2px' }}
                >
                  (Remove)
                </button>
              </div>
            )}
          </div>

          {/* Settlement / Payment Method Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--text-secondary))' }}>
              PAYMENT METHOD
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div 
                className={`payment-method-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('CASH')}
              >
                <DollarSign size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>CASH (F9)</span>
              </div>
              <div 
                className={`payment-method-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>CARD</span>
              </div>
              <div 
                className={`payment-method-btn ${paymentMethod === 'MOBILE_MONEY' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
              >
                <Smartphone size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>MOBILE MONEY</span>
              </div>
              <div 
                className={`payment-method-btn ${paymentMethod === 'STORE_CREDIT' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('STORE_CREDIT')}
              >
                <Layers size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>STORE CREDIT</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleCheckout()}
              disabled={isSubmitting || cart.length === 0}
              className="btn-primary"
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem' }}
            >
              {isSubmitting ? 'Processing Settlement...' : 'PROCESS SETTLEMENT'}
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(234,67,53,0.2)', color: 'rgba(255,255,255,0.7)' }}
            >
              Clear Current Order (F10)
            </button>
          </div>
        </div>

      </div>

      {/* Footer shortcut bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', justifyContent: 'center' }}>
        <span>Keyboard Shortcuts:</span>
        <span><span className="shortcut-key">F2</span> Focus Barcode Scan</span>
        <span><span className="shortcut-key">F8</span> Focus Coupon Input</span>
        <span><span className="shortcut-key">F9</span> Quick Cash Settlement</span>
        <span><span className="shortcut-key">F10</span> Clear Order</span>
        <span><span className="shortcut-key">ESC</span> Close Modals</span>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '450px', padding: '24px', background: 'rgba(15,22,36,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '800' }}>Settlement Complete</h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Box */}
            <div className="receipt-box">
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
                BRANDCREATOR POS
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.8rem', marginBottom: '15px' }}>
                Store Outlet Dhaka, BD<br />
                Ph: +880 1888888888
              </div>
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px', fontSize: '0.75rem' }}>
                Ref: {receiptData.orderRef}<br />
                Date: {new Date(receiptData.createdAt).toLocaleString()}<br />
                Phone: {receiptData.customerPhone}<br />
                Payment: {receiptData.paymentMethod}
              </div>
              
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                {receiptData.items.map(item => (
                  <div key={item.product.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      {item.product.productName.substring(0, 24)}...
                      <div style={{ fontSize: '0.65rem', color: '#555' }}>
                        {item.qty} x ৳{item.unitPrice.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      ৳{(item.qty * item.unitPrice).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <div>Subtotal: ৳{receiptData.subtotal.toFixed(2)}</div>
                {receiptData.discount > 0 && (
                  <div style={{ fontWeight: 'bold' }}>
                    Discount: -৳{receiptData.discount.toFixed(2)}
                  </div>
                )}
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Total Paid: ৳{receiptData.total.toFixed(2)}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                Thank You for Shopping!<br />
                Power by BrandCreator OS
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => window.print()}
                className="btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Printer size={16} /> Print Invoice
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
