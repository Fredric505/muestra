import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  workshop_id: string | null;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  photo_url: string | null;
  warranty_days: number;
  notes: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const { user, workshopId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at" | "workshop_id">) => {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, workshop_id: workshopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto creado", description: "El producto ha sido registrado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto actualizado", description: "Los cambios han sido guardados" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto eliminado", description: "El producto ha sido eliminado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: productsQuery.refetch,
  };
};
