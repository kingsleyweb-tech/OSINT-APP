import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  user: unknown;
  children: React.ReactElement;
}

/** Signed-out visitors are sent to the homepage, which tells them to sign in or continue as a guest. */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/" replace state={{ authRequired: true, from: `${location.pathname}${location.search}` }} />;
  }
  return children;
};
