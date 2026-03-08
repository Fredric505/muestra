import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRepairs, Currency } from "@/hooks/useRepairs";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Smartphone, User, Phone, Calendar, Clock, DollarSign, FileText, Wrench, Save, ArrowLeft, Package, Coins, Shield, Printer, Tag, Camera, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RepairLabel } from "@/components/RepairLabel";

const currencySymbols: Record<Currency, string> = { NIO: "C$", USD: "$" };

const NewRepair = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { repairTypes, createRepair } = useRepairs();
  const { brand } = useBrand();
  const { workshop } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [partsCost, setPartsCost] = useState(0);
  const [currency, setCurrency] = useState<Currency>("NIO");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedRepair, setSavedRepair] = useState<any>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [devicePhotoReceived, setDevicePhotoReceived] = useState<File | null>(null);
  const [devicePhotoPreview, setDevicePhotoPreview] = useState<string | null>(null);

  const netProfit = estimatedPrice - partsCost;
  const symbol = currencySymbols[currency];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: t("common.error"), description: "Max 5MB", variant: "destructive" }); return; }
      setDevicePhotoReceived(file);
      const reader = new FileReader();
      reader.onload = (ev) => setDevicePhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadDevicePhoto = async (repairId: string): Promise<string | null> => {
    if (!devicePhotoReceived) return null;
    const ext = devicePhotoReceived.name.split(".").pop();
    const path = `received/${repairId}.${ext}`;
    const { error } = await supabase.storage.from("device-photos").upload(path, devicePhotoReceived, { upsert: true });
    if (error) { console.error("Photo upload error:", error); return null; }
    const { data } = supabase.storage.from("device-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const repair = {
      customer_name: formData.get("customer_name") as string,
      customer_phone: formData.get("customer_phone") as string,
      device_brand: formData.get("device_brand") as string,
      device_model: formData.get("device_model") as string,
      device_imei: formData.get("device_imei") as string || undefined,
      repair_type_id: formData.get("repair_type_id") as string || undefined,
      repair_description: formData.get("repair_description") as string || undefined,
      technical_notes: formData.get("technical_notes") as string || undefined,
      estimated_price: parseFloat(formData.get("estimated_price") as string) || 0,
      parts_cost: parseFloat(formData.get("parts_cost") as string) || 0,
      deposit: parseFloat(formData.get("deposit") as string) || 0,
      delivery_date: formData.get("delivery_date") as string || undefined,
      delivery_time: formData.get("delivery_time") as string || undefined,
      warranty_days: warrantyDays, currency, status: "received" as const,
    };
    try {
      const result = await createRepair.mutateAsync(repair);
      const photoUrl = await uploadDevicePhoto(result.id);
      if (photoUrl) { await supabase.from("repairs").update({ device_photo_received: photoUrl }).eq("id", result.id); }
      setSavedRepair({ ...repair, id: result.id, created_at: result.created_at });
      setShowPrintDialog(true);
    } catch (error) { console.error(error); setIsSubmitting(false); }
  };

  const handlePrint = () => {
    if (ticketRef.current) {
      const printContent = ticketRef.current.innerHTML;
      const printWindow = window.open('', '_blank', 'width=300,height=400');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${brand.business_name}</title>
          <style>@page { size: 40mm 25mm; margin: 0; } @media print { body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } } body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 7px; line-height: 1.2; background: white; color: black; } img { max-width: 8mm; height: auto; }</style>
          </head><body>${printContent}</body></html>`);
        printWindow.document.close(); printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
      }
    }
  };

  const handlePrintInvoice = () => {
    if (!savedRepair) return;
    const repairSymbol = currencySymbols[savedRepair.currency as Currency] || "C$";
    const price = savedRepair.estimated_price || 0;
    const deposit = savedRepair.deposit || 0;
    const remaining = price - deposit;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${t("repairs.repairInvoice")} - ${brand.business_name}</title>
        <style>
          @media print { body { margin: 0; } }
          body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; } .header p { margin: 4px 0; color: #666; font-size: 13px; }
          .header img { max-height: 60px; margin: 0 auto 10px; display: block; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f9f9f9; padding: 12px; border-radius: 6px; }
          .info-box h3 { margin: 0 0 8px 0; font-size: 13px; color: #666; text-transform: uppercase; }
          .info-box p { margin: 3px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f0f0f0; font-size: 13px; }
          .totals { text-align: right; margin-top: 20px; } .totals p { margin: 5px 0; font-size: 14px; }
          .totals .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
        </style></head><body>
        <div class="header">
          ${workshop?.logo_url ? `<img src="${workshop.logo_url}" alt="${brand.business_name}" />` : ''}
          <h1>${brand.business_name}</h1>
          ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
          ${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}
          ${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}
          ${workshop?.whatsapp ? `<p>WhatsApp: ${workshop.whatsapp}</p>` : ''}
          <p>${t("repairs.repairInvoice")}</p>
        </div>
        <div class="info-grid">
          <div class="info-box"><h3>${t("invoice.client")}</h3><p><strong>${savedRepair.customer_name}</strong></p><p>${savedRepair.customer_phone}</p></div>
          <div class="info-box"><h3>${t("invoice.details")}</h3><p>${t("invoice.date")}: ${new Date(savedRepair.created_at).toLocaleDateString()}</p><p>ID: ${savedRepair.id.slice(0, 8).toUpperCase()}</p>${savedRepair.warranty_days ? `<p>${t("invoice.warranty")}: ${savedRepair.warranty_days} ${t("common.days")}</p>` : ''}</div>
        </div>
        <table><thead><tr><th>${t("invoice.description")}</th><th>${t("invoice.device")}</th><th style="text-align:right">${t("common.price")}</th></tr></thead>
        <tbody><tr><td>${savedRepair.repair_description || t("historyPage.repair")}</td><td>${savedRepair.device_brand} ${savedRepair.device_model}</td><td style="text-align:right">${repairSymbol}${price.toFixed(2)}</td></tr></tbody></table>
        <div class="totals">
          ${deposit > 0 ? `<p>${t("invoice.deposit")}: ${repairSymbol}${deposit.toFixed(2)}</p>` : ''}
          ${deposit > 0 ? `<p>${t("invoice.remaining")}: ${repairSymbol}${remaining.toFixed(2)}</p>` : ''}
          <p class="total">${t("common.total")}: ${repairSymbol}${price.toFixed(2)}</p>
        </div>
        <div class="footer"><p>${t("invoice.thankYou")} · ${brand.business_name}</p><p>${t("invoice.keepInvoice")}</p></div>
        </body></html>`);
      printWindow.document.close(); printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
  };

  const handleCloseAndNavigate = () => { setShowPrintDialog(false); navigate("/repairs"); };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("newRepair.title")}</h1>
          <p className="text-muted-foreground">{t("newRepair.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t("newRepair.customerInfo")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">{t("newRepair.customerName")} *</Label>
              <Input id="customer_name" name="customer_name" placeholder="Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">{t("newRepair.customerPhone")} *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="customer_phone" name="customer_phone" placeholder="+505 1234 5678" className="pl-10" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />{t("newRepair.deviceInfo")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="device_brand">{t("newRepair.brand")} *</Label><Input id="device_brand" name="device_brand" placeholder="Samsung, Apple, Xiaomi..." required /></div>
            <div className="space-y-2"><Label htmlFor="device_model">{t("newRepair.model")} *</Label><Input id="device_model" name="device_model" placeholder="Galaxy S21, iPhone 13..." required /></div>
            <div className="space-y-2"><Label htmlFor="device_imei">{t("newRepair.imei")}</Label><Input id="device_imei" name="device_imei" placeholder="123456789012345" /></div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />{t("newRepair.devicePhoto")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{t("newRepair.devicePhotoDesc")}</p>
            <div className="flex items-start gap-4">
              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                {devicePhotoPreview ? (<img src={devicePhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />) : (<><ImageIcon className="h-8 w-8 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">{t("newRepair.uploadPhoto")}</span></>)}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </label>
              {devicePhotoPreview && (<Button type="button" variant="outline" size="sm" onClick={() => { setDevicePhotoReceived(null); setDevicePhotoPreview(null); }}>{t("newRepair.removePhoto")}</Button>)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{t("newRepair.repairDetails")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="repair_type_id">{t("newRepair.repairType")}</Label>
                <Select name="repair_type_id"><SelectTrigger><SelectValue placeholder={t("newRepair.selectType")} /></SelectTrigger>
                  <SelectContent>{repairTypes.map((type) => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("common.currency")} *</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger><Coins className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NIO">C$ Córdobas</SelectItem><SelectItem value="USD">$ Dólares</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_price">{t("newRepair.estimatedPrice")} *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
                  <Input id="estimated_price" name="estimated_price" type="number" step="0.01" min="0" placeholder="0.00" className="pl-10" required onChange={(e) => setEstimatedPrice(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="parts_cost">{t("newRepair.partsCost")}</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="parts_cost" name="parts_cost" type="number" step="0.01" min="0" placeholder="0.00" className="pl-10" onChange={(e) => setPartsCost(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("newRepair.netProfit")}</Label>
                <div className={`p-3 rounded-lg border ${netProfit >= 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  <span className="text-lg font-bold">{symbol}{netProfit.toFixed(2)}</span>
                  <span className="text-sm ml-2 opacity-70">({t("common.price")}: {symbol}{estimatedPrice.toFixed(2)} - {t("newRepair.partsCost")}: {symbol}{partsCost.toFixed(2)})</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair_description">{t("newRepair.repairDescription")}</Label>
              <Textarea id="repair_description" name="repair_description" placeholder="..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technical_notes">{t("newRepair.technicalNotes")}</Label>
              <Textarea id="technical_notes" name="technical_notes" placeholder="..." rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />{t("newRepair.deliveryDate")}, {t("newRepair.deposit")} & {t("common.warranty")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label htmlFor="delivery_date">{t("newRepair.deliveryDate")}</Label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="delivery_date" name="delivery_date" type="date" className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="delivery_time">{t("newRepair.deliveryTime")}</Label><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="delivery_time" name="delivery_time" type="time" className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="deposit">{t("newRepair.deposit")}</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span><Input id="deposit" name="deposit" type="number" step="0.01" min="0" placeholder="0.00" className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="warranty_days">{t("newRepair.warrantyDays")}</Label><div className="relative"><Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="warranty_days" name="warranty_days" type="number" min="0" value={warrantyDays} onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 0)} className="pl-10" /></div></div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={isSubmitting}><Save className="h-4 w-4 mr-2" />{isSubmitting ? t("common.saving") : t("newRepair.saveRepair")}</Button>
        </div>
      </form>

      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />{t("newRepair.repairSaved")}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm mb-4">{t("newSale.whatToDo")}</p>
            {savedRepair && (
              <div className="border rounded-lg overflow-hidden bg-white p-2 flex justify-center">
                <RepairLabel ref={ticketRef} repair={savedRepair} businessName={brand.business_name} tagline={brand.tagline} logoUrl={brand.logo_url || ""} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handlePrintInvoice} variant="outline" className="w-full"><FileText className="h-4 w-4 mr-2" />{t("newRepair.printInvoice")}</Button>
            <Button onClick={handlePrint} className="w-full"><Printer className="h-4 w-4 mr-2" />{t("newRepair.printLabel")}</Button>
            <Button variant="ghost" onClick={handleCloseAndNavigate} className="w-full">{t("common.close")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewRepair;
