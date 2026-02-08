import { useState, useRef } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings as SettingsIcon, Upload, Save, Building2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { brand, updateBrand, uploadLogo, defaultLogoUrl, isLoading } = useBrand();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [businessName, setBusinessName] = useState(brand.business_name);
  const [tagline, setTagline] = useState(brand.tagline);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update state when brand data loads
  useState(() => {
    if (brand) {
      setBusinessName(brand.business_name);
      setTagline(brand.tagline);
    }
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El logo debe ser menor a 2MB",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del negocio es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let logoUrl = brand.logo_url;
      
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      await updateBrand({
        business_name: businessName.trim(),
        tagline: tagline.trim(),
        logo_url: logoUrl,
      });
      
      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicarán en toda la aplicación",
      });
      
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogo = logoPreview || brand.logo_url || defaultLogoUrl;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground">
          Personaliza el nombre y logo de tu negocio
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Identity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Identidad del Negocio
            </CardTitle>
            <CardDescription>
              Estos datos aparecerán en toda la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Nombre del Negocio</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Mi Taller Técnico"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Eslogan / Identificador</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Ej: Servicio técnico profesional"
              />
              <p className="text-xs text-muted-foreground">
                Aparece en etiquetas impresas y mensajes de WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Logo
            </CardTitle>
            <CardDescription>
              Sube el logo de tu negocio (máx. 2MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-xl">
                <AvatarImage src={currentLogo} alt="Logo" className="object-cover" />
                <AvatarFallback className="rounded-xl text-2xl">
                  {businessName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Logo
                </Button>
                {logoPreview && (
                  <p className="text-xs text-success">Nueva imagen seleccionada</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos: JPG, PNG, WEBP. Recomendado: imagen cuadrada.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
          <CardDescription>
            Así se verá tu marca en la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-sidebar rounded-lg">
            <img
              src={currentLogo}
              alt="Logo preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-bold text-sidebar-foreground">{businessName || "Nombre del Negocio"}</h3>
              <p className="text-xs text-muted-foreground">{tagline || "Eslogan"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
