import { createBrowserRouter } from "react-router";
import Dashboard from "./pages/Dashboard";
import PurchaseEntry from "./pages/PurchaseEntry";
import PurchasesList from "./pages/PurchasesList";
import FarmersList from "./pages/FarmersList";
import FarmerDetail from "./pages/FarmerDetail";
import AdvanceManagement from "./pages/AdvanceManagement";
import PriceManagement from "./pages/PriceManagement";
import SeasonManagement from "./pages/SeasonManagement";
import NotFound from "./pages/NotFound";

import Login from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

// import SubscriptionManagement from "./pages/SubscriptionManagement";

import Register from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import FarmerForm from "./pages/FarmerForm";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Expenses from "./pages/Expenses";
import Sales from "./pages/Sales";
import SaleHistory from "./pages/SaleHistory";
import Settlement from "./pages/Settlement";

import UserManagement from "./pages/UserManagement";
import NotificationLog from "./pages/NotificationLog";
import MainErrorBoundary from "./components/MainErrorBoundary";

export const router = createBrowserRouter([
  {
    errorElement: <MainErrorBoundary />,
    children: [
      { path: "/login", Component: Login },
      { path: "/register", Component: Register },
      { path: "/forgot-password", Component: ForgotPassword },
      { path: "/reset-password", Component: ResetPassword },
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
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Field Agent', 'Super Admin']} />,
        children: [
          { path: "/", Component: Dashboard },
          { path: "/purchases", Component: PurchasesList },
          { path: "/purchases/:id/edit", Component: PurchaseEntry },
          { path: "/users", Component: UserManagement },
          { path: "/seasons", Component: SeasonManagement },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Field Agent']} />,
        children: [
          { path: "/advances", Component: AdvanceManagement },
          { path: "/prices", Component: PriceManagement },
          { path: "/reports", Component: Reports },
          { path: "/expenses", Component: Expenses },
          { path: "/history", Component: SaleHistory },
          { path: "/settle", Component: Settlement },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager']} />,
        children: [
          { path: "/sales", Component: Sales },
        ],
      },
      { path: "*", Component: NotFound },
    ]
  }
]);