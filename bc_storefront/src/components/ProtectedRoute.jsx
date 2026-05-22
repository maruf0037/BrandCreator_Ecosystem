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
    // Audit active session on the Express API server
    fetch(`${backendUrl}/auth/current-user`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
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
        } else {
          setAuthenticated(false);
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

  // Auditing allowed role clearance
  const role = user?.role || 'Customer';
  
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
