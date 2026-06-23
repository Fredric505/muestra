import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Payment = lazy(() => import("./pages/Payment"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewRepair = lazy(() => import("./pages/NewRepair"));
const Repairs = lazy(() => import("./pages/Repairs"));
const History = lazy(() => import("./pages/History"));
const Income = lazy(() => import("./pages/Income"));
const Employees = lazy(() => import("./pages/Employees"));
const MyEarnings = lazy(() => import("./pages/MyEarnings"));
const Settings = lazy(() => import("./pages/Settings"));
const Products = lazy(() => import("./pages/Products"));
const Sales = lazy(() => import("./pages/Sales"));
const NewSale = lazy(() => import("./pages/NewSale"));
const ExportData = lazy(() => import("./pages/ExportData"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandProvider>
        <ThemeProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <Payment />
                  </ProtectedRoute>
                }
              />

              {/* Workshop panel */}
              <Route
                path="/panel"
                element={
                  <ProtectedRoute>
                    <SubscriptionGate>
                      <AppLayout />
                    </SubscriptionGate>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/panel/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="repairs/new" element={<NewRepair />} />
                <Route path="repairs" element={<Repairs />} />
                <Route path="sales" element={<Sales />} />
                <Route path="sales/new" element={<NewSale />} />
                <Route path="products" element={<Products />} />
                <Route path="history" element={<History />} />
                <Route path="income" element={<Income />} />
                <Route path="employees" element={<Employees />} />
                <Route path="my-earnings" element={<MyEarnings />} />
                <Route path="settings" element={<Settings />} />
                <Route path="export" element={<ExportData />} />
              </Route>

              {/* Super Admin */}
              <Route
                path="/super-admin"
                element={
                  <SuperAdminRoute>
                    <SuperAdminLayout />
                  </SuperAdminRoute>
                }
              >
                <Route index element={<SuperAdminDashboard />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/panel/dashboard" replace />} />
              <Route path="/repairs" element={<Navigate to="/panel/repairs" replace />} />
              <Route path="/repairs/new" element={<Navigate to="/panel/repairs/new" replace />} />
              <Route path="/history" element={<Navigate to="/panel/history" replace />} />
              <Route path="/income" element={<Navigate to="/panel/income" replace />} />
              <Route path="/employees" element={<Navigate to="/panel/employees" replace />} />
              <Route path="/my-earnings" element={<Navigate to="/panel/my-earnings" replace />} />
              <Route path="/settings" element={<Navigate to="/panel/settings" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </BrandProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
