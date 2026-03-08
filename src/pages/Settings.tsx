import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Upload, Save, Building2, Image, CreditCard, CalendarClock } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { brand, updateBrand, uploadLogo, isLoading } = useBrand();
  const { workshop } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [businessName, setBusinessName] = useState(brand.business_name);
  const [tagline, setTagline] = useState(brand.tagline);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [themePreset, setThemePreset] = useState((brand as any).theme_preset || "green");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string | null>((brand as any).custom_primary_color || null);
  const [colorMode, setColorMode] = useState<"dark" | "light">(((brand as any).color_mode === "light") ? "light" : "dark");

  const { data: plan } = useQuery({
    queryKey: ["workshop-plan", workshop?.plan_id],
    queryFn: async () => {
      if (!workshop?.plan_id) return null;
      const { data, error } = await supabase
        .from("plans")
        .select("name, monthly_price, annual_price, currency, max_employees")
        .eq("id", workshop.plan_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workshop?.plan_id,
  });

  useEffect(() => {
    if (brand) {
      setBusinessName(brand.business_name);
      setTagline(brand.tagline);
      setThemePreset((brand as any).theme_preset || "green");
      setCustomPrimaryColor((brand as any).custom_primary_color || null);
      setColorMode(((brand as any).color_mode === "light") ? "light" : "dark");
    }
  }, [brand.business_name, brand.tagline, (brand as any).theme_preset, (brand as any).custom_primary_color, (brand as any).color_mode]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: t("common.error"),
          description: t("settings.fileTooLarge"),
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
        title: t("common.error"),
        description: t("settings.businessNameRequired"),
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
        theme_preset: themePreset,
        custom_primary_color: customPrimaryColor,
        color_mode: colorMode,
      } as any);
      
      toast({
        title: t("settings.settingsSaved"),
        description: t("settings.settingsSavedDesc"),
      });
      
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("common.error"),
        description: t("settings.errorSaving"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogo = logoPreview || brand.logo_url || null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("settings.active")}</Badge>;
      case "trial":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("settings.trial")}</Badge>;
      case "expired":
        return <Badge variant="destructive">{t("settings.expired")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Subscription Info */}
      {workshop && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("settings.yourPlan")}
            </CardTitle>
            <CardDescription>
              {t("settings.planInfo")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("settings.planName")}</p>
                <p className="font-semibold text-foreground">{plan?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("settings.planStatus")}</p>
                {getStatusBadge(workshop.subscription_status)}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("settings.maxEmployees")}</p>
                <p className="font-semibold text-foreground">{plan?.max_employees ?? t("settings.unlimited")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {workshop.trial_ends_at ? t("settings.trialExpires") : t("settings.subscriptionExpires")}
                </p>
                <p className="font-semibold text-foreground">
                  {workshop.trial_ends_at
                    ? format(new Date(workshop.trial_ends_at), "dd MMM yyyy", { locale: dateLoc })
                    : workshop.subscription_ends_at
                    ? format(new Date(workshop.subscription_ends_at), "dd MMM yyyy", { locale: dateLoc })
                    : t("settings.noExpDate")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme Selector */}
      <ThemeSelector
        themePreset={themePreset}
        customPrimaryColor={customPrimaryColor}
        colorMode={colorMode}
        onThemePresetChange={setThemePreset}
        onCustomColorChange={setCustomPrimaryColor}
        onColorModeChange={setColorMode}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Identity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {t("settings.businessIdentity")}
            </CardTitle>
            <CardDescription>
              {t("settings.businessIdentityDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">{t("settings.businessName")}</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Mi Taller Técnico"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">{t("settings.tagline")}</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Ej: Servicio técnico profesional"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.taglineHint")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              {t("settings.logo")}
            </CardTitle>
            <CardDescription>
              {t("settings.logoDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-xl">
                {currentLogo ? (
                  <AvatarImage src={currentLogo} alt="Logo" className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-xl text-2xl bg-primary/20 text-primary">
                  {(businessName || "T").charAt(0).toUpperCase()}
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
                  {t("settings.uploadLogo")}
                </Button>
                {logoPreview && (
                  <p className="text-xs text-success">{t("settings.newImageSelected")}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.logoFormats")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("settings.preview")}</CardTitle>
          <CardDescription>
            {t("settings.previewDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-sidebar rounded-lg">
            {currentLogo ? (
              <img src={currentLogo} alt="Logo preview" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{(businessName || "T").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-sidebar-foreground">{businessName || t("settings.businessName")}</h3>
              <p className="text-xs text-muted-foreground">{tagline || t("settings.tagline")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? t("common.saving") : t("settings.saveChanges")}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
