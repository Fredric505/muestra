import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface BrandSettings {
  id: string;
  business_name: string;
  tagline: string;
  logo_url: string | null;
}

interface BrandContextType {
  brand: BrandSettings;
  isLoading: boolean;
  updateBrand: (updates: Partial<BrandSettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
  defaultLogoUrl: string;
}

const defaultBrand: BrandSettings = {
  id: "",
  business_name: "",
  tagline: "",
  logo_url: null,
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};

// Import the default logo
import defaultLogo from "@/assets/wentech-logo.jpg";

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { workshopId } = useAuth();
  
  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-settings", workshopId],
    queryFn: async () => {
      if (!workshopId) return defaultBrand;
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .eq("workshop_id", workshopId)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching brand settings:", error);
        return defaultBrand;
      }
      
      return (data as BrandSettings) || defaultBrand;
    },
    staleTime: 0,
    enabled: !!workshopId,
  });

  const updateBrand = async (updates: Partial<BrandSettings>) => {
    if (!workshopId) return;

    // Optimistic update
    queryClient.setQueryData(["brand-settings", workshopId], (old: BrandSettings | undefined) => {
      if (!old) return { ...defaultBrand, ...updates };
      return { ...old, ...updates };
    });

    try {
      if (brand?.id) {
        // Update existing record
        const { error } = await supabase
          .from("brand_settings")
          .update(updates)
          .eq("id", brand.id);
        if (error) throw error;
      } else {
        // Create new record for this workshop
        const { error } = await supabase
          .from("brand_settings")
          .insert({
            workshop_id: workshopId,
            business_name: updates.business_name || "Mi Taller",
            tagline: updates.tagline || "",
            logo_url: updates.logo_url || null,
          });
        if (error) throw error;
      }
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["brand-settings", workshopId] });
      throw error;
    }

    // Refetch to confirm the server state
    await queryClient.invalidateQueries({ queryKey: ["brand-settings", workshopId] });
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  // Set document title based on brand
  useEffect(() => {
    if (brand?.business_name) {
      document.title = `${brand.business_name} | Servicio Técnico`;
    }
  }, [brand?.business_name]);

  // Don't block rendering – allow children to render while brand loads

  return (
    <BrandContext.Provider
      value={{
        brand: brand || defaultBrand,
        isLoading,
        updateBrand,
        uploadLogo,
        defaultLogoUrl: defaultLogo,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};
