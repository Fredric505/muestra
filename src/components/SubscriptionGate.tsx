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

  const status = workshop.subscription_status;

  // Active paid subscription
  if (status === "active") {
    const subEnd = workshop.subscription_ends_at ? new Date(workshop.subscription_ends_at) : null;
    // If no end date set, or end date is in the future, allow access
    if (!subEnd || subEnd > new Date()) return <>{children}</>;
  }
  
  // Trial subscription — only allow if trial hasn't expired
  if (status === "trial") {
    const trialEnd = workshop.trial_ends_at ? new Date(workshop.trial_ends_at) : null;
    if (trialEnd && trialEnd > new Date()) return <>{children}</>;
  }

  // Redirect to payment page
  return <Navigate to="/payment" replace />;
};
