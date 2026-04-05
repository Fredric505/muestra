import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { getCurrencySymbol } from "@/lib/currency";
import { useSales } from "@/hooks/useSales";
import { useProducts, Product } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus, ShoppingCart, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printTicketInvoice } from "@/lib/invoiceUtils";
import { getDateLocale } from "@/lib/dateLocale";

interface CartItem {
  product: Product;
  quantity: number;
}

interface QuickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProduct?: Product | null;
}

const QuickSaleDialog = ({ open, onOpenChange, initialProduct }: QuickSaleDialogProps) => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { user, workshop, workshopId } = useAuth();
  const { brand } = useBrand();
  const { createSale } = useSales();
  const { updateProduct, products } = useProducts();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialProduct) {
      setCart([{ product: initialProduct, quantity: 1 }]);
    } else if (!open) {
      setCart([]);
    }
  }, [open, initialProduct]);

  const currencySymbol = getCurrencySymbol(workshop?.currency);
  const total = cart.reduce((s, item) => s + item.product.selling_price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: t("quickSale.noStock"), description: t("quickSale.noMoreUnits"), variant: "destructive" });
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock) {
        toast({ title: t("quickSale.noStock"), description: t("quickSale.noMoreUnits"), variant: "destructive" });
        return c;
      }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      for (const c of cart) {
        const currentProduct = products.find(p => p.id === c.product.id);
        if (currentProduct) {
          const newStock = Math.max(0, currentProduct.stock - c.quantity);
          await updateProduct.mutateAsync({ id: c.product.id, stock: newStock });
        }
      }

      const items = cart.map(c => ({
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.selling_price,
        condition: c.product.condition,
        warranty_days: c.product.warranty_days,
        condition_notes: null,
        device_photo_url: null,
      }));

      const generalCustomer = t("quickSale.generalCustomer");

      const result = await createSale.mutateAsync({
        customer_name: generalCustomer,
        total_amount: total,
        currency: workshop?.currency || "NIO",
        items,
      });

      const saleForPrint = {
        id: result.id,
        customer_name: generalCustomer,
        customer_phone: null,
        sale_date: new Date().toISOString(),
        total_amount: total,
        currency: workshop?.currency || "NIO",
        sale_items: items.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          condition: i.condition,
          warranty_days: i.warranty_days,
          condition_notes: null,
          device_photo_url: null,
        })),
      };
      printTicketInvoice(saleForPrint, brand, workshop, t, dateLoc, (brand as any).invoice_text_overrides);

      toast({ title: t("quickSale.saleRegistered"), description: t("quickSale.stockUpdated") });
      setCart([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: t("common.error"), description: error.message || t("quickSale.errorProcessing"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t("quickSale.title")}
          </DialogTitle>
        </DialogHeader>

        {cart.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("quickSale.emptyCart")}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{currencySymbol}{item.product.selling_price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-bold min-w-[60px] text-right">{currencySymbol}{(item.product.selling_price * item.quantity).toFixed(2)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.product.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-lg font-semibold">{t("common.total")}:</span>
          <span className="text-xl font-bold text-primary">{currencySymbol}{total.toFixed(2)}</span>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSubmit} disabled={cart.length === 0 || isSubmitting} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            {isSubmitting ? t("quickSale.processing") : t("quickSale.chargeAndPrint")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">{t("common.cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSaleDialog;
