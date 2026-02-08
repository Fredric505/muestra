import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Users, Shield, UserPlus, DollarSign, CreditCard, TrendingUp, Check, Calendar, Mail, Lock, Trash2, TrendingDown, AlertTriangle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
}

const Employees = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { 
    employees, 
    loans, 
    earnings, 
    isLoading, 
    createEmployee,
    deleteEmployee,
    createLoan, 
    markLoanPaid,
    calculateBiweeklyEarnings,
    refetch 
  } = useEmployees();
  
  // New employee form state
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  
  // Loan form state
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [selectedEmployeeForLoan, setSelectedEmployeeForLoan] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanDescription, setLoanDescription] = useState("");
  
  // Password reset state
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState<{id: string, name: string, user_id: string} | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleAddEmployee = async () => {
    if (!employeeName || !employeeEmail || !employeePassword || !commissionRate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (employeePassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEmployee(true);

    try {
      // Use edge function to create employee (preserves admin session)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error("No hay sesión activa");
      }

      const response = await supabase.functions.invoke("create-employee", {
        body: {
          email: employeeEmail,
          password: employeePassword,
          fullName: employeeName,
          commissionRate: parseFloat(commissionRate),
          baseSalary: parseFloat(baseSalary) || 0,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Empleado creado",
        description: `Se ha creado la cuenta para ${employeeName}. Email: ${employeeEmail}`,
      });

      refetch();
      setIsAddDialogOpen(false);
      setEmployeeName("");
      setEmployeeEmail("");
      setEmployeePassword("");
      setCommissionRate("");
      setBaseSalary("");
    } catch (error: unknown) {
      console.error("Error adding employee:", error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo crear el empleado";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleAddLoan = async () => {
    if (!selectedEmployeeForLoan || !loanAmount) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      await createLoan.mutateAsync({
        employee_id: selectedEmployeeForLoan,
        amount: parseFloat(loanAmount),
        description: loanDescription || undefined,
      });

      setIsLoanDialogOpen(false);
      setSelectedEmployeeForLoan("");
      setLoanAmount("");
      setLoanDescription("");
    } catch (error) {
      console.error("Error adding loan:", error);
    }
  };

  const handleMarkLoanPaid = async (loanId: string) => {
    try {
      await markLoanPaid.mutateAsync(loanId);
    } catch (error) {
      console.error("Error marking loan as paid:", error);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployeeForReset || !newPassword) {
      toast({
        title: "Error",
        description: "Por favor ingresa una nueva contraseña",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await supabase.functions.invoke("reset-employee-password", {
        body: {
          employee_user_id: selectedEmployeeForReset.user_id,
          new_password: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Contraseña actualizada",
        description: `La contraseña de ${selectedEmployeeForReset.name} ha sido cambiada`,
      });

      setIsResetPasswordDialogOpen(false);
      setSelectedEmployeeForReset(null);
      setNewPassword("");
    } catch (error: unknown) {
      console.error("Error resetting password:", error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo resetear la contraseña";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openResetPasswordDialog = (employee: { id: string; user_id: string; profiles?: { full_name: string } | null }) => {
    setSelectedEmployeeForReset({
      id: employee.id,
      user_id: employee.user_id,
      name: employee.profiles?.full_name || "Empleado",
    });
    setIsResetPasswordDialogOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee.mutateAsync(employeeId);
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  // Calculate employee profitability
  const calculateProfitability = (employee: typeof employees[0]) => {
    const monthlyBase = employee.base_salary || 0;
    const commissionRate = employee.monthly_commission_rate / 100;
    // Required revenue for commission to cover base salary
    const requiredRevenue = monthlyBase > 0 ? monthlyBase / commissionRate : 0;
    
    // Get monthly earnings
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthEarnings = (earnings || []).filter(e => {
      const date = new Date(e.earnings_date);
      return e.employee_id === employee.id && date >= monthStart && date <= monthEnd;
    });
    
    const monthlyCommission = monthEarnings.reduce((sum, e) => sum + e.commission_earned, 0);
    const monthlyNetProfit = monthEarnings.reduce((sum, e) => sum + e.net_profit, 0);
    const coversBase = monthlyCommission >= (monthlyBase / 2); // Comparing to biweekly
    
    return {
      monthlyBase,
      monthlyCommission,
      monthlyNetProfit,
      requiredRevenue,
      coversBase,
      repairsCount: monthEarnings.length,
    };
  };

  // Calculate current biweekly period
  const today = new Date();
  const currentDay = today.getDate();
  const biweeklyStart = currentDay <= 15 
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 16);
  const biweeklyEnd = currentDay <= 15
    ? new Date(today.getFullYear(), today.getMonth(), 15)
    : endOfMonth(today);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No tienes permisos para ver esta página
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona empleados, comisiones y préstamos
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <CreditCard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Registrar Préstamo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Préstamo</DialogTitle>
                <DialogDescription>
                  Registra un préstamo para descontar de la quincena
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Empleado *</Label>
                  <Select value={selectedEmployeeForLoan} onValueChange={setSelectedEmployeeForLoan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.profiles?.full_name || "Sin nombre"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    placeholder="Ej: Adelanto de sueldo"
                    value={loanDescription}
                    onChange={(e) => setLoanDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddLoan}>
                  Registrar Préstamo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-initial">
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Agregar Empleado</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Empleado</DialogTitle>
                <DialogDescription>
                  Crea una cuenta para el nuevo empleado. Podrá iniciar sesión con estas credenciales.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre completo *</Label>
                  <Input
                    placeholder="Juan Pérez"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="empleado@email.com"
                      className="pl-10"
                      value={employeeEmail}
                      onChange={(e) => setEmployeeEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10"
                      value={employeePassword}
                      onChange={(e) => setEmployeePassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Comisión (%) *</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 10"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salario base</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddEmployee} disabled={isCreatingEmployee}>
                  {isCreatingEmployee ? "Creando..." : "Crear Empleado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="earnings">
            <TrendingUp className="h-4 w-4 mr-2" />
            Ganancias Quincenales
          </TabsTrigger>
          <TabsTrigger value="loans">
            <CreditCard className="h-4 w-4 mr-2" />
            Préstamos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Empleados ({employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay empleados registrados</p>
                  <p className="text-sm">Haz clic en "Agregar Empleado" para comenzar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Comisión</TableHead>
                      <TableHead>Salario Base</TableHead>
                      <TableHead>Rentabilidad</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.filter(e => e.is_active).map((employee) => {
                      const profitability = calculateProfitability(employee);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.profiles?.full_name || "Sin nombre"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              {employee.monthly_commission_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ${employee.base_salary?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            {profitability.monthlyBase > 0 ? (
                              <div className="flex items-center gap-2">
                                {profitability.coversBase ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Rentable
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    Déficit
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ${profitability.monthlyCommission.toFixed(0)} / ${(profitability.monthlyBase / 2).toFixed(0)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Solo comisión</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(employee.hired_at), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.is_active ? "default" : "secondary"}>
                              {employee.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => openResetPasswordDialog(employee)}
                                title="Cambiar contraseña"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive" />
                                      ¿Eliminar empleado?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción desactivará al empleado <strong>{employee.profiles?.full_name}</strong>. 
                                      No podrá acceder al sistema pero sus datos se conservarán.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEmployee(employee.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Quincena Actual: {format(biweeklyStart, "dd MMM", { locale: es })} - {format(biweeklyEnd, "dd MMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay empleados para mostrar ganancias</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">Reparaciones</TableHead>
                      <TableHead className="text-right">Ganancia Neta</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Salario Base</TableHead>
                      <TableHead className="text-right">Préstamos</TableHead>
                      <TableHead className="text-right">Pago Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const biweeklyData = calculateBiweeklyEarnings(
                        employee.id,
                        biweeklyStart,
                        biweeklyEnd
                      );
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.profiles?.full_name || "Sin nombre"}
                          </TableCell>
                          <TableCell className="text-right">
                            {biweeklyData.repairsCount}
                          </TableCell>
                          <TableCell className="text-right">
                            ${biweeklyData.totalNetProfit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-400">
                            +${biweeklyData.totalCommission.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${biweeklyData.baseSalary.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-400">
                            -${biweeklyData.totalLoans.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ${biweeklyData.netPay.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Préstamos Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loans.filter((l) => !l.is_paid).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay préstamos pendientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans
                      .filter((l) => !l.is_paid)
                      .map((loan) => {
                        const employee = employees.find((e) => e.id === loan.employee_id);
                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">
                              {employee?.profiles?.full_name || "Desconocido"}
                            </TableCell>
                            <TableCell>
                              {loan.description || "Sin descripción"}
                            </TableCell>
                            <TableCell>
                              {format(parseISO(loan.loan_date), "dd MMM yyyy", {
                                locale: es,
                              })}
                            </TableCell>
                            <TableCell className="text-right text-red-400 font-medium">
                              ${loan.amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkLoanPaid(loan.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Marcar Pagado
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Establece una nueva contraseña para {selectedEmployeeForReset?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword}>
              <Lock className="h-4 w-4 mr-2" />
              {isResettingPassword ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;