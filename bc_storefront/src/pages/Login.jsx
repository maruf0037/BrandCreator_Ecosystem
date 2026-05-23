// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Database, CloudLightning, RefreshCw } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleGoogleLogin = () => {
    // Direct link to Express server authorization route
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleSimulatedLogin = async (email, role) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${backendUrl}/auth/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Simulated login failed');
      }
      
      // Redirect based on role
      if (role === 'SuperAdmin' || role === 'Admin') {
        navigate('/admin');
      } else if (role === 'Supplier') {
        navigate('/supplier');
      } else {
        navigate('/shop');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow filters */}
      <div className="ambient-glow glow-primary" />
      <div className="ambient-glow glow-secondary" />

      <div className="glass-card" style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: '1',
      }}>
        {/* Animated Brand Badge */}
        <div style={{
          display: 'inline-flex',
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '99px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '28px',
          fontSize: '0.875rem',
          color: 'hsl(var(--primary))',
        }}>
          <Sparkles size={14} />
          Ecosystem Auth Gateway
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
          BrandCreator
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '32px', fontSize: '1rem', lineHeight: '1.6' }}>
          Sign in to access your customized role-based dashboard, inventory ledger, and AI production tools.
        </p>

        {/* OAuth Authentication Button */}
        <button 
          onClick={handleGoogleLogin} 
          className="btn-primary" 
          style={{ width: '100%', padding: '16px', borderRadius: '14px', marginBottom: '32px' }}
        >
          <svg style={{ width: '20px', height: '20px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.12 1 1.16 5.94 1.16 12s4.96 11 11.08 11c6.39 0 10.63-4.484 10.63-10.82 0-.727-.08-1.284-.175-1.895H12.24z"/>
          </svg>
          Continue with Google
        </button>

        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#ef4444',
            fontSize: '0.875rem',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'hsl(var(--primary))',
            fontSize: '0.9rem',
            marginBottom: '32px'
          }}>
            <RefreshCw className="animate-spin" size={16} />
            Simulating session authorization...
          </div>
        ) : (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '20px 0',
              color: 'hsl(var(--text-muted))',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              <span style={{ height: '1px', flex: '1', background: 'rgba(255,255,255,0.08)', marginRight: '12px' }} />
              Bypass in Dev Mode
              <span style={{ height: '1px', flex: '1', background: 'rgba(255,255,255,0.08)', marginLeft: '12px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => handleSimulatedLogin('md.marufalrashid@gmail.com', 'SuperAdmin')}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}
              >
                SuperAdmin
              </button>
              <button
                onClick={() => handleSimulatedLogin('supplier@example.com', 'Supplier')}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}
              >
                Supplier
              </button>
              <button
                onClick={() => handleSimulatedLogin('customer@example.com', 'Customer')}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '12px', borderRadius: '10px', gridColumn: 'span 2', cursor: 'pointer' }}
              >
                Customer Storefront Shop
              </button>
            </div>
          </div>
        )}

        {/* Secure Ledger highlights */}
        <div style={{
          textAlign: 'left',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '28px',
        }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', marginBottom: '16px' }}>
            Ecosystem Core Features
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ color: 'hsl(var(--primary))', padding: '6px', background: 'hsl(var(--primary-glow))', borderRadius: '8px' }}>
                <Shield size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.925rem', fontWeight: '600' }}>Role-Based Access</h4>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Custom profiles for SuperAdmins, Suppliers, and Customers.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ color: 'hsl(var(--secondary))', padding: '6px', background: 'hsl(var(--secondary-glow))', borderRadius: '8px' }}>
                <Database size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.925rem', fontWeight: '600' }}>Double-Ledger Inventory</h4>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Atomic physical (Master) and virtual (Sell) synchronization.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ color: 'hsl(var(--accent))', padding: '6px', background: 'rgba(234, 67, 53, 0.1)', borderRadius: '8px' }}>
                <CloudLightning size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.925rem', fontWeight: '600' }}>BYOK Personalization</h4>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Integrate your own Gemini API key for high-octane AI tools.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
