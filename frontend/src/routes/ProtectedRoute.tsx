import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  user: any;
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};
