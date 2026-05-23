// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import Shop from './pages/Shop';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Secure Login Entry */}
        <Route path="/login" element={<Login />} />

        {/* Role-Protected Admin controls */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
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

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
