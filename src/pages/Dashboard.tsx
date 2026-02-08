import { useRepairs, Currency } from "@/hooks/useRepairs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  Package,
  AlertCircle,
  Coins,
} from "lucide-react";
import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const statusLabels: Record<string, string> = {
  received: "Recibido",
  in_progress: "En Progreso",
  ready: "Listo",
  delivered: "Entregado",
};

const statusColors: Record<string, string> = {
  received: "hsl(38, 92%, 50%)",
  in_progress: "hsl(199, 89%, 48%)",
  ready: "hsl(142, 71%, 45%)",
  delivered: "hsl(262, 83%, 58%)",
};

const currencySymbols: Record<Currency, string> = {
  NIO: "C$",
  USD: "$",
};

const Dashboard = () => {
  const { repairs, isLoading } = useRepairs(true); // Filter by user if not admin

  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const todayRepairs = repairs.filter((r) => {
      const date = parseISO(r.created_at);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const monthRepairs = repairs.filter((r) => {
      const date = parseISO(r.created_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const todayDelivered = repairs.filter((r) => {
      if (!r.completed_at) return false;
      const date = parseISO(r.completed_at);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const monthDelivered = repairs.filter((r) => {
      if (!r.completed_at) return false;
      const date = parseISO(r.completed_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Calculate income and net profit by currency
    const calculateByCurrency = (repairsList: typeof repairs) => {
      const result = {
        NIO: { income: 0, netProfit: 0 },
        USD: { income: 0, netProfit: 0 },
      };
      
      repairsList.forEach((r) => {
        const price = r.final_price || r.estimated_price || 0;
        const parts = r.parts_cost || 0;
        const currency = r.currency || "NIO";
        result[currency].income += price;
        result[currency].netProfit += price - parts;
      });
      
      return result;
    };

    const todayByCurrency = calculateByCurrency(todayDelivered);
    const monthByCurrency = calculateByCurrency(monthDelivered);

    const pending = repairs.filter((r) => r.status !== "delivered").length;
    const inProgress = repairs.filter((r) => r.status === "in_progress").length;
    const ready = repairs.filter((r) => r.status === "ready").length;

    return {
      todayRepairs: todayRepairs.length,
      monthRepairs: monthRepairs.length,
      todayByCurrency,
      monthByCurrency,
      pending,
      inProgress,
      ready,
    };
  }, [repairs]);

  const statusData = useMemo(() => {
    const counts = repairs.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabels[status],
      value: count,
      color: statusColors[status],
    }));
  }, [repairs]);

  const weeklyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayRepairs = repairs.filter((r) => {
        if (!r.completed_at) return false;
        const rDate = parseISO(r.completed_at);
        return isWithinInterval(rDate, { start: dayStart, end: dayEnd });
      });

      const nioProfit = dayRepairs
        .filter(r => r.currency === "NIO")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);
      
      const usdProfit = dayRepairs
        .filter(r => r.currency === "USD")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);

      return {
        date: format(date, "EEE", { locale: es }),
        "C$ (NIO)": nioProfit,
        "$ (USD)": usdProfit,
        reparaciones: dayRepairs.length,
      };
    });
  }, [repairs]);

  const repairTypeData = useMemo(() => {
    const counts = repairs.reduce(
      (acc, r) => {
        const type = r.repair_types?.name || "Otro";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [repairs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Ganancia Neta Hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-1">
              {stats.todayByCurrency.NIO.netProfit > 0 && (
                <div className="text-xl font-bold text-foreground">
                  C${stats.todayByCurrency.NIO.netProfit.toFixed(2)}
                </div>
              )}
              {stats.todayByCurrency.USD.netProfit > 0 && (
                <div className="text-xl font-bold text-foreground">
                  ${stats.todayByCurrency.USD.netProfit.toFixed(2)}
                </div>
              )}
              {stats.todayByCurrency.NIO.netProfit === 0 && stats.todayByCurrency.USD.netProfit === 0 && (
                <div className="text-xl font-bold text-foreground">C$0.00</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.todayRepairs} reparaciones registradas
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancia Neta del Mes
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.monthByCurrency.NIO.netProfit > 0 && (
                <div className="text-xl font-bold text-foreground">
                  C${stats.monthByCurrency.NIO.netProfit.toFixed(2)}
                </div>
              )}
              {stats.monthByCurrency.USD.netProfit > 0 && (
                <div className="text-xl font-bold text-foreground">
                  ${stats.monthByCurrency.USD.netProfit.toFixed(2)}
                </div>
              )}
              {stats.monthByCurrency.NIO.netProfit === 0 && stats.monthByCurrency.USD.netProfit === 0 && (
                <div className="text-xl font-bold text-foreground">C$0.00</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.monthRepairs} reparaciones este mes
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.inProgress} en progreso, {stats.ready} listas
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Listas para Entrega
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.ready}
            </div>
            <p className="text-xs text-muted-foreground">
              Esperando recogida del cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ganancias Netas Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorNIO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="date" stroke="hsl(215, 20%, 65%)" />
                <YAxis stroke="hsl(215, 20%, 65%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 13%)",
                    border: "1px solid hsl(217, 33%, 22%)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                />
                <Area
                  type="monotone"
                  dataKey="C$ (NIO)"
                  stroke="hsl(142, 71%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorNIO)"
                />
                <Area
                  type="monotone"
                  dataKey="$ (USD)"
                  stroke="hsl(262, 83%, 58%)"
                  fillOpacity={1}
                  fill="url(#colorUSD)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Córdobas (C$)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">Dólares ($)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Estado de Reparaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 13%)",
                    border: "1px solid hsl(217, 33%, 22%)",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {status.name}: {status.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Types Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Tipos de Reparación Más Comunes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={repairTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
              <XAxis type="number" stroke="hsl(215, 20%, 65%)" />
              <YAxis
                dataKey="name"
                type="category"
                stroke="hsl(215, 20%, 65%)"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 13%)",
                  border: "1px solid hsl(217, 33%, 22%)",
                  borderRadius: "0.5rem",
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(262, 83%, 58%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Repairs */}
      {repairs.filter((r) => r.status === "ready").length > 0 && (
        <Card className="glass-card border-warning/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Reparaciones Listas para Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {repairs
                .filter((r) => r.status === "ready")
                .slice(0, 5)
                .map((repair) => {
                  const symbol = currencySymbols[repair.currency];
                  const price = repair.final_price || repair.estimated_price;
                  const netProfit = price - (repair.parts_cost || 0);
                  
                  return (
                    <div
                      key={repair.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {repair.customer_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {repair.device_brand} {repair.device_model} -{" "}
                          {repair.repair_types?.name}
                        </p>
                        <p className="text-sm text-success">
                          Ganancia: {symbol}{netProfit.toFixed(2)}
                        </p>
                      </div>
                      <a
                        href={`https://wa.me/${repair.customer_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success hover:text-success/80 text-sm font-medium"
                      >
                        Contactar
                      </a>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;