import { useRepairs } from "@/hooks/useRepairs";
import { useSales } from "@/hooks/useSales";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wrench, DollarSign, Clock, CheckCircle, TrendingUp, Package,
  AlertCircle, Search, ShoppingBag, Image as ImageIcon, Plus, Users, Star, BarChart3,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuickSaleDialog from "@/components/QuickSaleDialog";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const statusLabels: Record<string, string> = {
  received: "Recibido", in_progress: "En Progreso", ready: "Listo", delivered: "Entregado",
};
const statusColors: Record<string, string> = {
  received: "hsl(38, 92%, 50%)", in_progress: "hsl(199, 89%, 48%)",
  ready: "hsl(142, 71%, 45%)", delivered: "hsl(262, 83%, 58%)",
};

const Dashboard = () => {
  const { isAdmin, employeeType, workshop } = useAuth();
  const { repairs, isLoading: repairsLoading } = useRepairs(true);
  const { sales, isLoading: salesLoading } = useSales();
  const { products } = useProducts();
  const [productSearch, setProductSearch] = useState("");
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null);
  const navigate = useNavigate();

  const handleProductClick = (product: Product) => {
    // Accessories (not phones) → quick sale dialog
    const isPhone = product.category === "celular" || product.category === "telefono" || product.category === "dispositivo";
    if (isPhone) {
      navigate("/panel/sales/new", { state: { preselectedProduct: product } });
    } else {
      setQuickSaleProduct(product);
      setQuickSaleOpen(true);
    }
  };

  const currencySymbol = workshop?.currency === "USD" ? "$" : (workshop?.currency || "C$");
  const isAdminOrSuper = isAdmin;
  const showRepairs = isAdminOrSuper || employeeType === "technician";
  const showSales = isAdminOrSuper || employeeType === "seller";

  // Repair stats
  const repairStats = useMemo(() => {
    if (!showRepairs) return null;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const todayDelivered = repairs.filter(r => {
      if (!r.completed_at) return false;
      return isWithinInterval(parseISO(r.completed_at), { start: todayStart, end: todayEnd });
    });
    const monthDelivered = repairs.filter(r => {
      if (!r.completed_at) return false;
      return isWithinInterval(parseISO(r.completed_at), { start: monthStart, end: monthEnd });
    });

    const calcProfit = (list: typeof repairs) =>
      list.reduce((s, r) => s + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);

    return {
      todayProfit: calcProfit(todayDelivered),
      monthProfit: calcProfit(monthDelivered),
      todayCount: repairs.filter(r => isWithinInterval(parseISO(r.created_at), { start: todayStart, end: todayEnd })).length,
      monthCount: repairs.filter(r => isWithinInterval(parseISO(r.created_at), { start: monthStart, end: monthEnd })).length,
      pending: repairs.filter(r => r.status !== "delivered").length,
      inProgress: repairs.filter(r => r.status === "in_progress").length,
      ready: repairs.filter(r => r.status === "ready").length,
    };
  }, [repairs, showRepairs]);

  // Sales stats
  const salesStats = useMemo(() => {
    if (!showSales) return null;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const completed = sales.filter(s => s.status === "completed");
    const todaySales = completed.filter(s => isWithinInterval(parseISO(s.sale_date), { start: todayStart, end: todayEnd }));
    const monthSales = completed.filter(s => isWithinInterval(parseISO(s.sale_date), { start: monthStart, end: monthEnd }));

    const calcProfit = (list: typeof sales) =>
      list.reduce((s, sale) => s + (sale.total_amount - (sale.product_cost || 0)), 0);

    return {
      todayRevenue: todaySales.reduce((s, sale) => s + sale.total_amount, 0),
      monthRevenue: monthSales.reduce((s, sale) => s + sale.total_amount, 0),
      todayProfit: calcProfit(todaySales),
      monthProfit: calcProfit(monthSales),
      pendingCost: sales.filter(s => s.status === "pending_cost").length,
      totalSalesMonth: monthSales.length,
    };
  }, [sales, showSales]);

  // Repair status chart
  const statusData = useMemo(() => {
    if (!showRepairs) return [];
    const counts = repairs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).map(([status, count]) => ({ name: statusLabels[status], value: count, color: statusColors[status] }));
  }, [repairs, showRepairs]);

  // Weekly chart
  const weeklyData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    return last7.map(date => {
      const ds = startOfDay(date), de = endOfDay(date);
      const dayRepairs = showRepairs ? repairs.filter(r => r.completed_at && isWithinInterval(parseISO(r.completed_at), { start: ds, end: de })) : [];
      const daySales = showSales ? sales.filter(s => s.status === "completed" && isWithinInterval(parseISO(s.sale_date), { start: ds, end: de })) : [];
      return {
        date: format(date, "EEE", { locale: es }),
        Reparaciones: dayRepairs.reduce((s, r) => s + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0),
        Ventas: daySales.reduce((s, sale) => s + (sale.total_amount - (sale.product_cost || 0)), 0),
      };
    });
  }, [repairs, sales, showRepairs, showSales]);

  // Repair types chart
  const repairTypeData = useMemo(() => {
    if (!showRepairs) return [];
    const counts = repairs.reduce((acc, r) => { const t = r.repair_types?.name || "Otro"; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [repairs, showRepairs]);

  // Monthly stats (last 6 months)
  const monthlyStatsData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const monthRepairs = showRepairs ? repairs.filter(r => r.completed_at && isWithinInterval(parseISO(r.completed_at), { start: ms, end: me })) : [];
      const monthSalesItems = showSales ? sales.filter(s => s.status === "completed" && isWithinInterval(parseISO(s.sale_date), { start: ms, end: me })) : [];
      return {
        month: format(month, "MMM yy", { locale: es }),
        Reparaciones: monthRepairs.length,
        Ventas: monthSalesItems.length,
        GananciaRep: monthRepairs.reduce((s, r) => s + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0),
        GananciaVen: monthSalesItems.reduce((s, sale) => s + (sale.total_amount - (sale.product_cost || 0)), 0),
      };
    });
  }, [repairs, sales, showRepairs, showSales]);

  // Frequent clients
  const frequentClients = useMemo(() => {
    const clientMap: Record<string, { name: string; phone: string; repairCount: number; saleCount: number; totalSpent: number; lastVisit: string }> = {};
    
    repairs.forEach(r => {
      const key = r.customer_phone.replace(/\D/g, "");
      if (!clientMap[key]) {
        clientMap[key] = { name: r.customer_name, phone: r.customer_phone, repairCount: 0, saleCount: 0, totalSpent: 0, lastVisit: r.created_at };
      }
      clientMap[key].repairCount++;
      clientMap[key].totalSpent += r.final_price || r.estimated_price || 0;
      if (r.created_at > clientMap[key].lastVisit) {
        clientMap[key].lastVisit = r.created_at;
        clientMap[key].name = r.customer_name;
      }
    });

    sales.forEach(s => {
      if (!s.customer_phone) return;
      const key = s.customer_phone.replace(/\D/g, "");
      if (!clientMap[key]) {
        clientMap[key] = { name: s.customer_name, phone: s.customer_phone, repairCount: 0, saleCount: 0, totalSpent: 0, lastVisit: s.sale_date };
      }
      clientMap[key].saleCount++;
      clientMap[key].totalSpent += s.total_amount;
      if (s.sale_date > clientMap[key].lastVisit) {
        clientMap[key].lastVisit = s.sale_date;
      }
    });

    return Object.values(clientMap)
      .filter(c => (c.repairCount + c.saleCount) >= 2)
      .sort((a, b) => (b.repairCount + b.saleCount) - (a.repairCount + a.saleCount))
      .slice(0, 10);
  }, [repairs, sales]);

  // Product search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter(p => p.is_active && p.stock > 0).slice(0, 8);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.is_active && p.stock > 0 && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)));
  }, [products, productSearch]);

  if (repairsLoading || salesLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Cargando...</div></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {showRepairs && repairStats && (
          <>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ganancia Reparaciones Hoy</CardTitle>
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl font-bold text-foreground">{currencySymbol}{repairStats.todayProfit.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{repairStats.todayCount} registradas hoy</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-2xl font-bold text-foreground">{repairStats.pending}</div>
                <p className="text-xs text-muted-foreground">{repairStats.inProgress} en progreso, {repairStats.ready} listas</p>
              </CardContent>
            </Card>
          </>
        )}
        {showSales && salesStats && (
          <>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ventas del Mes</CardTitle>
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl font-bold text-foreground">{currencySymbol}{salesStats.monthRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{salesStats.totalSalesMonth} ventas completadas</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{isAdminOrSuper ? "Ganancia Ventas Mes" : "Ventas Pendientes"}</CardTitle>
                {isAdminOrSuper ? <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" /> : <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />}
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {isAdminOrSuper ? (
                  <div className="text-xl font-bold text-success">{currencySymbol}{salesStats.monthProfit.toFixed(2)}</div>
                ) : (
                  <div className="text-2xl font-bold text-foreground">{salesStats.pendingCost}</div>
                )}
                <p className="text-xs text-muted-foreground">{isAdminOrSuper ? "ganancia neta" : "pendientes de costeo"}</p>
              </CardContent>
            </Card>
          </>
        )}
        {showRepairs && repairStats && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Listas para Entrega</CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-2xl font-bold text-foreground">{repairStats.ready}</div>
              <p className="text-xs text-muted-foreground">Esperando recogida</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Quick Search */}
      {showSales && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Búsqueda Rápida de Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o modelo... ej: Samsung S22, cargador, protector"
                className="pl-10"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer active:scale-95"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="aspect-square mb-2 rounded-md bg-muted/50 overflow-hidden flex items-center justify-center">
                      {product.photo_url ? (
                        <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-primary">{currencySymbol}{product.selling_price.toFixed(2)}</span>
                      <Badge variant={product.stock > 3 ? "default" : "destructive"} className="text-xs">
                        {product.stock} disp.
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{product.category} · {product.condition}</p>
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs">
                      <Plus className="h-3 w-3 mr-1" />Vender
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ganancias Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="date" stroke="hsl(215, 20%, 65%)" />
                <YAxis stroke="hsl(215, 20%, 65%)" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 13%)", border: "1px solid hsl(217, 33%, 22%)", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(210, 40%, 98%)" }} />
                {showRepairs && <Area type="monotone" dataKey="Reparaciones" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorRep)" />}
                {showSales && <Area type="monotone" dataKey="Ventas" stroke="hsl(262, 83%, 58%)" fillOpacity={1} fill="url(#colorSales)" />}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {showRepairs && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success" /><span className="text-sm text-muted-foreground">Reparaciones</span></div>}
              {showSales && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent" /><span className="text-sm text-muted-foreground">Ventas</span></div>}
            </div>
          </CardContent>
        </Card>

        {showRepairs && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-accent" />Estado de Reparaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 13%)", border: "1px solid hsl(217, 33%, 22%)", borderRadius: "0.5rem" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {statusData.map(s => <div key={s.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm text-muted-foreground">{s.name}: {s.value}</span></div>)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Repair Types - only for technicians/admins */}
      {showRepairs && repairTypeData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Tipos de Reparación Más Comunes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={repairTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis type="number" stroke="hsl(215, 20%, 65%)" />
                <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 65%)" width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 13%)", border: "1px solid hsl(217, 33%, 22%)", borderRadius: "0.5rem" }} />
                <Bar dataKey="count" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ready for delivery */}
      {showRepairs && repairs.filter(r => r.status === "ready").length > 0 && (
        <Card className="glass-card border-warning/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning"><AlertCircle className="h-5 w-5" />Reparaciones Listas para Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {repairs.filter(r => r.status === "ready").slice(0, 5).map(repair => {
                const price = repair.final_price || repair.estimated_price;
                const netProfit = price - (repair.parts_cost || 0);
                return (
                  <div key={repair.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-foreground">{repair.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{repair.device_brand} {repair.device_model} - {repair.repair_types?.name}</p>
                      <p className="text-sm text-success">Ganancia: {currencySymbol}{netProfit.toFixed(2)}</p>
                    </div>
                    <a href={`https://wa.me/${repair.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-success hover:text-success/80 text-sm font-medium">Contactar</a>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Statistics */}
      {isAdminOrSuper && monthlyStatsData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Estadísticas Mensuales (Últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyStatsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 65%)" />
                <YAxis stroke="hsl(215, 20%, 65%)" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 13%)", border: "1px solid hsl(217, 33%, 22%)", borderRadius: "0.5rem" }} labelStyle={{ color: "hsl(210, 40%, 98%)" }} />
                {showRepairs && <Bar dataKey="Reparaciones" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />}
                {showSales && <Bar dataKey="Ventas" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {showRepairs && (
                <>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Total Reparaciones</p>
                    <p className="text-lg font-bold text-foreground">{monthlyStatsData.reduce((s, m) => s + m.Reparaciones, 0)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Ganancia Rep.</p>
                    <p className="text-lg font-bold text-success">{currencySymbol}{monthlyStatsData.reduce((s, m) => s + m.GananciaRep, 0).toFixed(2)}</p>
                  </div>
                </>
              )}
              {showSales && (
                <>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Total Ventas</p>
                    <p className="text-lg font-bold text-foreground">{monthlyStatsData.reduce((s, m) => s + m.Ventas, 0)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Ganancia Ven.</p>
                    <p className="text-lg font-bold text-success">{currencySymbol}{monthlyStatsData.reduce((s, m) => s + m.GananciaVen, 0).toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequent Clients - Admin only */}
      {isAdminOrSuper && frequentClients.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Clientes Frecuentes
              <Badge variant="secondary" className="ml-auto">{frequentClients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {frequentClients.map((client, i) => (
                <div key={client.phone} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        {client.name}
                        {(client.repairCount + client.saleCount) >= 5 && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.repairCount > 0 && `${client.repairCount} reparaciones`}
                        {client.repairCount > 0 && client.saleCount > 0 && " · "}
                        {client.saleCount > 0 && `${client.saleCount} compras`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Última visita: {format(parseISO(client.lastVisit), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-success">{currencySymbol}{client.totalSpent.toFixed(2)}</p>
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline"
                    >
                      Contactar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <QuickSaleDialog
        open={quickSaleOpen}
        onOpenChange={setQuickSaleOpen}
        initialProduct={quickSaleProduct}
      />
    </div>
  );
};

export default Dashboard;
