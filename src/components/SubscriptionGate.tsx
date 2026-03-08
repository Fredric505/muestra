import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { AccountBlockedScreen } from "@/components/AccountBlockedScreen";

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
  if (!isAdmin) {
    // Employee without workshop = was removed from workshop
    if (!workshop) {
      return <AccountRemovedScreen />;
    }
    if (workshop.subscription_status === "paused") {
      return (
        <AccountBlockedScreen
          type="paused"
          pauseType={workshop.pause_type}
          pauseReason={workshop.pause_reason}
          pauseEstimatedResume={workshop.pause_estimated_resume}
        />
      );
    }
    return <>{children}</>;
  }

  // Admin with no workshop = deleted
  if (!workshop) {
    return <AccountBlockedScreen type="deleted" />;
  }

  const status = workshop.subscription_status;

  // Paused workshop
  if (status === "paused") {
    return (
      <AccountBlockedScreen
        type="paused"
        pauseType={workshop.pause_type}
        pauseReason={workshop.pause_reason}
        pauseEstimatedResume={workshop.pause_estimated_resume}
      />
    );
  }

  // Active paid subscription
  if (status === "active") {
    const subEnd = workshop.subscription_ends_at ? new Date(workshop.subscription_ends_at) : null;
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
