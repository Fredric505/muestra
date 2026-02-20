import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({
  children,
  requireSuperAdmin = false,
}: {
  children: JSX.Element;
  requireSuperAdmin?: boolean;
}) => {
  const { user, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/panel/dashboard" replace />;
  }

  return children;
};
