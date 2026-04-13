import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { getCurrencySymbol } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar, Coins, CreditCard, AlertCircle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";

const MyEarnings = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { user, isAdmin, workshop } = useAuth();
  const { employees, earnings, loans, isLoading, calculateBiweeklyEarnings } = useEmployees();

  const symbol = getCurrencySymbol(workshop?.currency);

  const myEmployee = useMemo(() => {
    return employees.find(e => e.user_id === user?.id);
  }, [employees, user]);

  const myEarnings = useMemo(() => {
    if (!myEmployee) return [];
    return earnings.filter(e => e.employee_id === myEmployee.id);
  }, [earnings, myEmployee]);

  const myPendingLoans = useMemo(() => {
    if (!myEmployee) return [];
    return loans.filter(l => l.employee_id === myEmployee.id && !l.is_paid);
  }, [loans, myEmployee]);

  const today = new Date();
  const currentDay = today.getDate();
  const biweeklyStart = currentDay <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 16);
  const biweeklyEnd = currentDay <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 15)
    : endOfMonth(today);

  const biweeklyData = useMemo(() => {
    if (!myEmployee) return null;
    return calculateBiweeklyEarnings(myEmployee.id, biweeklyStart, biweeklyEnd);
  }, [myEmployee, biweeklyStart, biweeklyEnd, calculateBiweeklyEarnings]);

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
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!myEmployee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("myEarnings.noEmployee")}</h2>
        <p className="text-muted-foreground">
          {t("myEarnings.noEmployeeDesc")}
          {isAdmin && ` ${t("myEarnings.adminHint")}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("myEarnings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("myEarnings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("myEarnings.biweeklyCommission")}</p>
                <p className="text-xl font-bold text-primary">{symbol}{biweeklyData?.totalCommission.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("myEarnings.estimatedNetPay")}</p>
                <p className="text-xl font-bold text-success">{symbol}{biweeklyData?.netPay.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg"><Coins className="h-5 w-5 text-info" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("myEarnings.repairsMonth")}</p>
                <p className="text-xl font-bold text-info">{monthlyData.repairsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg"><CreditCard className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{t("myEarnings.pendingLoans")}</p>
                <p className="text-xl font-bold text-destructive">{symbol}{myPendingLoans.reduce((sum, l) => sum + l.amount, 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t("myEarnings.currentBiweekly")}: {format(biweeklyStart, "dd MMM", { locale: dateLoc })} - {format(biweeklyEnd, "dd MMM yyyy", { locale: dateLoc })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("myEarnings.yourCommission")}</p>
              <p className="text-2xl font-bold">{myEmployee.monthly_commission_rate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("myEarnings.baseSalaryBiweekly")}</p>
              <p className="text-2xl font-bold">{symbol}{((myEmployee.base_salary || 0) / 2).toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("myEarnings.repairsBiweekly")}</p>
              <p className="text-2xl font-bold">{biweeklyData?.repairsCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t("myEarnings.generatedEarnings")}</p>
              <p className="text-2xl font-bold text-success">{symbol}{biweeklyData?.totalNetProfit.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("myEarnings.commissionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myEarnings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("myEarnings.noRepairsYet")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead className="text-right">{t("myEarnings.grossIncome")}</TableHead>
                    <TableHead className="text-right">{t("myEarnings.partsCost")}</TableHead>
                    <TableHead className="text-right">{t("myEarnings.netProfit")}</TableHead>
                    <TableHead className="text-right">{t("myEarnings.yourCommissionAmount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEarnings.slice(0, 20).map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{format(parseISO(earning.earnings_date), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
                      <TableCell className="text-right">{symbol}{earning.gross_income.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">-{symbol}{earning.parts_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{symbol}{earning.net_profit.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium text-success">+{symbol}{earning.commission_earned.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {myPendingLoans.length > 0 && (
        <Card className="glass-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <CreditCard className="h-5 w-5" />
              {t("myEarnings.pendingLoans")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead className="text-right">{t("common.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPendingLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{format(parseISO(loan.loan_date), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
                    <TableCell>{loan.description || t("common.noDescription")}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">-{symbol}{loan.amount.toFixed(2)}</TableCell>
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
