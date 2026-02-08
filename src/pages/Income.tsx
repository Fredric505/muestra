import { useMemo, useState } from "react";
import { useRepairs, Currency } from "@/hooks/useRepairs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Coins,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const currencySymbols: Record<Currency, string> = {
  NIO: "C$",
  USD: "$",
};

const Income = () => {
  const { repairs, isLoading } = useRepairs(true); // Filter by user if not admin
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );

  // Get available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    // Add last 12 months
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.add(format(date, "yyyy-MM"));
    }
    repairs
      .filter((r) => r.completed_at)
      .forEach((r) => {
        const date = parseISO(r.completed_at!);
        months.add(format(date, "yyyy-MM"));
      });
    return Array.from(months).sort().reverse();
  }, [repairs]);

  // Current month data
  const monthData = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const monthEnd = endOfMonth(monthStart);

    const monthRepairs = repairs.filter((r) => {
      if (!r.completed_at) return false;
      const date = parseISO(r.completed_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Calculate by currency
    const byCurrency = {
      NIO: { income: 0, netProfit: 0, deposits: 0, count: 0 },
      USD: { income: 0, netProfit: 0, deposits: 0, count: 0 },
    };

    monthRepairs.forEach((r) => {
      const currency = r.currency || "NIO";
      const price = r.final_price || r.estimated_price || 0;
      const parts = r.parts_cost || 0;
      byCurrency[currency].income += price;
      byCurrency[currency].netProfit += price - parts;
      byCurrency[currency].deposits += r.deposit || 0;
      byCurrency[currency].count++;
    });

    // Daily breakdown
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailyData = days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayRepairs = monthRepairs.filter((r) => {
        const date = parseISO(r.completed_at!);
        return isWithinInterval(date, { start: dayStart, end: dayEnd });
      });

      const nioNetProfit = dayRepairs
        .filter(r => r.currency === "NIO")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);
      
      const usdNetProfit = dayRepairs
        .filter(r => r.currency === "USD")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);

      return {
        date: format(day, "d"),
        "C$ (NIO)": nioNetProfit,
        "$ (USD)": usdNetProfit,
        repairs: dayRepairs.length,
      };
    });

    // Repair type breakdown
    const typeBreakdown = monthRepairs.reduce(
      (acc, r) => {
        const type = r.repair_types?.name || "Otro";
        const currency = r.currency || "NIO";
        const key = `${type}-${currency}`;
        if (!acc[key]) {
          acc[key] = { name: type, currency, count: 0, income: 0, netProfit: 0 };
        }
        const price = r.final_price || r.estimated_price || 0;
        const parts = r.parts_cost || 0;
        acc[key].count++;
        acc[key].income += price;
        acc[key].netProfit += price - parts;
        return acc;
      },
      {} as Record<string, { name: string; currency: string; count: number; income: number; netProfit: number }>
    );

    return {
      byCurrency,
      totalRepairs: monthRepairs.length,
      dailyData,
      typeBreakdown: Object.values(typeBreakdown).sort((a, b) => b.netProfit - a.netProfit),
      repairs: monthRepairs,
    };
  }, [repairs, selectedMonth]);

  // Previous month comparison
  const comparison = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const currentMonthStart = startOfMonth(
      new Date(parseInt(year), parseInt(month) - 1)
    );
    const prevMonthStart = subMonths(currentMonthStart, 1);
    const prevMonthEnd = endOfMonth(prevMonthStart);

    const prevMonthRepairs = repairs.filter((r) => {
      if (!r.completed_at) return false;
      const date = parseISO(r.completed_at);
      return isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
    });

    const prevByCurrency = {
      NIO: { netProfit: 0 },
      USD: { netProfit: 0 },
    };

    prevMonthRepairs.forEach((r) => {
      const currency = r.currency || "NIO";
      const price = r.final_price || r.estimated_price || 0;
      const parts = r.parts_cost || 0;
      prevByCurrency[currency].netProfit += price - parts;
    });

    const calcChange = (current: number, prev: number) => 
      prev > 0 ? ((current - prev) / prev) * 100 : 0;

    return {
      NIO: {
        prevNetProfit: prevByCurrency.NIO.netProfit,
        percentChange: calcChange(monthData.byCurrency.NIO.netProfit, prevByCurrency.NIO.netProfit),
      },
      USD: {
        prevNetProfit: prevByCurrency.USD.netProfit,
        percentChange: calcChange(monthData.byCurrency.USD.netProfit, prevByCurrency.USD.netProfit),
      },
    };
  }, [repairs, selectedMonth, monthData.byCurrency]);

  // Monthly trend for the year
  const yearlyTrend = useMemo(() => {
    const months: { month: string; "C$ (NIO)": number; "$ (USD)": number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthRepairs = repairs.filter((r) => {
        if (!r.completed_at) return false;
        const rDate = parseISO(r.completed_at);
        return isWithinInterval(rDate, { start: monthStart, end: monthEnd });
      });

      const nioProfit = monthRepairs
        .filter(r => r.currency === "NIO")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);
      
      const usdProfit = monthRepairs
        .filter(r => r.currency === "USD")
        .reduce((sum, r) => sum + ((r.final_price || r.estimated_price || 0) - (r.parts_cost || 0)), 0);

      months.push({
        month: format(date, "MMM", { locale: es }),
        "C$ (NIO)": nioProfit,
        "$ (USD)": usdProfit,
      });
    }
    return months;
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
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ingresos</h1>
          <p className="text-sm text-muted-foreground">
            Análisis detallado de ganancias netas por moneda
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {format(parseISO(`${month}-01`), "MMMM yyyy", { locale: es })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards - Córdobas */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancia Neta C$
            </CardTitle>
            <Coins className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              C${monthData.byCurrency.NIO.netProfit.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.NIO.percentChange >= 0 ? (
                <ArrowUp className="h-3 w-3 text-success" />
              ) : (
                <ArrowDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={comparison.NIO.percentChange >= 0 ? "text-success" : "text-destructive"}
              >
                {Math.abs(comparison.NIO.percentChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancia Neta $
            </CardTitle>
            <DollarSign className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${monthData.byCurrency.USD.netProfit.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {comparison.USD.percentChange >= 0 ? (
                <ArrowUp className="h-3 w-3 text-success" />
              ) : (
                <ArrowDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={comparison.USD.percentChange >= 0 ? "text-success" : "text-destructive"}
              >
                {Math.abs(comparison.USD.percentChange).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reparaciones
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {monthData.totalRepairs}
            </div>
            <p className="text-xs text-muted-foreground">
              C$: {monthData.byCurrency.NIO.count} | $: {monthData.byCurrency.USD.count}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Brutos
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {monthData.byCurrency.NIO.income > 0 && (
                <div className="text-lg font-bold text-foreground">
                  C${monthData.byCurrency.NIO.income.toFixed(2)}
                </div>
              )}
              {monthData.byCurrency.USD.income > 0 && (
                <div className="text-lg font-bold text-foreground">
                  ${monthData.byCurrency.USD.income.toFixed(2)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ganancias Netas Diarias -{" "}
              {format(parseISO(`${selectedMonth}-01`), "MMMM", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="date" stroke="hsl(215, 20%, 65%)" />
                <YAxis stroke="hsl(215, 20%, 65%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 13%)",
                    border: "1px solid hsl(217, 33%, 22%)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="C$ (NIO)"
                  fill="hsl(142, 71%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="$ (USD)"
                  fill="hsl(262, 83%, 58%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Tendencia Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 65%)" />
                <YAxis stroke="hsl(215, 20%, 65%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 13%)",
                    border: "1px solid hsl(217, 33%, 22%)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="C$ (NIO)"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(142, 71%, 45%)" }}
                />
                <Line
                  type="monotone"
                  dataKey="$ (USD)"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(262, 83%, 58%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Desglose por Tipo de Reparación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthData.typeBreakdown.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay datos para este mes
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Reparación</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Ganancia Neta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthData.typeBreakdown.map((type, idx) => {
                  const symbol = currencySymbols[type.currency as Currency];
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <span className={type.currency === "NIO" ? "text-success" : "text-accent"}>
                          {symbol}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{type.count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {symbol}{type.income.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {symbol}{type.netProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Income;