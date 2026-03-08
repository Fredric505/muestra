import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Wrench, ShoppingBag, Users, Package, Clock, X } from "lucide-react";
import { useRepairs } from "@/hooks/useRepairs";
import { useSales } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const isAdminOrSuper = isAdmin || isSuperAdmin;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { repairs } = useRepairs(true);
  const { sales } = useSales();
  const { products } = useProducts();
  const { employees } = useEmployees();

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); inputRef.current?.focus(); } };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase().trim();
  const showResults = focused && q.length > 0;

  const filteredRepairs = useMemo(() => !q ? [] : repairs.filter(r => `${r.customer_name} ${r.customer_phone} ${r.device_brand} ${r.device_model}`.toLowerCase().includes(q)).slice(0, 5), [repairs, q]);
  const filteredSales = useMemo(() => !q ? [] : sales.filter(s => `${s.customer_name} ${s.customer_phone || ""}`.toLowerCase().includes(q)).slice(0, 5), [sales, q]);
  const filteredProducts = useMemo(() => !q ? [] : products.filter(p => p.is_active && `${p.name} ${p.category} ${p.description || ""}`.toLowerCase().includes(q)).slice(0, 5), [products, q]);
  const filteredEmployees = useMemo(() => (!q || !isAdminOrSuper) ? [] : (employees || []).filter(e => `${e.profiles?.full_name || ""} ${e.employee_type}`.toLowerCase().includes(q)).slice(0, 5), [employees, q, isAdminOrSuper]);

  const hasResults = filteredRepairs.length + filteredSales.length + filteredProducts.length + filteredEmployees.length > 0;
  const go = (path: string) => { setFocused(false); setQuery(""); navigate(path); };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} placeholder={t("search.placeholder")} className="h-8 pl-8 pr-8 text-xs bg-secondary/50 border-border" />
        {query && (<button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>)}
      </div>
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[60vh]">
            {!hasResults && <p className="text-sm text-muted-foreground text-center py-6">{t("search.noResults")}</p>}
            {filteredRepairs.length > 0 && (
              <ResultGroup label={t("search.repairs")}>
                {filteredRepairs.map(r => (
                  <ResultItem key={r.id} onClick={() => go("/panel/repairs")} icon={<Wrench className="h-4 w-4 text-primary flex-shrink-0" />}
                    title={`${r.customer_name} — ${r.device_brand} ${r.device_model}`} subtitle={r.customer_phone}
                    badge={t(`repairStatus.${r.status}`)} />
                ))}
              </ResultGroup>
            )}
            {filteredSales.length > 0 && (
              <ResultGroup label={t("search.sales")}>
                {filteredSales.map(s => (
                  <ResultItem key={s.id} onClick={() => go("/panel/sales")} icon={<ShoppingBag className="h-4 w-4 text-accent flex-shrink-0" />}
                    title={s.customer_name} subtitle={`$${s.total_amount.toFixed(2)}`}
                    badge={s.status === "completed" ? t("salesPage.completed") : t("salesPage.pending")} />
                ))}
              </ResultGroup>
            )}
            {filteredProducts.length > 0 && (
              <ResultGroup label={t("search.products")}>
                {filteredProducts.map(p => (
                  <ResultItem key={p.id} onClick={() => go("/panel/products")} icon={<Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    title={p.name} subtitle={`${p.category} · Stock: ${p.stock}`} />
                ))}
              </ResultGroup>
            )}
            {filteredEmployees.length > 0 && (
              <ResultGroup label={t("search.employees")}>
                {filteredEmployees.map(e => (
                  <ResultItem key={e.id} onClick={() => go("/panel/employees")} icon={<Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    title={e.profiles?.full_name || "?"} subtitle={e.employee_type === "technician" ? t("roles.technician") : t("roles.seller")}
                    badge={e.is_active ? t("employeesPage.active") : t("employeesPage.inactive")}
                    badgeVariant={e.is_active ? "default" : "destructive"} />
                ))}
              </ResultGroup>
            )}
            <ResultGroup label={t("common.actions")}>
              <ResultItem onClick={() => go("/panel/repairs/new")} icon={<Wrench className="h-4 w-4" />} title={t("nav.newRepair")} />
              <ResultItem onClick={() => go("/panel/sales/new")} icon={<ShoppingBag className="h-4 w-4" />} title={t("dashboard.newSale")} />
              <ResultItem onClick={() => go("/panel/history")} icon={<Clock className="h-4 w-4" />} title={t("nav.history")} />
            </ResultGroup>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="py-1"><p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{label}</p>{children}</div>);
}

function ResultItem({ icon, title, subtitle, badge, badgeVariant = "outline", onClick }: {
  icon: React.ReactNode; title: string; subtitle?: string; badge?: string; badgeVariant?: "outline" | "default" | "destructive"; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors">
      {icon}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm truncate">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
      </div>
      {badge && <Badge variant={badgeVariant} className="ml-2 text-[10px] flex-shrink-0">{badge}</Badge>}
    </button>
  );
}
