import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireLibrarian = false, requireAdmin = false }) => {
  const { isAuthenticated, loading, isLibrarian, isAdmin } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  if (requireLibrarian && !isLibrarian()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
