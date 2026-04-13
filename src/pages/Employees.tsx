import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { getCurrencySymbol } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, UserPlus, DollarSign, CreditCard, TrendingUp, Check, Calendar, Mail, Lock, Trash2, TrendingDown, AlertTriangle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, subDays } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";

const Employees = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { isAdmin, user, workshop } = useAuth();
  const { toast } = useToast();
  const { employees, loans, earnings, isLoading, createEmployee, deleteEmployee, createLoan, markLoanPaid, calculateBiweeklyEarnings, refetch } = useEmployees();
  const sym = getCurrencySymbol(workshop?.currency);

  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [employeeType, setEmployeeType] = useState<"technician" | "seller">("technician");
  const [compensationType, setCompensationType] = useState("commission");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [selectedEmployeeForLoan, setSelectedEmployeeForLoan] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanDescription, setLoanDescription] = useState("");
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState<{id: string, name: string, user_id: string} | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleAddEmployee = async () => {
    if (!employeeName || !employeeEmail || !employeePassword || !commissionRate) {
      toast({ title: t("common.error"), description: t("common.required"), variant: "destructive" }); return;
    }
    if (employeePassword.length < 6) {
      toast({ title: t("common.error"), description: t("auth.minPasswordChars"), variant: "destructive" }); return;
    }
    setIsCreatingEmployee(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session");
      const response = await supabase.functions.invoke("create-employee", {
        body: { email: employeeEmail, password: employeePassword, fullName: employeeName, commissionRate: parseFloat(commissionRate), baseSalary: parseFloat(baseSalary) || 0, employeeType, compensationType },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: t("employeesPage.employeeCreated"), description: t("employeesPage.employeeCreatedDesc", { name: employeeName, email: employeeEmail }) });
      refetch(); setIsAddDialogOpen(false);
      setEmployeeName(""); setEmployeeEmail(""); setEmployeePassword(""); setCommissionRate(""); setBaseSalary(""); setEmployeeType("technician"); setCompensationType("commission");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("common.error");
      toast({ title: t("common.error"), description: errorMessage, variant: "destructive" });
    } finally { setIsCreatingEmployee(false); }
  };

  const handleAddLoan = async () => {
    if (!selectedEmployeeForLoan || !loanAmount) { toast({ title: t("common.error"), description: t("common.required"), variant: "destructive" }); return; }
    try {
      await createLoan.mutateAsync({ employee_id: selectedEmployeeForLoan, amount: parseFloat(loanAmount), description: loanDescription || undefined });
      setIsLoanDialogOpen(false); setSelectedEmployeeForLoan(""); setLoanAmount(""); setLoanDescription("");
    } catch (error) { console.error(error); }
  };

  const handleMarkLoanPaid = async (loanId: string) => { try { await markLoanPaid.mutateAsync(loanId); } catch (error) { console.error(error); } };

  const handleResetPassword = async () => {
    if (!selectedEmployeeForReset || !newPassword) { toast({ title: t("common.error"), description: t("common.required"), variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: t("common.error"), description: t("auth.minPasswordChars"), variant: "destructive" }); return; }
    setIsResettingPassword(true);
    try {
      const response = await supabase.functions.invoke("reset-employee-password", { body: { employee_user_id: selectedEmployeeForReset.user_id, new_password: newPassword } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: t("employeesPage.passwordUpdated"), description: t("employeesPage.passwordUpdatedDesc", { name: selectedEmployeeForReset.name }) });
      setIsResetPasswordDialogOpen(false); setSelectedEmployeeForReset(null); setNewPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("common.error");
      toast({ title: t("common.error"), description: errorMessage, variant: "destructive" });
    } finally { setIsResettingPassword(false); }
  };

  const openResetPasswordDialog = (employee: { id: string; user_id: string; profiles?: { full_name: string } | null }) => {
    setSelectedEmployeeForReset({ id: employee.id, user_id: employee.user_id, name: employee.profiles?.full_name || "—" });
    setIsResetPasswordDialogOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => { try { await deleteEmployee.mutateAsync(employeeId); } catch (error) { console.error(error); } };

  const today = new Date();
  const currentDay = today.getDate();
  const biweeklyStart = currentDay <= 15 ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 16);
  const biweeklyEnd = currentDay <= 15 ? new Date(today.getFullYear(), today.getMonth(), 15) : endOfMonth(today);

  if (!isAdmin) {
    return (<div className="flex items-center justify-center h-64"><div className="text-center"><Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">{t("employeesPage.noPermission")}</p></div></div>);
  }

  if (isLoading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t("common.loading")}</div></div>);
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("employeesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("employeesPage.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-initial"><CreditCard className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">{t("employeesPage.registerLoan")}</span></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("employeesPage.loanTitle")}</DialogTitle><DialogDescription>{t("employeesPage.loanDesc")}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>{t("employeesPage.employee")} *</Label>
                  <Select value={selectedEmployeeForLoan} onValueChange={setSelectedEmployeeForLoan}><SelectTrigger><SelectValue placeholder={t("employeesPage.selectEmployee")} /></SelectTrigger>
                    <SelectContent>{employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.profiles?.full_name || "—"}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t("employeesPage.amount")} *</Label><Input type="number" placeholder="0.00" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("employeesPage.loanDescription")}</Label><Input placeholder={t("employeesPage.salaryAdvance")} value={loanDescription} onChange={(e) => setLoanDescription(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleAddLoan}>{t("employeesPage.registerLoan")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-initial"><UserPlus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">{t("employeesPage.addEmployee")}</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{t("employeesPage.addNewEmployee")}</DialogTitle><DialogDescription>{t("employeesPage.addEmployeeDesc")}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>{t("employeesPage.fullName")} *</Label><Input placeholder="Juan Pérez" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("employeesPage.email")} *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="email@test.com" className="pl-10" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} /></div></div>
                <div className="space-y-2"><Label>{t("employeesPage.password")} *</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder={t("auth.minPasswordChars")} className="pl-10" value={employeePassword} onChange={(e) => setEmployeePassword(e.target.value)} /></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t("employeesPage.employeeType")} *</Label>
                    <Select value={employeeType} onValueChange={(v: "technician" | "seller") => setEmployeeType(v)}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="technician">{t("employeesPage.technician")}</SelectItem><SelectItem value="seller">{t("employeesPage.seller")}</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{t("employeesPage.compensation")}</Label>
                    <Select value={compensationType} onValueChange={setCompensationType}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="commission">{t("employeesPage.commissionOnly")}</SelectItem><SelectItem value="fixed">{t("employeesPage.fixedOnly")}</SelectItem><SelectItem value="both">{t("employeesPage.salaryAndCommission")}</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t("employeesPage.commissionRate")} *</Label><Input type="number" placeholder="10" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>{t("employeesPage.baseSalary")}</Label><Input type="number" placeholder="0.00" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleAddEmployee} disabled={isCreatingEmployee}>{isCreatingEmployee ? t("common.creating") : t("employeesPage.addEmployee")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="employees"><Users className="h-4 w-4 mr-2" />{t("employeesPage.tabTeam")}</TabsTrigger>
          <TabsTrigger value="earnings"><TrendingUp className="h-4 w-4 mr-2" />{t("employeesPage.tabPayroll")}</TabsTrigger>
          <TabsTrigger value="loans"><CreditCard className="h-4 w-4 mr-2" />{t("employeesPage.tabLoans")}</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{t("employeesPage.tabTeam")} ({employees.length})</CardTitle></CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("common.noData")}</p></div>
              ) : (
                <>
                <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("common.name")}</TableHead><TableHead>{t("employeesPage.employeeType")}</TableHead><TableHead>{t("employeesPage.commission")}</TableHead>
                    <TableHead>{t("employeesPage.salary")}</TableHead><TableHead>{t("employeesPage.compensation")}</TableHead><TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead><TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {employees.filter(e => e.is_active).map((employee) => {
                      const empType = (employee as any).employee_type;
                      const compType = (employee as any).compensation_type;
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.profiles?.full_name || "—"}</TableCell>
                          <TableCell><Badge variant={empType === "seller" ? "outline" : "secondary"}>{empType === "seller" ? t("employeesPage.seller") : t("employeesPage.technician")}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="bg-primary/20 text-primary">{employee.monthly_commission_rate}%</Badge></TableCell>
                          <TableCell>${employee.base_salary?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{compType === "both" ? t("employeesPage.salaryAndCommission") : compType === "fixed" ? t("employeesPage.fixedOnly") : t("employeesPage.commissionOnly")}</Badge></TableCell>
                          <TableCell>{format(parseISO(employee.hired_at), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
                          <TableCell><Badge variant={employee.is_active ? "default" : "secondary"}>{employee.is_active ? t("employeesPage.active") : t("employeesPage.inactive")}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => openResetPasswordDialog(employee)} title={t("employeesPage.resetPassword")}><KeyRound className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />{t("employeesPage.deleteEmployee")}</AlertDialogTitle><AlertDialogDescription>{t("employeesPage.deleteEmployeeWarning")}</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {employees.filter(e => e.is_active).map((employee) => {
                    const empType = (employee as any).employee_type;
                    const compType = (employee as any).compensation_type;
                    return (
                      <div key={employee.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div><p className="font-medium text-foreground">{employee.profiles?.full_name || "—"}</p><Badge variant={empType === "seller" ? "outline" : "secondary"} className="text-xs mt-1">{empType === "seller" ? t("employeesPage.seller") : t("employeesPage.technician")}</Badge></div>
                          <Badge variant={employee.is_active ? "default" : "secondary"} className="text-xs">{employee.is_active ? t("employeesPage.active") : t("employeesPage.inactive")}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">{t("employeesPage.commission")}: </span><span className="text-primary font-medium">{employee.monthly_commission_rate}%</span></div>
                          <div><span className="text-muted-foreground">{t("employeesPage.salary")}: </span><span>${employee.base_salary?.toFixed(2) || "0.00"}</span></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{compType === "both" ? t("employeesPage.salaryAndCommission") : compType === "fixed" ? t("employeesPage.fixedOnly") : t("employeesPage.commissionOnly")}</span>
                          <span>{format(parseISO(employee.hired_at), "dd/MM/yy", { locale: dateLoc })}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => openResetPasswordDialog(employee)}><KeyRound className="h-3 w-3 mr-1" />{t("employeesPage.resetPassword")}</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive h-7 px-2 ml-auto"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>{t("employeesPage.deleteEmployee")}</AlertDialogTitle><AlertDialogDescription>{t("employeesPage.deleteEmployeeWarning")}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />{t("employeesPage.biweeklyPeriod")}: {format(biweeklyStart, "dd MMM", { locale: dateLoc })} - {format(biweeklyEnd, "dd MMM yyyy", { locale: dateLoc })}</CardTitle></CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("common.noData")}</p></div>
              ) : (
                <>
                <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("employeesPage.employee")}</TableHead><TableHead className="text-right">{t("incomePage.repairs")}</TableHead>
                    <TableHead className="text-right">{t("incomePage.netProfit")}</TableHead><TableHead className="text-right">{t("employeesPage.commission")}</TableHead>
                    <TableHead className="text-right">{t("employeesPage.salary")}</TableHead><TableHead className="text-right">{t("employeesPage.tabLoans")}</TableHead>
                    <TableHead className="text-right">{t("employeesPage.netPay")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const d = calculateBiweeklyEarnings(employee.id, biweeklyStart, biweeklyEnd);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.profiles?.full_name || "—"}</TableCell>
                          <TableCell className="text-right">{d.repairsCount}</TableCell>
                          <TableCell className="text-right">${d.totalNetProfit.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-success">+${d.totalCommission.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${d.baseSalary.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-destructive">-${d.totalLoans.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">${d.netPay.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {employees.map((employee) => {
                    const d = calculateBiweeklyEarnings(employee.id, biweeklyStart, biweeklyEnd);
                    return (
                      <div key={employee.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between"><p className="font-medium text-foreground">{employee.profiles?.full_name || "—"}</p><p className="font-bold text-primary">${d.netPay.toFixed(2)}</p></div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">{t("incomePage.repairs")}</span><p className="font-medium">{d.repairsCount}</p></div>
                          <div><span className="text-muted-foreground">{t("employeesPage.commission")}</span><p className="font-medium text-success">+${d.totalCommission.toFixed(2)}</p></div>
                          <div><span className="text-muted-foreground">{t("employeesPage.tabLoans")}</span><p className="font-medium text-destructive">-${d.totalLoans.toFixed(2)}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />{t("employeesPage.pendingLoans")}</CardTitle></CardHeader>
            <CardContent>
              {loans.filter((l) => !l.is_paid).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("employeesPage.noPendingLoans")}</p></div>
              ) : (
                <>
                <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("employeesPage.employee")}</TableHead><TableHead>{t("common.description")}</TableHead><TableHead>{t("common.date")}</TableHead>
                    <TableHead className="text-right">{t("employeesPage.amount")}</TableHead><TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {loans.filter((l) => !l.is_paid).map((loan) => {
                      const employee = employees.find((e) => e.id === loan.employee_id);
                      return (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{employee?.profiles?.full_name || "—"}</TableCell>
                          <TableCell>{loan.description || t("employeesPage.noDescription")}</TableCell>
                          <TableCell>{format(parseISO(loan.loan_date), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
                          <TableCell className="text-right text-destructive font-medium">${loan.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleMarkLoanPaid(loan.id)}><Check className="h-4 w-4 mr-1" />{t("employeesPage.markAsPaid")}</Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {loans.filter((l) => !l.is_paid).map((loan) => {
                    const employee = employees.find((e) => e.id === loan.employee_id);
                    return (
                      <div key={loan.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div><p className="font-medium text-foreground">{employee?.profiles?.full_name || "—"}</p><p className="text-xs text-muted-foreground">{loan.description || t("employeesPage.noDescription")}</p></div>
                          <p className="font-bold text-destructive">${loan.amount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(parseISO(loan.loan_date), "dd/MM/yy", { locale: dateLoc })}</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMarkLoanPaid(loan.id)}><Check className="h-3 w-3 mr-1" />{t("employeesPage.paid")}</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />{t("employeesPage.resetPassword")}</DialogTitle>
            <DialogDescription>{selectedEmployeeForReset?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{t("employeesPage.newPassword")}</Label><Input type="password" placeholder={t("auth.minPasswordChars")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword}><Lock className="h-4 w-4 mr-2" />{isResettingPassword ? t("common.saving") : t("employeesPage.resetPassword")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
