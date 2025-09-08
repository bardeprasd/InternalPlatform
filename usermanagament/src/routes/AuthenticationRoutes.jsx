import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

const LoginPage = Loadable(lazy(() => import('views/pages/authentication/Login')));
const RegisterPage = Loadable(lazy(() => import('views/pages/authentication/Register')));

const AuthenticationRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    // land here first
    { index: true, element: <Navigate to="pages/login" replace /> },

    // NOTE: child paths are relative (no leading slash)
    { path: 'pages/login', element: <LoginPage /> },
    { path: 'pages/register', element: <RegisterPage /> }
  ]
};

export default AuthenticationRoutes;
