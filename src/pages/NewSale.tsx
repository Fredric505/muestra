import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSales, SaleItem } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, User, Phone, ShoppingBag, Plus, Trash2, Camera, ImageIcon, Printer, Save, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Currency = "NIO" | "USD";
const currencySymbols: Record<Currency, string> = { NIO: "C$", USD: "$" };

interface SaleItemForm {
  product_id: string; product_name: string; quantity: number; unit_price: number;
  condition: string; warranty_days: number; condition_notes: string;
  photo_file: File | null; photo_preview: string | null;
}

const NewSale = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createSale } = useSales();
  const { products, updateProduct } = useProducts();
  const { employees } = useEmployees();
  const { user, isAdmin, workshop } = useAuth();
  const { brand } = useBrand();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [currency, setCurrency] = useState<Currency>("NIO");
  const [sellerId, setSellerId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedSale, setSavedSale] = useState<any>(null);

  const sellers = employees.filter(e => e.is_active && e.employee_type === "seller");

  const [items, setItems] = useState<SaleItemForm[]>([{
    product_id: "", product_name: "", quantity: 1, unit_price: 0,
    condition: "nuevo", warranty_days: 0, condition_notes: "", photo_file: null, photo_preview: null,
  }]);

  const symbol = currencySymbols[currency];
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const addItem = () => {
    setItems([...items, { product_id: "", product_name: "", quantity: 1, unit_price: 0, condition: "nuevo", warranty_days: 0, condition_notes: "", photo_file: null, photo_preview: null }]);
  };
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: keyof SaleItemForm, value: any) => { const updated = [...items]; (updated[idx] as any)[field] = value; setItems(updated); };

  const selectProduct = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updated = [...items];
      updated[idx] = { ...updated[idx], product_id: productId, product_name: product.name, unit_price: product.selling_price, condition: product.condition, warranty_days: product.warranty_days, photo_preview: product.photo_url };
      setItems(updated);
    }
  };

  const handlePhotoChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: t("common.error"), description: "Max 5MB", variant: "destructive" }); return; }
      updateItem(idx, "photo_file", file);
      const reader = new FileReader();
      reader.onload = (ev) => updateItem(idx, "photo_preview", ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadItemPhoto = async (saleId: string, idx: number, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `sales/${saleId}_${idx}.${ext}`;
    const { error } = await supabase.storage.from("device-photos").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("device-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.product_name || i.unit_price <= 0)) {
      toast({ title: t("common.error"), description: t("common.required"), variant: "destructive" }); return;
    }
    setIsSubmitting(true);
    try {
      const saleItems: Omit<SaleItem, "id" | "sale_id" | "created_at">[] = items.map(i => ({
        product_id: i.product_id || null, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price,
        condition: i.condition, warranty_days: i.warranty_days, condition_notes: i.condition_notes || null, device_photo_url: null,
      }));
      const result = await createSale.mutateAsync({
        customer_name: customerName || "Cliente General", customer_phone: customerPhone || undefined,
        total_amount: total, currency, seller_id: sellerId || undefined, notes: notes || undefined, items: saleItems,
      });
      for (let i = 0; i < items.length; i++) {
        if (items[i].photo_file) {
          const photoUrl = await uploadItemPhoto(result.id, i, items[i].photo_file!);
          if (photoUrl) {
            const { data: saleItemsData } = await supabase.from("sale_items").select("id").eq("sale_id", result.id).order("created_at");
            if (saleItemsData && saleItemsData[i]) { await supabase.from("sale_items").update({ device_photo_url: photoUrl }).eq("id", saleItemsData[i].id); }
          }
        }
      }
      for (const item of items) {
        if (item.product_id) {
          const product = products.find(p => p.id === item.product_id);
          if (product) { await updateProduct.mutateAsync({ id: product.id, stock: Math.max(0, product.stock - item.quantity) }); }
        }
      }
      setSavedSale({ ...result, items, customerName, customerPhone, currency, total });
      setShowPrintDialog(true);
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  const handlePrintInvoice = () => {
    if (!savedSale) return;
    const { printLetterInvoice, printTicketInvoice } = require("@/lib/invoiceUtils");
    const dateLoc = require("@/lib/dateLocale").getDateLocale(i18n.language);
    const saleForPrint = {
      id: savedSale.id, customer_name: savedSale.customerName, customer_phone: savedSale.customerPhone,
      sale_date: new Date().toISOString(), total_amount: savedSale.total, currency,
      sale_items: savedSale.items.map((i: SaleItemForm) => ({
        product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price,
        condition: i.condition, warranty_days: i.warranty_days, condition_notes: i.condition_notes, device_photo_url: i.photo_preview,
      })),
    };
    const hasDevices = savedSale.items.some((i: SaleItemForm) => i.condition === "usado" || i.warranty_days > 30);
    if (hasDevices) { printLetterInvoice(saleForPrint, brand, workshop, t, dateLoc); } else { printTicketInvoice(saleForPrint, brand, workshop, t, dateLoc); }
  };

  const availableProducts = products.filter(p => p.is_active && p.stock > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("newSale.title")}</h1>
          <p className="text-muted-foreground">{t("newSale.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t("newSale.customer")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("newSale.customerNameOptional")}</Label>
              <Input placeholder="Juan Pérez" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="+505 1234 5678" className="pl-10" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />{t("newSale.saleDetails")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isAdmin && (
              <div className="space-y-2">
                <Label>{t("salesPage.seller")}</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger><SelectValue placeholder={t("newSale.selectSeller")} /></SelectTrigger>
                  <SelectContent>
                    {sellers.map(emp => (<SelectItem key={emp.id} value={emp.id}>{emp.profiles?.full_name || "—"}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("common.currency")}</Label>
              <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                <SelectTrigger><Coins className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIO">C$ Córdobas</SelectItem>
                  <SelectItem value="USD">$ Dólares</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />{t("newSale.products")}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />{t("newSale.addProduct")}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t("newSale.product")} {idx + 1}</span>
                  {items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("newSale.inventoryProduct")}</Label>
                    <Select value={item.product_id} onValueChange={v => selectProduct(idx, v)}>
                      <SelectTrigger><SelectValue placeholder={t("newSale.selectOrManual")} /></SelectTrigger>
                      <SelectContent>
                        {availableProducts.map(p => (<SelectItem key={p.id} value={p.id}>{p.name} ({t("newSale.availableQty", { qty: p.stock })})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("newSale.productName")} *</Label>
                    <Input placeholder="iPhone 14 Pro" value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("newSale.unitPrice")} *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
                      <Input type="number" step="0.01" className="pl-10" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common.quantity")}</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("newSale.conditionLabel")}</Label>
                    <Select value={item.condition} onValueChange={v => updateItem(idx, "condition", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">{t("common.new")}</SelectItem>
                        <SelectItem value="usado">{t("common.used")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("newSale.warrantyDays")}</Label>
                    <Input type="number" value={item.warranty_days} onChange={e => updateItem(idx, "warranty_days", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("newSale.equipmentDetails")}</Label>
                  <Textarea placeholder={t("newSale.equipmentDetailsPlaceholder")} value={item.condition_notes} onChange={e => updateItem(idx, "condition_notes", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("newSale.equipmentPhoto")}</Label>
                  <div className="flex items-start gap-4">
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      {item.photo_preview ? (
                        <img src={item.photo_preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      ) : (<><ImageIcon className="h-6 w-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">{t("newRepair.uploadPhoto")}</span></>)}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoChange(idx, e)} />
                    </label>
                    {item.photo_preview && <Button type="button" variant="outline" size="sm" onClick={() => { updateItem(idx, "photo_file", null); updateItem(idx, "photo_preview", null); }}>{t("common.remove")}</Button>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>{t("newSale.saleNotes")}</Label>
              <Textarea placeholder={t("newSale.additionalNotes")} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">{t("common.total")}:</span>
              <span className="text-2xl font-bold text-primary">{symbol}{total.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              <Save className="h-5 w-5 mr-2" />
              {isSubmitting ? t("common.saving") : t("newSale.registerSale")}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("newSale.saleRegistered")}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{t("newSale.whatToDo")}</p>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handlePrintInvoice}><Printer className="h-4 w-4 mr-2" />{t("newSale.printInvoice")}</Button>
            <Button variant="outline" onClick={() => { setShowPrintDialog(false); navigate("/panel/sales"); }}>{t("newSale.goToSales")}</Button>
            <Button variant="ghost" onClick={() => { setShowPrintDialog(false); navigate("/panel/sales/new"); window.location.reload(); }}>{t("newSale.anotherSale")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale;
