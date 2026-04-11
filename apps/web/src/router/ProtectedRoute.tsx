import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-svh items-center justify-center">Loading…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
