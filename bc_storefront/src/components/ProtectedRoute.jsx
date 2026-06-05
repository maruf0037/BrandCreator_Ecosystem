// src/components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Build x-user-* headers from sessionStorage for devAuthSimulator fallback
    const extraHeaders = {};
    try {
      const cached = sessionStorage.getItem('bc_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u.email) extraHeaders['x-user-email'] = u.email;
        if (u.role)  extraHeaders['x-user-role']  = u.role;
      }
    } catch (_) {}

    // Audit active session on the Express API server
    fetch(`${backendUrl}/auth/current-user`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...extraHeaders
      },
      // Essential to allow express-session cookies to be shared
      credentials: 'include'
    })
      .then((res) => {
        if (res.status === 401) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);
          setUser(data.user);
          // Cache user info so api.js can send x-user-* headers as fallback
          try { sessionStorage.setItem('bc_user', JSON.stringify(data.user)); } catch (_) {}
        } else {
          setAuthenticated(false);
          try { sessionStorage.removeItem('bc_user'); } catch (_) {}
        }
        setLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setLoading(false);
      });
  }, [backendUrl]);

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
        <Loader2 className="animate-spin" size={48} style={{ color: 'hsl(var(--primary))' }} />
        <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: '500', fontSize: '0.9rem' }}>
          Decrypting session credentials...
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role || 'Customer';
  const currentPath = window.location.pathname;

  // 1. Supplier onboarding gate
  if (role === 'Supplier' && user?.supplierStatus !== 'APPROVED') {
    if (currentPath !== '/supplier-onboarding') {
      return <Navigate to="/supplier-onboarding" replace />;
    }
  }

  // 2. Customer profile completion gate
  if (role === 'Customer' && !user?.customerProfileComplete) {
    if (currentPath !== '/profile-completion' && currentPath !== '/supplier-onboarding') {
      return <Navigate to="/profile-completion" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If the user's role is not cleared, redirect to their default home
    if (role === 'SuperAdmin' || role === 'Admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'Supplier') {
      return <Navigate to="/supplier" replace />;
    } else {
      return <Navigate to="/shop" replace />;
    }
  }

  // Pass active user context dynamically into children components
  return React.cloneElement(children, { currentUser: user });
}
