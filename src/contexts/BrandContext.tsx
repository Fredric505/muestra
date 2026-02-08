import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  business_name: "WEN-TECH",
  tagline: "Nicaragua Unlock 505",
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
  
  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error fetching brand settings:", error);
        return defaultBrand;
      }
      
      return data as BrandSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateBrand = async (updates: Partial<BrandSettings>) => {
    if (!brand?.id) return;
    
    const { error } = await supabase
      .from("brand_settings")
      .update(updates)
      .eq("id", brand.id);
    
    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
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
