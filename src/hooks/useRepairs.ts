import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type RepairStatus = "received" | "in_progress" | "ready" | "delivered" | "failed";

export type Currency = "NIO" | "USD";

export interface Repair {
  id: string;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  device_imei?: string;
  repair_type_id?: string;
  repair_description?: string;
  technical_notes?: string;
  status: RepairStatus;
  estimated_price: number;
  final_price?: number;
  parts_cost?: number;
  deposit?: number;
  delivery_date?: string;
  delivery_time?: string;
  technician_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  currency: Currency;
  warranty_days?: number;
  failure_reason?: string;
  device_photo_received?: string;
  device_photo_delivered?: string;
  repair_types?: { name: string };
}

export interface RepairType {
  id: string;
  name: string;
  description?: string;
  estimated_price?: number;
}

export const useRepairs = (filterByTechnician = false) => {
  const { user, isAdmin, workshopId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const repairsQuery = useQuery({
    queryKey: ["repairs", filterByTechnician, user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("repairs")
        .select(`
          *,
          repair_types (name)
        `)
        .order("created_at", { ascending: false });

      // If filtering by technician and not admin, only show user's repairs
      if (filterByTechnician && !isAdmin && user) {
        query = query.or(`created_by.eq.${user.id},technician_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Repair[];
    },
    enabled: !!user,
  });

  const repairTypesQuery = useQuery({
    queryKey: ["repair_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as RepairType[];
    },
    enabled: !!user,
  });

  const createRepair = useMutation({
    mutationFn: async (repair: Omit<Repair, "id" | "created_at" | "updated_at" | "created_by" | "repair_types" | "profiles">) => {
      const { data, error } = await supabase
        .from("repairs")
        .insert({
          ...repair,
          created_by: user!.id,
          workshop_id: workshopId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({
        title: "Reparación creada",
        description: "La reparación ha sido registrada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRepair = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Repair> & { id: string }) => {
      const { data, error } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({
        title: "Reparación actualizada",
        description: "Los cambios han sido guardados",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, failure_reason }: { id: string; status: RepairStatus; failure_reason?: string }) => {
      const updates: Partial<Repair> = { status };
      if (status === "delivered" || status === "failed") {
        updates.completed_at = new Date().toISOString();
      }
      if (status === "failed" && failure_reason) {
        updates.failure_reason = failure_reason;
      }

      const { data, error } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la reparación ha sido actualizado",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRepair = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repairs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({
        title: "Reparación eliminada",
        description: "La reparación ha sido eliminada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    repairs: repairsQuery.data || [],
    repairTypes: repairTypesQuery.data || [],
    isLoading: repairsQuery.isLoading || repairTypesQuery.isLoading,
    createRepair,
    updateRepair,
    updateStatus,
    deleteRepair,
    refetch: repairsQuery.refetch,
  };
};
