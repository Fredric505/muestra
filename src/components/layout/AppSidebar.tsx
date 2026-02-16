import { useState } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Wrench,
  History,
  DollarSign,
  LogOut,
  Users,
  TrendingUp,
  Settings,
  Cog,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";

const menuItems = [
  { title: "Dashboard", url: "/panel/dashboard", icon: LayoutDashboard },
  { title: "Nueva Reparación", url: "/panel/repairs/new", icon: PlusCircle },
  { title: "Reparaciones", url: "/panel/repairs", icon: Wrench },
  { title: "Historial", url: "/panel/history", icon: History },
  { title: "Ingresos", url: "/panel/income", icon: DollarSign },
];

const adminItems = [
  { title: "Empleados", url: "/panel/employees", icon: Users },
  { title: "Configuración", url: "/panel/settings", icon: Cog },
];

const employeeItems = [
  { title: "Mis Ganancias", url: "/panel/my-earnings", icon: TrendingUp },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { signOut, profile, isAdmin, isSuperAdmin } = useAuth();
  const { brand, defaultLogoUrl } = useBrand();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const logoUrl = brand.logo_url || defaultLogoUrl;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img 
              src={logoUrl} 
              alt={brand.business_name} 
              className="h-10 w-10 rounded-lg object-cover"
            />
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="font-bold text-sidebar-foreground">{brand.business_name}</h2>
              <p className="text-xs text-muted-foreground">Panel de Control</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3",
                        location.pathname === item.url && "text-primary"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3",
                          location.pathname === item.url && "text-primary"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isAdmin && !isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Mi Cuenta</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {employeeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3",
                          location.pathname === item.url && "text-primary"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setProfileDialogOpen(true)}
            className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 hover:bg-primary/30 transition-colors"
            title="Editar perfil"
          >
            <span className="text-sm font-medium text-primary">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </span>
          </button>
          {open && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <button 
                onClick={() => setProfileDialogOpen(true)}
                className="text-left w-full hover:opacity-80 transition-opacity"
              >
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {profile?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrador" : "Técnico"}
                  <Settings className="h-3 w-3" />
                </p>
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="flex-shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        
        <ProfileEditDialog 
          open={profileDialogOpen} 
          onOpenChange={setProfileDialogOpen}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
