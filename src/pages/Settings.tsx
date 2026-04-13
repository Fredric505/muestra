import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrencySymbol } from "@/lib/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Upload, Save, Building2, Image, CreditCard, CalendarClock, FileText, Eye } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ThemeSelector } from "@/components/ThemeSelector";
import { InvoiceTextCustomizer } from "@/components/settings/InvoiceTextCustomizer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { InvoiceTextOverrides, normalizeInvoiceTextOverrides, resolveInvoiceText } from "@/lib/invoiceTextOverrides";

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
  const [invoiceSize, setInvoiceSize] = useState((brand as any).invoice_size || "commercial");
  const [invoiceTextOverrides, setInvoiceTextOverrides] = useState<InvoiceTextOverrides>(
    normalizeInvoiceTextOverrides((brand as any).invoice_text_overrides)
  );

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
      setInvoiceSize((brand as any).invoice_size || "commercial");
      setInvoiceTextOverrides(normalizeInvoiceTextOverrides((brand as any).invoice_text_overrides));
    }
  }, [brand.business_name, brand.tagline, (brand as any).theme_preset, (brand as any).custom_primary_color, (brand as any).color_mode, (brand as any).invoice_size, (brand as any).invoice_text_overrides]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: t("common.error"), description: t("settings.fileTooLarge"), variant: "destructive" });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => { setLogoPreview(e.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({ title: t("common.error"), description: t("settings.businessNameRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      let logoUrl = brand.logo_url;
      if (logoFile) { logoUrl = await uploadLogo(logoFile); }
      await updateBrand({
        business_name: businessName.trim(),
        tagline: tagline.trim(),
        logo_url: logoUrl,
        theme_preset: themePreset,
        custom_primary_color: customPrimaryColor,
        color_mode: colorMode,
        invoice_size: invoiceSize,
        invoice_text_overrides: invoiceTextOverrides,
      } as any);
      toast({ title: t("settings.settingsSaved"), description: t("settings.settingsSavedDesc") });
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: t("common.error"), description: t("settings.errorSaving"), variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const currentLogo = logoPreview || brand.logo_url || null;
  const currencySymbol = getCurrencySymbol(workshop?.currency);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t("settings.active")}</Badge>;
      case "trial": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("settings.trial")}</Badge>;
      case "expired": return <Badge variant="destructive">{t("settings.expired")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePreviewInvoice = (type: "sale" | "repair" | "ticket") => {
    const name = businessName || brand.business_name || "Mi Taller";
    const tag = tagline || brand.tagline || "";
    const logo = currentLogo;
    const sym = currencySymbol;
    const saleTitle = resolveInvoiceText(invoiceTextOverrides, "sale_invoice_title", t("invoice.invoiceTitle"));
    const repairTitle = resolveInvoiceText(invoiceTextOverrides, "repair_invoice_title", t("invoice.serviceOrder"));
    const ticketTitle = resolveInvoiceText(invoiceTextOverrides, "quick_ticket_title", t("invoice.ticket"));
    const footer = resolveInvoiceText(invoiceTextOverrides, "footer_note", t("invoice.legalNote"));
    const saleWarranty = resolveInvoiceText(invoiceTextOverrides, "sale_warranty_note", t("invoice.warrantyProductNote"));
    const repairWarranty = resolveInvoiceText(invoiceTextOverrides, "repair_warranty_note", t("invoice.warrantyRepairNote"));

    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;

    if (type === "ticket") {
      w.document.write(`<!DOCTYPE html><html><head><title>${t("settings.previewTicket")}</title>
<style>@page{size:80mm auto;margin:2mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;color:#000;padding:8px;width:76mm;font-size:11px}.center{text-align:center}.bold{font-weight:bold}.divider{border-top:1px dashed #000;margin:6px 0}.header{text-align:center;margin-bottom:8px}.header h1{font-size:14px;margin:0}.header p{font-size:10px;color:#444;margin:1px 0}.row{display:flex;justify-content:space-between;padding:2px 0}.item{padding:3px 0;border-bottom:1px dotted #ccc}.total-section{margin-top:8px;padding-top:6px;border-top:2px solid #000}.total{font-size:16px;font-weight:bold;text-align:right}.footer{text-align:center;margin-top:10px;font-size:9px;color:#888}</style></head><body>
<div class="header"><h1>${name}</h1>${tag ? `<p>${tag}</p>` : ''}${workshop?.address ? `<p>${workshop.address}</p>` : ''}${workshop?.phone ? `<p>${t("invoice.tel")}: ${workshop.phone}</p>` : ''}</div>
<div class="divider"></div>
<div class="center" style="margin-bottom:6px"><div class="bold">${ticketTitle} #DEMO0001</div><div style="font-size:10px">${format(new Date(), "dd/MM/yyyy HH:mm", { locale: dateLoc })}</div></div>
<div class="row"><span>${t("invoice.client")}:</span><span class="bold">${t("settings.sampleClient")}</span></div>
<div class="divider"></div>
<div class="item"><div>${t("settings.sampleProduct")}</div><div class="row"><span>2 x ${sym}150.00</span><span class="bold">${sym}300.00</span></div></div>
<div class="total-section"><div class="row total"><span>${t("invoice.total")}:</span><span>${sym}300.00</span></div></div>
<div class="divider"></div>
<div class="footer"><p>${t("invoice.keepTicket")}</p><p>${t("invoice.thankPurchase")}</p><p>${name}</p></div>
</body></html>`);
    } else if (type === "repair") {
      const size = invoiceSize;
      w.document.write(`<!DOCTYPE html><html><head><title>${t("settings.previewRepairInvoice")}</title>
<style>@page{size:${size === 'commercial' ? '220mm 143mm' : 'letter'};margin:${size === 'commercial' ? '8mm' : '15mm'}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:${size === 'commercial' ? '12px' : '30px'};max-width:${size === 'commercial' ? '210mm' : '800px'};margin:0 auto;font-size:${size === 'commercial' ? '10px' : '13px'}}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #222;padding-bottom:12px;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:12px}.header-left img{max-height:50px;border-radius:8px}.header-left h1{font-size:18px}.header-left p{color:#666;font-size:11px;margin:2px 0}.header-right{text-align:right}.inv-num{font-size:15px;font-weight:bold}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.info-box{background:#f7f7f7;padding:10px;border-radius:8px}.info-box p{margin:3px 0}table{width:100%;border-collapse:collapse;margin:12px 0}thead th{background:#333;color:#fff;padding:6px 8px;text-align:left;font-size:10px}thead th:last-child{text-align:right}tbody td{padding:6px 8px;border-bottom:1px solid #e0e0e0}tbody td:last-child{text-align:right;font-weight:600}.totals{display:flex;justify-content:flex-end;margin:10px 0}.totals-box{min-width:200px}.totals-row{display:flex;justify-content:space-between;padding:4px 0}.totals-row.total{border-top:3px solid #222;padding-top:8px;font-size:14px;font-weight:bold}.warranty-box{background:#f0f9f0;border:1px solid #c3e6c3;border-radius:8px;padding:10px;margin:12px 0;text-align:center}.warranty-box strong{color:#2d7a2d}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}.sig-box{text-align:center}.sig-line{border-top:2px solid #222;margin-top:40px;padding-top:8px}.sig-label{font-size:10px;color:#666}.footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#999}</style></head><body>
<div class="header"><div class="header-left">${logo ? `<img src="${logo}" alt="${name}" />` : ''}<div><h1>${name}</h1>${tag ? `<p>${tag}</p>` : ''}${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}</div></div><div class="header-right"><div class="inv-num">${repairTitle}</div><div style="font-size:14px;font-weight:bold;margin:4px 0">#DEMO0001</div><div style="font-size:11px;color:#555">${t("invoice.date")}: ${format(new Date(), "dd/MM/yyyy", { locale: dateLoc })}</div></div></div>
<div class="info-grid"><div class="info-box"><p style="text-transform:uppercase;color:#888;font-size:9px;font-weight:600">${t("invoice.clientData")}</p><p><strong>${t("settings.sampleClient")}</strong></p><p>📞 +505 8888-0000</p></div><div class="info-box"><p style="text-transform:uppercase;color:#888;font-size:9px;font-weight:600">${t("invoice.device")}</p><p><strong>Samsung Galaxy S24</strong></p><p>IMEI: 123456789012345</p></div></div>
<table><thead><tr><th>${t("invoice.concept")}</th><th>${t("invoice.detail")}</th><th>${t("invoice.amount")}</th></tr></thead><tbody><tr><td>${t("invoice.repairService")}</td><td>${t("settings.sampleRepairType")}</td><td>${sym}500.00</td></tr></tbody></table>
<div class="totals"><div class="totals-box"><div class="totals-row"><span>${t("invoice.price")}:</span><span>${sym}500.00</span></div><div class="totals-row"><span>${t("invoice.deposit")}:</span><span>-${sym}200.00</span></div><div class="totals-row total"><span>${t("invoice.toPay")}:</span><span>${sym}300.00</span></div></div></div>
<div class="warranty-box"><strong>${t("invoice.warrantyTitle")}: 30 ${t("invoice.days").toUpperCase()}</strong><br>${repairWarranty}</div>
<div class="signatures"><div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.clientSignature")}</div></div></div><div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.responsibleTech")}</div></div></div></div>
<div class="footer"><p>${name} · ${t("invoice.professionalService")}</p><p>${footer}</p></div>
</body></html>`);
    } else {
      const size = invoiceSize;
      w.document.write(`<!DOCTYPE html><html><head><title>${t("settings.previewInvoice")}</title>
<style>@page{size:${size === 'commercial' ? '220mm 143mm' : 'letter'};margin:${size === 'commercial' ? '8mm' : '15mm'}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:${size === 'commercial' ? '12px' : '30px'};max-width:${size === 'commercial' ? '210mm' : '800px'};margin:0 auto;font-size:${size === 'commercial' ? '10px' : '13px'}}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #222;padding-bottom:12px;margin-bottom:16px}.header-left{display:flex;align-items:center;gap:12px}.header-left img{max-height:50px;border-radius:8px}.header-left h1{font-size:18px}.header-left p{color:#666;font-size:11px;margin:2px 0}.header-right{text-align:right}.inv-num{font-size:15px;font-weight:bold}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.info-box{background:#f7f7f7;padding:10px;border-radius:8px}.info-box p{margin:3px 0}table{width:100%;border-collapse:collapse;margin:12px 0}thead th{background:#333;color:#fff;padding:6px 8px;text-align:left;font-size:10px}thead th:last-child{text-align:right}tbody td{padding:6px 8px;border-bottom:1px solid #e0e0e0}tbody td:last-child{text-align:right;font-weight:600}.totals{display:flex;justify-content:flex-end;margin:10px 0}.totals-box{min-width:200px}.totals-row{display:flex;justify-content:space-between;padding:4px 0}.totals-row.total{border-top:3px solid #222;padding-top:8px;font-size:14px;font-weight:bold}.warranty-box{background:#f0f9f0;border:1px solid #c3e6c3;border-radius:8px;padding:10px;margin:12px 0;text-align:center}.warranty-box strong{color:#2d7a2d}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}.sig-box{text-align:center}.sig-line{border-top:2px solid #222;margin-top:40px;padding-top:8px}.sig-label{font-size:10px;color:#666}.footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#999}</style></head><body>
<div class="header"><div class="header-left">${logo ? `<img src="${logo}" alt="${name}" />` : ''}<div><h1>${name}</h1>${tag ? `<p>${tag}</p>` : ''}${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}</div></div><div class="header-right"><div class="inv-num">${saleTitle}</div><div style="font-size:14px;font-weight:bold;margin:4px 0">#DEMO0001</div><div style="font-size:11px;color:#555">${t("invoice.date")}: ${format(new Date(), "dd/MM/yyyy", { locale: dateLoc })}</div></div></div>
<div class="info-grid"><div class="info-box"><p style="text-transform:uppercase;color:#888;font-size:9px;font-weight:600">${t("invoice.clientData")}</p><p><strong>${t("settings.sampleClient")}</strong></p><p>📞 +505 8888-0000</p></div><div class="info-box"><p style="text-transform:uppercase;color:#888;font-size:9px;font-weight:600">${t("invoice.saleInfo")}</p><p>${t("invoice.date")}: ${format(new Date(), "PPP", { locale: dateLoc })}</p></div></div>
<table><thead><tr><th>#</th><th>${t("invoice.description")}</th><th>${t("invoice.condition")}</th><th>${t("invoice.warranty")}</th><th>${t("invoice.qty")}</th><th>${t("invoice.unitPrice")}</th><th>${t("invoice.subtotal")}</th></tr></thead><tbody><tr><td>1</td><td>iPhone 14 Pro 128GB</td><td>${t("common.used")}</td><td>90 ${t("invoice.days")}</td><td>1</td><td>${sym}8,500.00</td><td>${sym}8,500.00</td></tr></tbody></table>
<div class="totals"><div class="totals-box"><div class="totals-row"><span>${t("invoice.subtotal")}:</span><span>${sym}8,500.00</span></div><div class="totals-row total"><span>${t("invoice.total")}:</span><span>${sym}8,500.00</span></div></div></div>
<div class="warranty-box"><strong>${t("invoice.warrantyTitle")}</strong><br>${saleWarranty}</div>
<div class="signatures"><div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.clientSignature")}</div></div></div><div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.authorizedSignature")}</div></div></div></div>
<div class="footer"><p>${name} · ${t("invoice.thankPurchase")}</p><p>${footer}</p></div>
</body></html>`);
    }
    w.document.close();
    w.focus();
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t("common.loading")}</div></div>);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          {t("settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Subscription Info */}
      {workshop && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />{t("settings.yourPlan")}</CardTitle>
            <CardDescription>{t("settings.planInfo")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1"><p className="text-xs text-muted-foreground">{t("settings.planName")}</p><p className="font-semibold text-foreground">{plan?.name || "—"}</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">{t("settings.planStatus")}</p>{getStatusBadge(workshop.subscription_status)}</div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">{t("settings.maxEmployees")}</p><p className="font-semibold text-foreground">{plan?.max_employees ?? t("settings.unlimited")}</p></div>
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
        themePreset={themePreset} customPrimaryColor={customPrimaryColor} colorMode={colorMode}
        onThemePresetChange={setThemePreset} onCustomColorChange={setCustomPrimaryColor} onColorModeChange={setColorMode}
      />

      {/* Invoice Size Selector */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{t("settings.invoiceSize")}</CardTitle>
          <CardDescription>{t("settings.invoiceSizeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={invoiceSize} onValueChange={setInvoiceSize} className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "commercial", label: t("settings.sizeCommercial"), desc: t("settings.sizeCommercialDesc") },
              { value: "letter", label: t("settings.sizeLetter"), desc: t("settings.sizeLetterDesc") },
              { value: "ticket", label: t("settings.sizeTicket"), desc: t("settings.sizeTicketDesc") },
            ].map((opt) => (
              <Label key={opt.value} htmlFor={`size-${opt.value}`}
                className={cn("flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  invoiceSize === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                )}>
                <RadioGroupItem value={opt.value} id={`size-${opt.value}`} className="mt-0.5" />
                <div><div className="font-medium text-foreground">{opt.label}</div><div className="text-xs text-muted-foreground">{opt.desc}</div></div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Invoice Text Customizer */}
      <InvoiceTextCustomizer value={invoiceTextOverrides} onChange={setInvoiceTextOverrides} />

      {/* Invoice Preview Buttons */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />{t("settings.invoicePreview")}</CardTitle>
          <CardDescription>{t("settings.invoicePreviewDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" onClick={() => handlePreviewInvoice("sale")} className="h-auto py-3 flex flex-col items-center gap-1">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{t("settings.previewInvoice")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.saleInvoicePreviewDesc")}</span>
            </Button>
            <Button variant="outline" onClick={() => handlePreviewInvoice("repair")} className="h-auto py-3 flex flex-col items-center gap-1">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{t("settings.previewRepairInvoice")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.repairInvoicePreviewDesc")}</span>
            </Button>
            <Button variant="outline" onClick={() => handlePreviewInvoice("ticket")} className="h-auto py-3 flex flex-col items-center gap-1">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{t("settings.previewTicket")}</span>
              <span className="text-xs text-muted-foreground">{t("settings.ticketPreviewDesc")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Identity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{t("settings.businessIdentity")}</CardTitle>
            <CardDescription>{t("settings.businessIdentityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="business-name">{t("settings.businessName")}</Label><Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Mi Taller Técnico" /></div>
            <div className="space-y-2"><Label htmlFor="tagline">{t("settings.tagline")}</Label><Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ej: Servicio técnico profesional" /><p className="text-xs text-muted-foreground">{t("settings.taglineHint")}</p></div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" />{t("settings.logo")}</CardTitle>
            <CardDescription>{t("settings.logoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-xl">
                {currentLogo ? <AvatarImage src={currentLogo} alt="Logo" className="object-cover" /> : null}
                <AvatarFallback className="rounded-xl text-2xl bg-primary/20 text-primary">{(businessName || "T").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />{t("settings.uploadLogo")}</Button>
                {logoPreview && <p className="text-xs text-success">{t("settings.newImageSelected")}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.logoFormats")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="glass-card">
        <CardHeader><CardTitle>{t("settings.preview")}</CardTitle><CardDescription>{t("settings.previewDesc")}</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-sidebar rounded-lg">
            {currentLogo ? (
              <img src={currentLogo} alt="Logo preview" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center"><span className="text-lg font-bold text-primary">{(businessName || "T").charAt(0).toUpperCase()}</span></div>
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
        <Button onClick={handleSave} disabled={isSaving} size="lg"><Save className="h-4 w-4 mr-2" />{isSaving ? t("common.saving") : t("settings.saveChanges")}</Button>
      </div>
    </div>
  );
};

export default Settings;
