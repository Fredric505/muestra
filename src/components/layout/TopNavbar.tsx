import { useState } from "react";
import {
  LayoutDashboard, PlusCircle, Wrench, History, DollarSign, LogOut,
  Users, TrendingUp, Settings, Cog, ShoppingBag, Package, FileDown, Menu, X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

const repairMenuItems = [
  { title: "Nueva Reparación", url: "/panel/repairs/new", icon: PlusCircle },
  { title: "Reparaciones", url: "/panel/repairs", icon: Wrench },
  { title: "Historial", url: "/panel/history", icon: History },
  { title: "Ingresos", url: "/panel/income", icon: DollarSign },
];

const salesMenuItems = [
  { title: "Ventas", url: "/panel/sales", icon: ShoppingBag },
];

const adminItems = [
  { title: "Inventario", url: "/panel/products", icon: Package },
  { title: "Empleados", url: "/panel/employees", icon: Users },
  { title: "Exportar", url: "/panel/export", icon: FileDown },
  { title: "Config", url: "/panel/settings", icon: Cog },
];

const employeeItems = [
  { title: "Mis Ganancias", url: "/panel/my-earnings", icon: TrendingUp },
];

export function TopNavbar() {
  const location = useLocation();
  const { signOut, profile, isAdmin, isSuperAdmin, employeeType } = useAuth();
  const { brand } = useBrand();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrSuper = isAdmin || isSuperAdmin;
  const allItems = [
    { title: "Dashboard", url: "/panel/dashboard", icon: LayoutDashboard },
    ...(isAdminOrSuper || employeeType === "technician" ? repairMenuItems : []),
    ...(isAdminOrSuper || employeeType === "seller" ? salesMenuItems : []),
    ...(isAdminOrSuper ? adminItems : employeeItems),
  ];

  const brandInitial = (brand.business_name || "T").charAt(0).toUpperCase();

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {allItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
            location.pathname === item.url
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.business_name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{brandInitial}</span>
              </div>
            )}
            <span className="font-bold text-foreground hidden sm:inline text-sm">{brand.business_name || "Mi Taller"}</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide mx-4">
            <NavItems />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <GlobalSearch />
            <LanguageSelector />
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
              title="Editar perfil"
            >
              <span className="text-xs font-medium text-primary">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </span>
            </button>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-2">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.business_name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{brandInitial}</span>
                      </div>
                    )}
                    {brand.business_name || "Mi Taller"}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-4">
                  <NavItems onClick={() => setMobileMenuOpen(false)} />
                </nav>
                <div className="mt-auto p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrador" : employeeType === "seller" ? "Vendedor" : "Técnico"}
                    {" · "}{profile?.full_name || "Usuario"}
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <ProfileEditDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </>
  );
}
