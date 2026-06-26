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

import { lazyWithRetry } from "./utils/lazyWithRetry";

// Lazy load all pages
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const PurchaseEntry = lazyWithRetry(() => import("./pages/PurchaseEntry"));
const PurchasesList = lazyWithRetry(() => import("./pages/PurchasesList"));
const FarmersList = lazyWithRetry(() => import("./pages/FarmersList"));
const FarmerDetail = lazyWithRetry(() => import("./pages/FarmerDetail"));
const AdvanceManagement = lazyWithRetry(() => import("./pages/AdvanceManagement"));
const PriceManagement = lazyWithRetry(() => import("./pages/PriceManagement"));
const CoffeeProcessing = lazyWithRetry(() => import("./pages/CoffeeProcessing"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const AcceptInvite = lazyWithRetry(() => import("./pages/AcceptInvite"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const FarmerForm = lazyWithRetry(() => import("./pages/FarmerForm"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Expenses = lazyWithRetry(() => import("./pages/Expenses"));
const Sales = lazyWithRetry(() => import("./pages/Sales"));
const SaleHistory = lazyWithRetry(() => import("./pages/SaleHistory"));
const Settlement = lazyWithRetry(() => import("./pages/Settlement"));
const FarmerDebts = lazyWithRetry(() => import("./pages/FarmerDebts"));
const SeasonManagement = lazyWithRetry(() => import("./pages/SeasonManagement"));
const UserManagement = lazyWithRetry(() => import("./pages/UserManagement"));

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
          { path: "/processing", element: <Suspense fallback={<PageLoader />}><CoffeeProcessing /></Suspense> },
          { path: "/expenses", element: <Suspense fallback={<PageLoader />}><Expenses /></Suspense> },
          { path: "/history", element: <Suspense fallback={<PageLoader />}><SaleHistory /></Suspense> },
          { path: "/settle", element: <Suspense fallback={<PageLoader />}><Settlement /></Suspense> },
          { path: "/debts", element: <Suspense fallback={<PageLoader />}><FarmerDebts /></Suspense> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Super Admin']} />,
        children: [
          { path: "/reports", element: <Suspense fallback={<PageLoader />}><Reports /></Suspense> },
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