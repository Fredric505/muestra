import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Sale {
  id: string;
  workshop_id: string | null;
  seller_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  sale_date: string;
  total_amount: number;
  currency: string;
  status: string;
  product_cost: number | null;
  admin_notes: string | null;
  cost_registered_by: string | null;
  cost_registered_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  sale_items?: SaleItem[];
  employees?: { profiles?: { full_name: string } };
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  condition: string;
  warranty_days: number;
  condition_notes: string | null;
  device_photo_url: string | null;
  created_at: string;
}

export const useSales = () => {
  const { user, workshopId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (*),
          employees ( profiles ( full_name ) )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user,
  });

  const createSale = useMutation({
    mutationFn: async (sale: {
      customer_name: string;
      customer_phone?: string;
      total_amount: number;
      currency: string;
      seller_id?: string;
      notes?: string;
      items: Omit<SaleItem, "id" | "sale_id" | "created_at">[];
    }) => {
      const { items, ...saleData } = sale;
      const { data, error } = await supabase
        .from("sales")
        .insert({
          ...saleData,
          created_by: user!.id,
          workshop_id: workshopId,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert sale items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(items.map((item) => ({ ...item, sale_id: data.id })));
        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Venta registrada", description: "La venta ha sido registrada correctamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const registerCost = useMutation({
    mutationFn: async ({
      saleId,
      productCost,
      adminNotes,
    }: {
      saleId: string;
      productCost: number;
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase
        .from("sales")
        .update({
          product_cost: productCost,
          admin_notes: adminNotes,
          cost_registered_by: user!.id,
          cost_registered_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", saleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Costo registrado", description: "Las ganancias han sido calculadas" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Venta eliminada", description: "La venta ha sido eliminada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    sales: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    createSale,
    registerCost,
    deleteSale,
    refetch: salesQuery.refetch,
  };
};
