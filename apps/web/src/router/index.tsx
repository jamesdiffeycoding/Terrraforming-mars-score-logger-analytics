import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { GroupsPage } from '@/pages/groups/GroupsPage';
import { CreateGroupPage } from '@/pages/groups/CreateGroupPage';
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <Navigate to="/groups" replace /> },
      { path: '/dashboard', element: <Navigate to="/groups" replace /> },
      { path: '/groups', element: <GroupsPage /> },
      { path: '/groups/new', element: <CreateGroupPage /> },
      { path: '/groups/:id', element: <GroupDetailPage /> },
    ],
  },
]);
