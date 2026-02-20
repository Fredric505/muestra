import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Payment from "./pages/Payment";
import Dashboard from "./pages/Dashboard";
import NewRepair from "./pages/NewRepair";
import Repairs from "./pages/Repairs";
import History from "./pages/History";
import Income from "./pages/Income";
import Employees from "./pages/Employees";
import MyEarnings from "./pages/MyEarnings";
import Settings from "./pages/Settings";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                <Route path="history" element={<History />} />
                <Route path="income" element={<Income />} />
                <Route path="employees" element={<Employees />} />
                <Route path="my-earnings" element={<MyEarnings />} />
                <Route path="settings" element={<Settings />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </BrandProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
