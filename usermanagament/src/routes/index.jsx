import { createBrowserRouter } from 'react-router-dom';
import AuthenticationRoutes from './AuthenticationRoutes';
import MainRoutes from './MainRoutes';

const router = createBrowserRouter(
  [AuthenticationRoutes, MainRoutes],
  {
    // if you host under /free, set VITE_APP_BASE_NAME=/free
    basename: import.meta.env.VITE_APP_BASE_NAME
  }
);

export default router;
