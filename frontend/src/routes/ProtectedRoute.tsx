import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { rememberReturnTo } from './returnTo';

interface ProtectedRouteProps {
  user: unknown;
  children: React.ReactElement;
}

/** Signed-out visitors are sent to the homepage, which asks them to sign in or continue with Google. */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    // Also remembered outside the router, so it survives Google's full-page sign-in redirect.
    rememberReturnTo(from);
    return <Navigate to="/" replace state={{ authRequired: true, from }} />;
  }
  return children;
};
