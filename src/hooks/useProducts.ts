import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

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
  images?: ProductImage[];
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

      // Fetch images for all products
      const productIds = (data || []).map(p => p.id);
      let images: ProductImage[] = [];
      if (productIds.length > 0) {
        const { data: imgData } = await supabase
          .from("product_images")
          .select("*")
          .in("product_id", productIds)
          .order("display_order", { ascending: true });
        images = (imgData || []) as ProductImage[];
      }

      return (data || []).map(p => ({
        ...p,
        images: images.filter(i => i.product_id === p.id),
      })) as Product[];
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at" | "workshop_id" | "images">) => {
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
      const { images, ...dbUpdates } = updates as any;
      const { data, error } = await supabase
        .from("products")
        .update(dbUpdates)
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
      const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto eliminado", description: "El producto ha sido eliminado del inventario" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addProductImages = async (productId: string, files: File[]) => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `products/${productId}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from("device-photos").upload(path, file, { upsert: true });
      if (error) { console.error("Upload error:", error); continue; }
      const { data } = supabase.storage.from("device-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    if (urls.length > 0) {
      // Get current max order
      const { data: existing } = await supabase
        .from("product_images")
        .select("display_order")
        .eq("product_id", productId)
        .order("display_order", { ascending: false })
        .limit(1);
      const startOrder = (existing && existing.length > 0 ? (existing[0] as any).display_order : -1) + 1;

      const rows = urls.map((url, i) => ({
        product_id: productId,
        image_url: url,
        display_order: startOrder + i,
      }));
      const { error } = await supabase.from("product_images").insert(rows);
      if (error) console.error("Insert images error:", error);
    }

    queryClient.invalidateQueries({ queryKey: ["products"] });
    return urls;
  };

  const deleteProductImage = async (imageId: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", imageId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductImages,
    deleteProductImage,
    refetch: productsQuery.refetch,
  };
};
