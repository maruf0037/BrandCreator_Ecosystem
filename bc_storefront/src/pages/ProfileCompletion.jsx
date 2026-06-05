// src/pages/ProfileCompletion.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, Sparkles, ArrowRight, RefreshCw, LogOut } from 'lucide-react';

export default function ProfileCompletion({ currentUser }) {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [formData, setFormData] = useState({
    phoneNumber: '',
    deliveryAddress: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/onboarding/customer/status`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch profile status');
      const data = await res.json();
      if (data.complete) {
        setFormData({
          phoneNumber: data.profile.PhoneNumber || '',
          deliveryAddress: data.profile.DeliveryAddress || ''
        });
        
        // If profile is already complete, redirect to shop
        navigate('/shop');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/onboarding/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      // Force reload user session info in sessionStorage so ProtectedRoute detects completeness
      const userRes = await fetch(`${backendUrl}/auth/current-user`, { credentials: 'include' });
      const userData = await userRes.json();
      if (userData.authenticated) {
        try { sessionStorage.setItem('bc_user', JSON.stringify(userData.user)); } catch (_) {}
      }

      navigate('/shop');
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
          Loading profile settings...
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
        maxWidth: '500px',
        width: '100%',
        position: 'relative',
        zIndex: '1',
        padding: '40px'
      }}>
        
        {/* Profile Completion Badge */}
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
          Complete Customer Account
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
          Delivery Coordinates
        </h2>
        <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '28px', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Please complete your contact details and default delivery address. This ensures lightning-fast delivery and lets us calculate accurate shipping options during checkout.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: '500' }}>
              Phone Number
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
              Shipping / Delivery Address
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.4)' }} />
              <textarea
                required
                rows={3}
                placeholder="e.g. House 45, Road 12, Banani, Dhaka"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  resize: 'none',
                  fontFamily: 'inherit'
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
                <RefreshCw className="animate-spin" size={16} /> Saving Details...
              </>
            ) : (
              <>
                Save & Continue to Shop <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
