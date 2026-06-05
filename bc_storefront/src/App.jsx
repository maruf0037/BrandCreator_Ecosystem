// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import Shop from './pages/Shop';
import PosTerminal from './pages/PosTerminal';
import SupplierOnboarding from './pages/SupplierOnboarding';
import ProfileCompletion from './pages/ProfileCompletion';
import ProtectedRoute from './components/ProtectedRoute';

// Capture auth params injected by the OAuth redirect (auth_email, auth_role)
function useOAuthParamCache() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('auth_email');
    const role  = params.get('auth_role');
    if (email && role) {
      try {
        sessionStorage.setItem('bc_user', JSON.stringify({ email, role }));
      } catch (_) {}
      // Clean up params from URL without reload
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);
}

export default function App() {
  useOAuthParamCache();
  return (
    <BrowserRouter>
      <Routes>
        {/* Secure Login Entry */}
        <Route path="/login" element={<Login />} />

        {/* Onboarding & Profile Completion gates */}
        <Route 
          path="/supplier-onboarding" 
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Supplier', 'Admin', 'SuperAdmin']}>
              <SupplierOnboarding />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile-completion" 
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Supplier', 'Admin', 'SuperAdmin']}>
              <ProfileCompletion />
            </ProtectedRoute>
          } 
        />

        {/* Role-Protected Admin controls */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Supplier']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Role-Protected Supplier workspace */}
        <Route 
          path="/supplier" 
          element={
            <ProtectedRoute allowedRoles={['Supplier']}>
              <SupplierDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Customer storefront shop catalog */}
        <Route 
          path="/shop" 
          element={
            <ProtectedRoute allowedRoles={['Customer', 'Supplier', 'Admin', 'SuperAdmin']}>
              <Shop />
            </ProtectedRoute>
          } 
        />

        {/* High-Performance Cashier POS Terminal */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Supplier']}>
              <PosTerminal />
            </ProtectedRoute>
          } 
        />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
