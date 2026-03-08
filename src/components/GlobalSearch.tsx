import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Wrench, ShoppingBag, Users, Package, Clock } from "lucide-react";
import { useRepairs } from "@/hooks/useRepairs";
import { useSales } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  received: "Recibido", in_progress: "En Progreso", ready: "Listo",
  delivered: "Entregado", failed: "Fallido",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const isAdminOrSuper = isAdmin || isSuperAdmin;

  const { repairs } = useRepairs(true);
  const { sales } = useSales();
  const { products } = useProducts();
  const { employees } = useEmployees();

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm w-40 lg:w-56"
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate text-xs">Buscar...</span>
        <kbd className="hidden sm:inline-flex ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar reparaciones, ventas, empleados, productos..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {/* Repairs */}
          <CommandGroup heading="Reparaciones">
            {repairs.slice(0, 8).map((r) => (
              <CommandItem
                key={r.id}
                value={`${r.customer_name} ${r.customer_phone} ${r.device_brand} ${r.device_model} ${r.id}`}
                onSelect={() => go("/panel/repairs")}
              >
                <Wrench className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{r.customer_name} — {r.device_brand} {r.device_model}</span>
                  <span className="text-xs text-muted-foreground">{r.customer_phone}</span>
                </div>
                <Badge variant="outline" className="ml-2 text-[10px] flex-shrink-0">
                  {statusLabels[r.status] || r.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Sales */}
          <CommandGroup heading="Ventas">
            {sales.slice(0, 8).map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.customer_name} ${s.customer_phone || ""} ${s.id}`}
                onSelect={() => go("/panel/sales")}
              >
                <ShoppingBag className="mr-2 h-4 w-4 text-accent flex-shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{s.customer_name}</span>
                  <span className="text-xs text-muted-foreground">${s.total_amount.toFixed(2)}</span>
                </div>
                <Badge variant="outline" className="ml-2 text-[10px] flex-shrink-0">
                  {s.status === "completed" ? "Completada" : "Pendiente"}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Products */}
          <CommandGroup heading="Productos">
            {products.filter(p => p.is_active).slice(0, 8).map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.category} ${p.description || ""}`}
                onSelect={() => go("/panel/products")}
              >
                <Package className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.category} · Stock: {p.stock}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {/* Employees - admin only */}
          {isAdminOrSuper && employees && employees.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Empleados">
                {employees.slice(0, 8).map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${e.profiles?.full_name || ""} ${e.employee_type}`}
                    onSelect={() => go("/panel/employees")}
                  >
                    <Users className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm truncate">{e.profiles?.full_name || "Sin nombre"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{e.employee_type === "technician" ? "Técnico" : "Vendedor"}</span>
                    </div>
                    <Badge variant={e.is_active ? "default" : "destructive"} className="ml-2 text-[10px] flex-shrink-0">
                      {e.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          {/* Quick navigation */}
          <CommandGroup heading="Navegación">
            <CommandItem value="nueva reparacion" onSelect={() => go("/panel/repairs/new")}>
              <Wrench className="mr-2 h-4 w-4" />Nueva Reparación
            </CommandItem>
            <CommandItem value="nueva venta" onSelect={() => go("/panel/sales/new")}>
              <ShoppingBag className="mr-2 h-4 w-4" />Nueva Venta
            </CommandItem>
            <CommandItem value="historial" onSelect={() => go("/panel/history")}>
              <Clock className="mr-2 h-4 w-4" />Historial
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
