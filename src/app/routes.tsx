import React, { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MainErrorBoundary from "./components/MainErrorBoundary";
import { Loader2 } from "lucide-react";

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
    <Loader2 className="w-10 h-10 text-green-700 animate-spin" />
  </div>
);

// Lazy load all pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PurchaseEntry = lazy(() => import("./pages/PurchaseEntry"));
const PurchasesList = lazy(() => import("./pages/PurchasesList"));
const FarmersList = lazy(() => import("./pages/FarmersList"));
const FarmerDetail = lazy(() => import("./pages/FarmerDetail"));
const AdvanceManagement = lazy(() => import("./pages/AdvanceManagement"));
const PriceManagement = lazy(() => import("./pages/PriceManagement"));
const SeasonManagement = lazy(() => import("./pages/SeasonManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FarmerForm = lazy(() => import("./pages/FarmerForm"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Sales = lazy(() => import("./pages/Sales"));
const SaleHistory = lazy(() => import("./pages/SaleHistory"));
const Settlement = lazy(() => import("./pages/Settlement"));
const FarmerDebts = lazy(() => import("./pages/FarmerDebts"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Helper to wrap components in Suspense
const Loadable = (Component: any) => (props: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    errorElement: <MainErrorBoundary />,
    children: [
      { path: "/login", element: <Suspense fallback={<PageLoader />}><Login /></Suspense> },
      { path: "/register", element: <Suspense fallback={<PageLoader />}><Register /></Suspense> },
      { path: "/forgot-password", element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense> },
      { path: "/reset-password", element: <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense> },
      { path: "/accept-invite", element: <Suspense fallback={<PageLoader />}><AcceptInvite /></Suspense> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/purchases/new", element: <Suspense fallback={<PageLoader />}><PurchaseEntry /></Suspense> },
          { path: "/farmers", element: <Suspense fallback={<PageLoader />}><FarmersList /></Suspense> },
          { path: "/farmers/new", element: <Suspense fallback={<PageLoader />}><FarmerForm /></Suspense> },
          { path: "/farmers/:id", element: <Suspense fallback={<PageLoader />}><FarmerDetail /></Suspense> },
          { path: "/settings", element: <Suspense fallback={<PageLoader />}><Settings /></Suspense> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Field Agent', 'Super Admin']} />,
        children: [
          { path: "/", element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense> },
          { path: "/purchases", element: <Suspense fallback={<PageLoader />}><PurchasesList /></Suspense> },
          { path: "/purchases/:id/edit", element: <Suspense fallback={<PageLoader />}><PurchaseEntry /></Suspense> },
          { path: "/users", element: <Suspense fallback={<PageLoader />}><UserManagement /></Suspense> },
          { path: "/seasons", element: <Suspense fallback={<PageLoader />}><SeasonManagement /></Suspense> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Field Agent']} />,
        children: [
          { path: "/advances", element: <Suspense fallback={<PageLoader />}><AdvanceManagement /></Suspense> },
          { path: "/prices", element: <Suspense fallback={<PageLoader />}><PriceManagement /></Suspense> },
          { path: "/reports", element: <Suspense fallback={<PageLoader />}><Reports /></Suspense> },
          { path: "/expenses", element: <Suspense fallback={<PageLoader />}><Expenses /></Suspense> },
          { path: "/history", element: <Suspense fallback={<PageLoader />}><SaleHistory /></Suspense> },
          { path: "/settle", element: <Suspense fallback={<PageLoader />}><Settlement /></Suspense> },
          { path: "/debts", element: <Suspense fallback={<PageLoader />}><FarmerDebts /></Suspense> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager']} />,
        children: [
          { path: "/sales", element: <Suspense fallback={<PageLoader />}><Sales /></Suspense> },
        ],
      },
      { path: "*", element: <Suspense fallback={<PageLoader />}><NotFound /></Suspense> },
    ]
  }
]);