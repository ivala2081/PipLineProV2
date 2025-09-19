import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requirePermission,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Check if user is active
  if (user && !user.is_active) {
    return (
      <Navigate
        to='/login'
        state={{ from: location, message: 'Account is deactivated' }}
        replace
      />
    );
  }

  // Check if account is locked
  if (user && user.account_locked_until) {
    const lockoutTime = new Date(user.account_locked_until);
    if (lockoutTime > new Date()) {
      return (
        <Navigate
          to='/login'
          state={{ from: location, message: 'Account is temporarily locked' }}
          replace
        />
      );
    }
  }

  // Check admin requirement
  if (requireAdmin && user && user.admin_level === 0) {
    return (
      <Navigate
        to='/dashboard'
        state={{ message: 'Access denied. Admin privileges required.' }}
        replace
      />
    );
  }

  // Check specific permission
  if (requirePermission && user) {
    const hasPermission = user.permissions[requirePermission];
    if (!hasPermission) {
      return (
        <Navigate
          to='/dashboard'
          state={{ message: 'Access denied. Insufficient permissions.' }}
          replace
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
