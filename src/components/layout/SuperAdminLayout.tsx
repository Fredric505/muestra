import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Smartphone, Home } from "lucide-react";
import { Link } from "react-router-dom";

export function SuperAdminLayout() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-foreground">RepairControl</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">· Super Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Home className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Inicio</span>
              </Button>
            </Link>
            <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <span className="text-xs font-medium text-cyan-400">
                {profile?.full_name?.charAt(0).toUpperCase() || "S"}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
