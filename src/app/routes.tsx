import { createBrowserRouter } from "react-router";
import Dashboard from "./pages/Dashboard";
import PurchaseEntry from "./pages/PurchaseEntry";
import PurchasesList from "./pages/PurchasesList";
import FarmersList from "./pages/FarmersList";
import FarmerDetail from "./pages/FarmerDetail";
import AdvanceManagement from "./pages/AdvanceManagement";
import PriceManagement from "./pages/PriceManagement";
import NotFound from "./pages/NotFound";

import Login from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

import SubscriptionManagement from "./pages/SubscriptionManagement";

import Register from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';

import FarmerForm from "./pages/FarmerForm";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import UserManagement from "./pages/UserManagement";
import NotificationLog from "./pages/NotificationLog";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/register", Component: Register },
  { path: "/accept-invite", Component: AcceptInvite },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/purchases/new", Component: PurchaseEntry },
      { path: "/farmers", Component: FarmersList },
      { path: "/farmers/new", Component: FarmerForm },
      { path: "/farmers/:id", Component: FarmerDetail },
      { path: "/settings", Component: Settings },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['Admin', 'Manager']} />,
    children: [
      { path: "/", Component: Dashboard },
      { path: "/purchases", Component: PurchasesList },
      { path: "/advances", Component: AdvanceManagement },
      { path: "/prices", Component: PriceManagement },
      { path: "/reports", Component: Reports },
      { path: "/subscription", Component: SubscriptionManagement },
      { path: "/users", Component: UserManagement },
      { path: "/notifications", Component: NotificationLog },
    ],
  },
  { path: "*", Component: NotFound },
]);