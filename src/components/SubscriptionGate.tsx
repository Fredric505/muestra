import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { workshop, isSuperAdmin, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admins bypass subscription check
  if (isSuperAdmin) return <>{children}</>;

  // Employees (non-admin) bypass payment gate — only owners pay
  if (!isAdmin) return <>{children}</>;

  // Admin: wait for workshop data before deciding
  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if workshop subscription is active or in trial
  if (workshop.is_active) return <>{children}</>;
  
  const status = workshop.subscription_status;
  if (status === "active") return <>{children}</>;
  
  if (status === "trial") {
    const trialEnd = workshop.trial_ends_at ? new Date(workshop.trial_ends_at) : null;
    if (trialEnd && trialEnd > new Date()) return <>{children}</>;
  }

  // Redirect to payment page
  return <Navigate to="/payment" replace />;
};
