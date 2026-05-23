// src/pages/Shop.jsx
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Heart, LogOut, RefreshCw, 
  ShoppingCart, Trash2, Check, X, AlertCircle, ShoppingCartIcon,
  Clock, ShieldCheck, Tag
} from 'lucide-react';
import { api } from '../services/api';

const shopStyles = `
  @keyframes pulse {
    0% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
    100% { opacity: 0.6; transform: scale(1); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  .premium-shop-styles { display: none; }
  
  .product-card-premium {
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }
  .product-card-premium:hover {
    transform: translateY(-8px) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45), 0 0 20px hsl(var(--primary) / 0.1) !important;
    border-color: hsl(var(--primary) / 0.25) !important;
  }
  .product-card-premium:hover .product-image {
    transform: scale(1.05) !important;
  }
  
  .skeleton-shimmer {
    background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
  }
  
  .cart-drawer-backdrop {
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
  }
  
  .cart-drawer {
    animation: slideInRight 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  
  .order-success-card {
    animation: scaleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
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

const SkeletonCard = () => (
  <div className="glass-card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden', height: '480px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(15, 22, 36, 0.4)' }}>
    <div className="skeleton-shimmer" style={{ height: '260px', width: '100%' }} />
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-shimmer" style={{ height: '14px', width: '30%', borderRadius: '4px' }} />
        <div className="skeleton-shimmer" style={{ height: '20px', width: '75%', borderRadius: '4px', marginTop: '4px' }} />
        <div className="skeleton-shimmer" style={{ height: '14px', width: '90%', borderRadius: '4px', marginTop: '6px' }} />
        <div className="skeleton-shimmer" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '40%' }}>
          <div className="skeleton-shimmer" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ height: '18px', width: '90%', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-shimmer" style={{ height: '40px', width: '45%', borderRadius: '8px' }} />
      </div>
    </div>
  </div>
);

export default function Shop({ currentUser }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // States
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');

  // Tab View for Customer
  const [viewTab, setViewTab] = useState('shop'); // 'shop' or 'orders'

  const fetchShopData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, ordersRes] = await Promise.all([
        api.get('/api/products').catch(() => ({ items: [] })),
        api.get('/api/orders').catch(() => ({ items: [] }))
      ]);

      // Only display APPROVED products in store catalog (with SELL available stock > 0)
      const approvedProducts = (prodRes.items || []).filter(
        p => p.qcStatus === 'APPROVED' && (p.sellOnHand - p.sellReserved) > 0
      );
      setProducts(approvedProducts);
      setOrders(ordersRes.items || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to sync storefront collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const handleLogout = () => {
    window.location.href = `${backendUrl}/auth/logout`;
  };

  const showToast = (message) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Cart Functions
  const getProductPrice = (product) => {
    if (product.retailPrice) return parseFloat(product.retailPrice);
    if (product.suggestedRetailPrice) return parseFloat(product.suggestedRetailPrice);
    if (product.rpuMrp) return parseFloat(product.rpuMrp);
    return product.basePrice ? parseFloat(product.basePrice) : ((product.productId * 250) + 1200);
  };

  const addToCart = (product) => {
    const availableStock = product.sellOnHand - product.sellReserved;
    if (availableStock <= 0) {
      setError(`Cannot add ${product.productName} to cart: Out of Stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        if (existing.qty >= availableStock) {
          setError(`Cannot add more: Max available stock is ${availableStock}`);
          return prev;
        }
        return prev.map(item => 
          item.productId === product.productId 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      return [...prev, { ...product, qty: 1, price: getProductPrice(product) }];
    });
    showToast(`Added ${product.productName} to Cart!`);
  };

  const updateCartQty = (productId, newQty) => {
    const product = products.find(p => p.productId === productId);
    const availableStock = product ? (product.sellOnHand - product.sellReserved) : 999;

    if (newQty > availableStock) {
      setError(`Cannot set qty to ${newQty}: Only ${availableStock} units available`);
      return;
    }

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, qty: newQty } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  // Checkout / Reserve Order
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customerPhone || customerPhone.trim() === '') {
      setError('Please provide a valid Phone Number for WhatsApp order updates!');
      return;
    }
    setError(null);
    setCheckingOut(true);
    try {
      const orderRef = 'BC-ORD-' + Math.floor(100000 + Math.random() * 900000);
      const itemsPayload = cart.map(item => ({
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.price
      }));

      await api.post('/api/orders', {
        orderRef,
        items: itemsPayload,
        currency: 'BDT',
        customerPhone: customerPhone.trim(),
        saleChannel: 'ONLINE'
      });

      setCustomerPhone('');

      // Populate Checkout success details
      setLastPlacedOrder({
        orderRef,
        totalAmount: getCartTotal(),
        itemsCount: cart.reduce((sum, i) => sum + i.qty, 0),
        items: [...cart]
      });

      clearCart();
      setShowCartModal(false);
      fetchShopData();
    } catch (err) {
      setError(err.message || 'Checkout failed. Please inspect your item quantities.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Confirm Order Payment Simulation
  const handleConfirmOrder = async (orderRef, totalAmount) => {
    try {
      await api.post(`/api/orders/${orderRef}/confirm`, {
        provider: 'BKASH',
        eventType: 'CAPTURE',
        eventRef: 'DEV-TEST-TRX-' + Math.floor(Math.random() * 100000),
        payload: { amount: totalAmount }
      }, {
        'Idempotency-Key': 'idem-dev-' + orderRef + '-' + Math.floor(Math.random() * 10000)
      });
      showToast(`Order ${orderRef} confirmed successfully! Stock committed to virtual shop.`);
      fetchShopData();
    } catch (err) {
      setError(err.message || 'Failed to confirm order');
    }
  };

  // Cancel Order
  const handleCancelOrder = async (orderRef) => {
    try {
      await api.post(`/api/orders/${orderRef}/cancel`);
      showToast(`Order ${orderRef} successfully cancelled. Stock released!`);
      fetchShopData();
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    }
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: shopStyles }} />

      {/* Toast Notification */}
      {actionSuccess && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', background: 'hsl(var(--primary))', color: 'hsl(var(--bg-dark))',
          padding: '16px 24px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 99999, display: 'flex', alignItems: 'center', gap: '10px', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ease'
        }}>
          <Check size={18} strokeWidth={2.5} />
          {actionSuccess}
        </div>
      )}

      {/* Navigation Header */}
      <header className="nav-header" style={{ position: 'sticky', top: 0, zIndex: 99, background: 'rgba(9, 13, 20, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="logo-text" style={{ fontSize: '1.25rem' }}>
          <ShoppingBag size={24} style={{ color: 'hsl(var(--primary))' }} />
          BrandCreator Shop
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          
          <button 
            onClick={() => setViewTab('shop')} 
            className="btn-secondary" 
            style={{ 
              padding: '8px 16px', fontSize: '0.85rem', 
              color: viewTab === 'shop' ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
              borderColor: viewTab === 'shop' ? 'hsl(var(--primary) / 0.3)' : 'rgba(255,255,255,0.06)',
              background: viewTab === 'shop' ? 'rgba(255,255,255,0.02)' : 'none'
            }}
          >
            Catalog
          </button>
          
          <button 
            onClick={() => setViewTab('orders')} 
            className="btn-secondary" 
            style={{ 
              padding: '8px 16px', fontSize: '0.85rem', 
              color: viewTab === 'orders' ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
              borderColor: viewTab === 'orders' ? 'hsl(var(--primary) / 0.3)' : 'rgba(255,255,255,0.06)',
              background: viewTab === 'orders' ? 'rgba(255,255,255,0.02)' : 'none'
            }}
          >
            My Orders ({orders.length})
          </button>

          <button 
            onClick={() => setShowCartModal(true)} 
            className="btn-primary" 
            style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', gap: '8px', position: 'relative', overflow: 'visible' }}
          >
            <ShoppingCart size={16} />
            Cart
            {cart.reduce((sum, i) => sum + i.qty, 0) > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: '#ea4335', color: '#fff', fontSize: '0.7rem', fontWeight: '800',
                minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: '2px solid hsl(var(--bg-dark))',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}>
                {cart.reduce((sum, i) => sum + i.qty, 0)}
              </span>
            )}
          </button>

          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <div className="user-badge" style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 12px 4px 6px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '30px' }}>
            <img src={currentUser?.avatar} alt="Avatar" className="user-avatar" style={{ marginRight: '8px', border: '1px solid hsl(var(--primary) / 0.3)' }} />
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

      {/* Main Content Area */}
      <main className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
        
        {/* Error Banner */}
        {error && (
          <div className="glass-card" style={{
            padding: '16px 24px', borderRadius: '14px', border: '1px solid rgba(234, 67, 53, 0.25)',
            background: 'rgba(234, 67, 53, 0.06)', color: '#ea4335', marginBottom: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span><strong>Storefront Notification:</strong> {error}</span>
            </div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ea4335', cursor: 'pointer', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* LOADING STATE - Skeleton Grid */}
        {loading && viewTab === 'shop' && (
          <div>
            <div style={{ height: '380px', borderRadius: '24px', marginBottom: '48px', background: 'rgba(15,22,36,0.3)', border: '1px solid rgba(255,255,255,0.03)' }} className="skeleton-shimmer" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div className="skeleton-shimmer" style={{ height: '28px', width: '220px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ height: '36px', width: '130px', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        )}

        {loading && viewTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <div className="skeleton-shimmer" style={{ height: '60px', width: '100%', borderRadius: '12px' }} />
            <div className="skeleton-shimmer" style={{ height: '60px', width: '100%', borderRadius: '12px' }} />
            <div className="skeleton-shimmer" style={{ height: '60px', width: '100%', borderRadius: '12px' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* VIEW TAB: CATALOG SHOP */}
            {viewTab === 'shop' && (
              <div>
                {/* Banner */}
                <div className="glass-card" style={{
                  padding: '48px', borderRadius: '24px', marginBottom: '48px',
                  background: 'linear-gradient(135deg, hsl(var(--primary-glow)), hsl(var(--secondary-glow)))',
                  border: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative', overflow: 'hidden',
                  animation: 'fadeInUp 0.4s ease'
                }}>
                  <div className="ambient-glow glow-primary" style={{ right: '-5%', top: '-25%', opacity: 0.25 }} />
                  <div style={{ maxWidth: '640px', position: 'relative', zIndex: '1' }}>
                    <span style={{ 
                      background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', 
                      padding: '6px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '800',
                      border: '1px solid hsl(var(--primary) / 0.2)', letterSpacing: '0.04em'
                    }}>
                      ✨ SUMMER ARRIVALS
                    </span>
                    <h1 style={{ fontSize: '2.8rem', marginTop: '16px', marginBottom: '16px', lineHeight: '1.25', fontWeight: '800', letterSpacing: '-0.03em' }}>
                      Elevate Your Identity With Curated Designs
                    </h1>
                    <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.975rem', lineHeight: '1.6', marginBottom: '24px' }}>
                      Seamlessly audit, trade, and source premium designer items under a single double-ledger synchronized retail catalog. Authenticated on the chain, tracked physically.
                    </p>
                  </div>
                </div>

                {/* Catalog List */}
                <div style={{ animation: 'fadeInUp 0.5s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Trending Collections</h2>
                      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>Approved digital collectibles with active retail stock</p>
                    </div>
                    <button onClick={fetchShopData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}>
                      <RefreshCw size={12} /> Sync Inventory
                    </button>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '30px'
                  }}>
                    {products.length === 0 ? (
                      <div className="glass-card" style={{
                        padding: '60px 40px', textAlign: 'center', gridColumn: '1 / -1',
                        background: 'rgba(15, 22, 36, 0.4)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
                        animation: 'fadeInUp 0.5s ease'
                      }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(260, 90, 65, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--secondary))', marginBottom: '8px' }}>
                          <ShoppingBag size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Storefront Is Syncing</h3>
                        <p style={{ color: 'hsl(var(--text-secondary))', maxWidth: '460px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                          No virtual stock has been transferred to the virtual storefront ledger yet. Check back shortly as our physical-to-virtual ledger settlement finishes!
                        </p>
                      </div>
                    ) : products.map((product) => {
                        const availableStock = product.sellOnHand - product.sellReserved;
                        const hasStock = availableStock > 0;
                        const isLowStock = availableStock <= 5;
                        const itemPrice = getProductPrice(product);
                        const displayName = product.enrichment?.title || product.productName;
                        const displayDesc = product.enrichment?.description || product.supplierNotes || 'Premium weave hand-selected for our ecosystem.';

                        return (
                          <div key={product.productId} className="glass-card product-card-premium" style={{
                            padding: '0', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            border: '1px solid rgba(255, 255, 255, 0.04)', background: 'rgba(12, 17, 26, 0.5)', opacity: hasStock ? 1 : 0.65
                          }}>
                            {/* Product Image */}
                            <div style={{ position: 'relative', height: '250px', overflow: 'hidden' }}>
                              <img
                                src={product.imageUrl || `https://images.unsplash.com/photo-${1580000000000 + product.productId}?auto=format&fit=crop&q=80&w=600`}
                                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600'}
                                alt={displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                                className="product-image"
                              />
                              
                              {/* Stock badge */}
                              <div style={{
                                position: 'absolute', top: '16px', left: '16px', 
                                background: isLowStock ? 'rgba(251, 188, 5, 0.95)' : 'rgba(52, 168, 83, 0.95)',
                                color: isLowStock ? '#000' : '#fff',
                                padding: '6px 12px', borderRadius: '30px',
                                fontSize: '0.72rem', fontWeight: '800', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                backdropFilter: 'blur(4px)'
                              }}>
                                <span style={{ 
                                  width: '6px', height: '6px', borderRadius: '50%', 
                                  background: isLowStock ? '#000' : '#fff', display: 'inline-block', 
                                  animation: 'pulse 1.8s infinite' 
                                }} />
                                {isLowStock ? `Low Stock: ${availableStock} left` : `In Stock`}
                              </div>

                              {/* Heart overlay decoration */}
                              <button 
                                className="fav-button"
                                style={{
                                  position: 'absolute', top: '16px', right: '16px',
                                  background: 'rgba(9, 13, 20, 0.65)', border: '1px solid rgba(255,255,255,0.08)',
                                  width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.2s ease',
                                  backdropFilter: 'blur(6px)'
                                }}
                              >
                                <Heart size={15} />
                              </button>
                            </div>

                            {/* Info body */}
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: '1', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontFamily: 'monospace', fontWeight: '600', letterSpacing: '0.02em' }}>
                                    {product.sku}
                                  </span>
                                  {product.sellReserved > 0 && (
                                    <span style={{ fontSize: '0.7rem', color: '#fbbc05', background: 'rgba(251,188,5,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                                      {product.sellReserved} reserved
                                    </span>
                                  )}
                                </div>
                                
                                <h3 style={{ fontSize: '1.15rem', marginTop: '6px', marginBottom: '8px', fontWeight: '600', color: '#fff', lineHeight: '1.3' }}>
                                  {displayName}
                                </h3>
                                
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.45', marginBottom: '16px' }}>
                                  {displayDesc.length > 110 ? displayDesc.slice(0, 110) + '...' : displayDesc}
                                </p>
                                
                                {product.enrichment?.tags && product.enrichment.tags.length > 0 ? (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {product.enrichment.tags.slice(0, 3).map((tag, idx) => (
                                      <span key={idx} style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', padding: '2px 8px', borderRadius: '30px', border: '1px solid hsl(var(--primary) / 0.15)' }}>
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Tag size={10} /> eco-verified
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <div>
                                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '2px' }}>Price</span>
                                  <strong style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '700' }}>৳{itemPrice.toLocaleString()}</strong>
                                </div>
                                <button 
                                  onClick={() => addToCart(product)}
                                  disabled={!hasStock}
                                  className="btn-primary" 
                                  style={{ 
                                    padding: '10px 18px', fontSize: '0.8rem', borderRadius: '10px', 
                                    opacity: hasStock ? 1 : 0.5, cursor: hasStock ? 'pointer' : 'not-allowed',
                                    height: '38px', minWidth: '105px'
                                  }}
                                >
                                  {hasStock ? 'Add to Cart' : 'Sold Out'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              </div>
            )}

            {/* VIEW TAB: ORDERS HISTORY */}
            {viewTab === 'orders' && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>My Placed Reservations</h2>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', marginTop: '2px' }}>
                    Review your placed stock reservations. Pending reservations hold virtual inventory in real-time until finalized by BKASH payment.
                  </p>
                </div>

                {orders.length === 0 ? (
                  <div className="glass-card" style={{
                    padding: '80px 40px', textAlign: 'center',
                    background: 'rgba(15, 22, 36, 0.4)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
                    animation: 'fadeInUp 0.5s ease', marginTop: '20px'
                  }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(160, 84, 39, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))', marginBottom: '8px' }}>
                      <ShoppingCartIcon size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>No Reservations Registered</h3>
                    <p style={{ color: 'hsl(var(--text-secondary))', maxWidth: '460px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      You haven't placed any double-ledger stock reservations yet. Browse our catalog, populate your cart, and experience our instant atomic checkout!
                    </p>
                    <button onClick={() => setViewTab('shop')} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', marginTop: '8px' }}>
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Order ID</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reference Key</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Price</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reserved Date</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settlement</th>
                            <th style={{ padding: '16px 20px', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.orderId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s ease' }} className="custom-table-row">
                              <td style={{ padding: '18px 20px', fontWeight: '700', fontSize: '0.9rem' }}>#{o.orderId}</td>
                              <td style={{ padding: '18px 20px' }}>
                                <span style={{ fontFamily: 'monospace', color: 'hsl(var(--primary))', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.03em', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  {o.orderRef}
                                </span>
                              </td>
                              <td style={{ padding: '18px 20px', fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>
                                ৳{o.totalAmount.toLocaleString()}
                              </td>
                              <td style={{ padding: '18px 20px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Clock size={12} />
                                  {new Date(o.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td style={{ padding: '18px 20px' }}>
                                <span style={{
                                  background: o.status === 'CONFIRMED' ? 'rgba(52,168,83,0.12)' : o.status === 'CANCELLED' ? 'rgba(234,67,53,0.12)' : 'rgba(251,188,5,0.12)',
                                  color: o.status === 'CONFIRMED' ? '#34a853' : o.status === 'CANCELLED' ? '#ea4335' : '#fbbc05',
                                  padding: '4px 10px', borderRadius: '30px', fontSize: '0.72rem', fontWeight: '800',
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  border: o.status === 'CONFIRMED' ? '1px solid rgba(52,168,83,0.2)' : o.status === 'CANCELLED' ? '1px solid rgba(234,67,53,0.2)' : '1px solid rgba(251,188,5,0.2)'
                                }}>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: o.status === 'CONFIRMED' ? '#34a853' : o.status === 'CANCELLED' ? '#ea4335' : '#fbbc05' }} />
                                  {o.status}
                                </span>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  {o.status === 'PENDING' ? (
                                    <>
                                      <button 
                                        onClick={() => handleCancelOrder(o.orderRef)}
                                        className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#ea4335', borderColor: 'rgba(234,67,53,0.25)', borderRadius: '6px' }}
                                      >
                                        Cancel
                                      </button>
                                      {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
                                        <button 
                                          onClick={() => handleConfirmOrder(o.orderRef, o.totalAmount)}
                                          className="btn-primary"
                                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                          <ShieldCheck size={12} /> Confirm (Dev)
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No action available</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </main>

      {/* Cart Modal Slide-over Drawer */}
      {showCartModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5, 7, 12, 0.75)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end',
          transition: 'all 0.3s ease'
        }} className="cart-drawer-backdrop" onClick={() => setShowCartModal(false)}>
          
          <div className="glass-card cart-drawer custom-scrollbar" style={{
            width: '100%', maxWidth: '460px', height: '100%', borderRadius: 0, 
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px 32px',
            background: 'rgba(10, 16, 28, 0.95)', borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                  <ShoppingCart style={{ color: 'hsl(var(--primary))' }} />
                  Shopping Cart
                </h3>
                <button 
                  onClick={() => setShowCartModal(false)} 
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  <X size={16} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'hsl(var(--text-muted))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
                    <ShoppingCart size={28} />
                  </div>
                  <div>
                    <h4 style={{ color: 'hsl(var(--text-primary))', fontWeight: '600', fontSize: '1rem', marginBottom: '4px' }}>Your Cart is Empty</h4>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', maxWidth: '240px', margin: '0 auto' }}>Add trending approved items to reserve stock and checkout.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                  {cart.map(item => (
                    <div key={item.productId} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)',
                      padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#fff' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-secondary))', marginTop: '2px' }}>BDT {item.price.toLocaleString()}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <button 
                            onClick={() => updateCartQty(item.productId, item.qty - 1)}
                            style={{ width: '26px', height: '26px', border: 'none', background: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                          >
                            -
                          </button>
                          <span style={{ width: '22px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.qty}</span>
                          <button 
                            onClick={() => updateCartQty(item.productId, item.qty + 1)}
                            style={{ width: '26px', height: '26px', border: 'none', background: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                          >
                            +
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => removeFromCart(item.productId)}
                          style={{ background: 'none', border: 'none', color: 'rgba(234, 67, 53, 0.7)', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Estimated Subtotal:</span>
                  <strong style={{ fontSize: '1.35rem', color: '#fff', fontWeight: '700' }}>৳{getCartTotal().toLocaleString()}</strong>
                </div>

                {/* WhatsApp Phone Number Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '600' }}>
                    WhatsApp Phone Number <span style={{ color: 'hsl(var(--primary))' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +8801712345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={clearCart} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>
                    Clear
                  </button>
                  <button 
                    onClick={handleCheckout} 
                    disabled={checkingOut}
                    className="btn-primary" 
                    style={{ flex: 2, padding: '12px', borderRadius: '10px', display: 'flex', gap: '8px', opacity: checkingOut ? 0.75 : 1 }}
                  >
                    {checkingOut ? (
                      <span className="spin-anim" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%' }} />
                    ) : null}
                    {checkingOut ? 'Reserving...' : 'Reserve & Checkout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Success Modal Dialog Card */}
      {lastPlacedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5, 7, 12, 0.88)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', transition: 'all 0.3s ease'
        }} className="cart-drawer-backdrop">
          <div className="glass-card order-success-card" style={{
            maxWidth: '500px', width: '100%', padding: '40px', borderRadius: '24px',
            border: '1px solid hsl(var(--primary) / 0.3)', background: 'rgba(10, 16, 28, 0.9)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 40px hsl(var(--primary) / 0.1)',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
          }}>
            {/* Animated Checkmark Circle */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(52, 168, 83, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853',
              border: '2px solid rgba(52, 168, 83, 0.25)', boxShadow: '0 0 20px rgba(52, 168, 83, 0.08)',
              marginBottom: '4px'
            }}>
              <Check size={40} strokeWidth={3} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.7rem', marginBottom: '8px', color: '#fff', fontWeight: '800', letterSpacing: '-0.02em' }}>Order Placed Successfully!</h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Your real-time double-ledger stock reservation has been successfully allocated.
              </p>
            </div>

            {/* Details Box */}
            <div style={{
              width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Order Reference:</span>
                <strong style={{ fontFamily: 'monospace', color: 'hsl(var(--primary))', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                  {lastPlacedOrder.orderRef}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Reserved Items:</span>
                <strong style={{ color: '#fff' }}>{lastPlacedOrder.itemsCount} Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '2px' }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Total Paid (BDT):</span>
                <strong style={{ color: '#fff', fontSize: '1.1rem' }}>৳{lastPlacedOrder.totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ background: 'rgba(251, 188, 5, 0.06)', border: '1px solid rgba(251, 188, 5, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#fbbc05', display: 'flex', gap: '8px', alignItems: 'center', textAlign: 'left', lineHeight: '1.4' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>Stock is temporarily reserved. Perform payment confirmation next to commit virtual ledger transfer permanently.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button onClick={() => { setLastPlacedOrder(null); setViewTab('shop'); }} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>
                Continue Shopping
              </button>
              <button onClick={() => { setLastPlacedOrder(null); setViewTab('orders'); }} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>
                Track Reservations
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
