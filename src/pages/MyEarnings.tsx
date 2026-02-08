import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar, Coins, CreditCard, AlertCircle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const MyEarnings = () => {
  const { user, isAdmin } = useAuth();
  const { employees, earnings, loans, isLoading, calculateBiweeklyEarnings } = useEmployees();

  // Find the current user's employee record
  const myEmployee = useMemo(() => {
    return employees.find(e => e.user_id === user?.id);
  }, [employees, user]);

  // Get my earnings
  const myEarnings = useMemo(() => {
    if (!myEmployee) return [];
    return earnings.filter(e => e.employee_id === myEmployee.id);
  }, [earnings, myEmployee]);

  // Get my pending loans
  const myPendingLoans = useMemo(() => {
    if (!myEmployee) return [];
    return loans.filter(l => l.employee_id === myEmployee.id && !l.is_paid);
  }, [loans, myEmployee]);

  // Calculate biweekly period
  const today = new Date();
  const currentDay = today.getDate();
  const biweeklyStart = currentDay <= 15 
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 16);
  const biweeklyEnd = currentDay <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 15)
    : endOfMonth(today);

  // Current biweekly earnings
  const biweeklyData = useMemo(() => {
    if (!myEmployee) return null;
    return calculateBiweeklyEarnings(myEmployee.id, biweeklyStart, biweeklyEnd);
  }, [myEmployee, biweeklyStart, biweeklyEnd, calculateBiweeklyEarnings]);

  // Monthly totals
  const monthlyData = useMemo(() => {
    if (!myEmployee) return { totalEarnings: 0, totalCommission: 0, repairsCount: 0 };
    
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    const monthEarnings = myEarnings.filter(e => {
      const date = new Date(e.earnings_date);
      return date >= monthStart && date <= monthEnd;
    });
    
    return {
      totalEarnings: monthEarnings.reduce((sum, e) => sum + e.net_profit, 0),
      totalCommission: monthEarnings.reduce((sum, e) => sum + e.commission_earned, 0),
      repairsCount: monthEarnings.length,
    };
  }, [myEarnings, myEmployee]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!myEmployee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin registro de empleado</h2>
        <p className="text-muted-foreground">
          No tienes un registro de empleado asociado a tu cuenta.
          {isAdmin && " Como administrador, puedes ver las ganancias en la sección de Empleados."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mis Ganancias</h1>
        <p className="text-sm text-muted-foreground">
          Revisa tu comisión, reparaciones y préstamos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comisión Quincenal</p>
                <p className="text-xl font-bold text-primary">
                  ${biweeklyData?.totalCommission.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pago Neto Estimado</p>
                <p className="text-xl font-bold text-success">
                  ${biweeklyData?.netPay.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Coins className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reparaciones (Mes)</p>
                <p className="text-xl font-bold text-info">
                  {monthlyData.repairsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Préstamos Pendientes</p>
                <p className="text-xl font-bold text-destructive">
                  ${myPendingLoans.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Quincena Actual: {format(biweeklyStart, "dd MMM", { locale: es })} - {format(biweeklyEnd, "dd MMM yyyy", { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Tu comisión</p>
              <p className="text-2xl font-bold">{myEmployee.monthly_commission_rate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Salario base (quincenal)</p>
              <p className="text-2xl font-bold">${((myEmployee.base_salary || 0) / 2).toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Reparaciones esta quincena</p>
              <p className="text-2xl font-bold">{biweeklyData?.repairsCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Ganancias generadas</p>
              <p className="text-2xl font-bold text-success">${biweeklyData?.totalNetProfit.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historial de Comisiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myEarnings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aún no tienes reparaciones completadas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ingreso Bruto</TableHead>
                    <TableHead className="text-right">Costo Piezas</TableHead>
                    <TableHead className="text-right">Ganancia Neta</TableHead>
                    <TableHead className="text-right">Tu Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEarnings.slice(0, 20).map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        {format(parseISO(earning.earnings_date), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        ${earning.gross_income.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        -${earning.parts_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${earning.net_profit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        +${earning.commission_earned.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Loans */}
      {myPendingLoans.length > 0 && (
        <Card className="glass-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <CreditCard className="h-5 w-5" />
              Préstamos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPendingLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      {format(parseISO(loan.loan_date), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>{loan.description || "Sin descripción"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      -${loan.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyEarnings;
