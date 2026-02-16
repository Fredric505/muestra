import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Employee {
  id: string;
  user_id: string;
  profile_id: string | null;
  monthly_commission_rate: number;
  base_salary: number;
  is_active: boolean;
  hired_at: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface EmployeeLoan {
  id: string;
  employee_id: string;
  amount: number;
  description: string | null;
  loan_date: string;
  is_paid: boolean;
  paid_at: string | null;
  created_by: string;
  created_at: string;
}

export interface DailyEarning {
  id: string;
  employee_id: string;
  repair_id: string;
  earnings_date: string;
  gross_income: number;
  parts_cost: number;
  net_profit: number;
  commission_earned: number;
  created_at: string;
}

export const useEmployees = () => {
  const { user, workshopId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          profiles (id, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user,
  });

  const loansQuery = useQuery({
    queryKey: ["employee_loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_loans")
        .select("*")
        .order("loan_date", { ascending: false });

      if (error) throw error;
      return data as EmployeeLoan[];
    },
    enabled: !!user,
  });

  const earningsQuery = useQuery({
    queryKey: ["daily_earnings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_earnings")
        .select("*")
        .order("earnings_date", { ascending: false });

      if (error) throw error;
      return data as DailyEarning[];
    },
    enabled: !!user,
  });

  const createEmployee = useMutation({
    mutationFn: async (employee: {
      user_id: string;
      profile_id?: string;
      monthly_commission_rate: number;
      base_salary?: number;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          ...employee,
          workshop_id: workshopId,
        })
        .select(`*, profiles (id, full_name, avatar_url)`)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Empleado agregado",
        description: "El empleado ha sido registrado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Empleado actualizado",
        description: "Los cambios han sido guardados",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createLoan = useMutation({
    mutationFn: async (loan: {
      employee_id: string;
      amount: number;
      description?: string;
      loan_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("employee_loans")
        .insert({
          ...loan,
          created_by: user!.id,
          workshop_id: workshopId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_loans"] });
      toast({
        title: "Préstamo registrado",
        description: "El préstamo ha sido registrado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markLoanPaid = useMutation({
    mutationFn: async (loanId: string) => {
      const { data, error } = await supabase
        .from("employee_loans")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", loanId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee_loans"] });
      toast({
        title: "Préstamo pagado",
        description: "El préstamo ha sido marcado como pagado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.rpc("cleanup_employee", {
        p_employee_id: employeeId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado completamente del sistema",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEarning = useMutation({
    mutationFn: async (earning: {
      employee_id: string;
      repair_id: string;
      gross_income: number;
      parts_cost: number;
      net_profit: number;
      commission_earned: number;
    }) => {
      const { data, error } = await supabase
        .from("daily_earnings")
        .insert({
          ...earning,
          workshop_id: workshopId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_earnings"] });
    },
    onError: (error: Error) => {
      console.error("Error creating earning:", error);
    },
  });

  // Calculate biweekly earnings for an employee
  const calculateBiweeklyEarnings = (employeeId: string, startDate: Date, endDate: Date) => {
    const earnings = earningsQuery.data || [];
    const loans = loansQuery.data || [];
    const employee = employeesQuery.data?.find(e => e.id === employeeId);

    const periodEarnings = earnings.filter(e => {
      const earningDate = new Date(e.earnings_date);
      return e.employee_id === employeeId && 
             earningDate >= startDate && 
             earningDate <= endDate;
    });

    const pendingLoans = loans.filter(l => 
      l.employee_id === employeeId && !l.is_paid
    );

    const totalCommission = periodEarnings.reduce((sum, e) => sum + e.commission_earned, 0);
    const totalLoans = pendingLoans.reduce((sum, l) => sum + l.amount, 0);
    const baseSalary = (employee?.base_salary || 0) / 2; // Biweekly

    return {
      totalCommission,
      totalLoans,
      baseSalary,
      netPay: baseSalary + totalCommission - totalLoans,
      repairsCount: periodEarnings.length,
      totalNetProfit: periodEarnings.reduce((sum, e) => sum + e.net_profit, 0),
    };
  };

  return {
    employees: employeesQuery.data || [],
    loans: loansQuery.data || [],
    earnings: earningsQuery.data || [],
    isLoading: employeesQuery.isLoading || loansQuery.isLoading || earningsQuery.isLoading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createLoan,
    markLoanPaid,
    createEarning,
    calculateBiweeklyEarnings,
    refetch: () => {
      employeesQuery.refetch();
      loansQuery.refetch();
      earningsQuery.refetch();
    },
  };
};
