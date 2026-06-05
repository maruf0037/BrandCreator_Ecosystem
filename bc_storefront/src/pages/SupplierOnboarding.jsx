// src/pages/SupplierOnboarding.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, MapPin, Phone, CreditCard, FileText, 
  Sparkles, Clock, XCircle, CheckCircle2, ArrowRight, RefreshCw, LogOut 
} from 'lucide-react';

export default function SupplierOnboarding({ currentUser }) {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    shopName: '',
    shopLocation: '',
    phoneNumber: '',
    nid: '',
    tradeLicense: ''
  });
  
  const [status, setStatus] = useState('NOT_SUBMITTED');
  const [rejectReason, setRejectReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch latest onboarding status from API
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/onboarding/supplier/status`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      if (data.submitted) {
        setStatus(data.profile.Status);
        setRejectReason(data.profile.RejectReason);
        setFormData({
          shopName: data.profile.ShopName || '',
          shopLocation: data.profile.ShopLocation || '',
          phoneNumber: data.profile.PhoneNumber || '',
          nid: data.profile.NID || '',
          tradeLicense: data.profile.TradeLicense || ''
        });
      } else {
        setStatus('NOT_SUBMITTED');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load onboarding status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle redirect if approved
  useEffect(() => {
    if (status === 'APPROVED') {
      // Force reload user session so role switches to Supplier
      fetch(`${backendUrl}/auth/current-user`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            try { sessionStorage.setItem('bc_user', JSON.stringify(data.user)); } catch (_) {}
            navigate('/supplier');
          }
        });
    }
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/onboarding/supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      // Refresh status to pending screen
      await fetchStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    window.location.href = `${backendUrl}/auth/logout`;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--bg-dark))',
        gap: '16px'
      }}>
        <RefreshCw className="animate-spin" size={48} style={{ color: 'hsl(var(--primary))' }} />
        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>
          Loading your onboarding profile...
        </span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="ambient-glow glow-primary" />
      <div className="ambient-glow glow-secondary" />

      {/* Logout button top right */}
      <button 
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          color: 'hsl(var(--text-secondary))',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <LogOut size={14} />
        Sign Out
      </button>

      <div className="glass-card" style={{
        maxWidth: '540px',
        width: '100%',
        position: 'relative',
        zIndex: '1',
        padding: '40px'
      }}>
        
        {/* Onboarding Badge */}
        <div style={{
          display: 'inline-flex',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '99px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '20px',
          fontSize: '0.8rem',
          color: 'hsl(var(--primary))',
        }}>
          <Sparkles size={12} />
          Supplier Partnership Portal
        </div>

        {status === 'PENDING_APPROVAL' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              display: 'inline-flex',
              padding: '20px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '50%',
              border: '2px dashed hsl(var(--warning))',
              color: 'hsl(var(--warning))',
              marginBottom: '24px',
              animation: 'pulse 2s infinite'
            }}>
              <Clock size={48} />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: '#f59e0b' }}>
              Application Under Review
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '28px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Thanks for submitting your details! Our administration team is currently verifying your Trade License and shop credentials. You will get access to the Supplier Dashboard as soon as your application is approved.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
              fontSize: '0.85rem',
              color: 'hsl(var(--text-muted))'
            }}>
              <div style={{ marginBottom: '8px' }}><strong>Shop Name:</strong> {formData.shopName}</div>
              <div style={{ marginBottom: '8px' }}><strong>Location:</strong> {formData.shopLocation}</div>
              <div style={{ marginBottom: '8px' }}><strong>Phone:</strong> {formData.phoneNumber}</div>
              <div><strong>Status:</strong> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Pending Approval</span></div>
            </div>
            <button 
              onClick={fetchStatus}
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={16} /> Check Status Update
            </button>
          </div>
        )}

        {status === 'APPROVED' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              display: 'inline-flex',
              padding: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '50%',
              border: '2px solid hsl(var(--primary))',
              color: 'hsl(var(--primary))',
              marginBottom: '24px'
            }}>
              <CheckCircle2 size={48} />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: 'hsl(var(--primary))' }}>
              Application Approved!
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '28px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Congratulations! Your shop has been verified and registered inside the BrandCreator Ecosystem.
            </p>
            <button 
              onClick={() => navigate('/supplier')}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Enter Supplier Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}

        {(status === 'NOT_SUBMITTED' || status === 'REJECTED') && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
              {status === 'REJECTED' ? 'Application Rejected' : 'Supplier Details'}
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '24px', fontSize: '0.9rem' }}>
              {status === 'REJECTED' 
                ? 'Your previous application was rejected. Please review the comments, update details, and resubmit.' 
                : 'Submit your shop credentials and legal identification to list physical catalogs and unlock POS systems.'
              }
            </p>

            {status === 'REJECTED' && rejectReason && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}>
                <XCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Rejection Reason:</strong>
                  {rejectReason}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
                  Shop/Brand Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Store size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jamdani Kutir"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
                  Shop Address / Location
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Demra, Dhaka"
                    value={formData.shopLocation}
                    onChange={(e) => setFormData({ ...formData, shopLocation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
                  Contact Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 01712345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
                  National ID (NID) Number
                </label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19958292839281"
                    value={formData.nid}
                    onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
                  Trade License Number
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. TR-DEMRA-9283918"
                    value={formData.tradeLicense}
                    onChange={(e) => setFormData({ ...formData, tradeLicense: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 38px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  fontWeight: '600'
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Submitting Application...
                  </>
                ) : (
                  <>
                    Submit For Verification <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
