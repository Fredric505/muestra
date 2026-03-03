import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { ShoppingBag, Plus, Search, DollarSign, Trash2, Printer, ClipboardCheck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const currencySymbols: Record<string, string> = { NIO: "C$", USD: "$" };

const Sales = () => {
  const { isAdmin } = useAuth();
  const { brand } = useBrand();
  const { workshop } = useAuth();
  const { sales, isLoading, registerCost, deleteSale } = useSales();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [costDialogSale, setCostDialogSale] = useState<string | null>(null);
  const [productCost, setProductCost] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const pendingSales = sales.filter(s => s.status === "pending_cost");
  const completedSales = sales.filter(s => s.status === "completed");

  const filtered = (list: typeof sales) =>
    list.filter(s =>
      s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sale_items?.some(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const handleRegisterCost = async () => {
    if (!costDialogSale || !productCost) return;
    try {
      await registerCost.mutateAsync({
        saleId: costDialogSale,
        productCost: parseFloat(productCost),
        adminNotes: adminNotes || undefined,
      });
      setCostDialogSale(null);
      setProductCost("");
      setAdminNotes("");
    } catch (e) { console.error(e); }
  };

  const handlePrintInvoice = (sale: typeof sales[0]) => {
    const symbol = currencySymbols[sale.currency] || "C$";
    const items = sale.sale_items || [];
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Factura Venta - ${brand.business_name}</title>
      <style>
        @media print { body { margin: 0; } }
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 700px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 4px 0; color: #666; font-size: 13px; }
        .header img { max-height: 60px; margin: 0 auto 10px; display: block; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-box { background: #f9f9f9; padding: 12px; border-radius: 6px; }
        .info-box h3 { margin: 0 0 8px 0; font-size: 13px; color: #666; text-transform: uppercase; }
        .info-box p { margin: 3px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-size: 13px; }
        .totals { text-align: right; margin-top: 20px; }
        .totals p { margin: 5px 0; font-size: 14px; }
        .totals .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
        .photo { max-width: 200px; margin: 10px auto; display: block; border-radius: 8px; }
      </style></head><body>
      <div class="header">
        ${workshop?.logo_url ? `<img src="${workshop.logo_url}" alt="${brand.business_name}" />` : ''}
        <h1>${brand.business_name}</h1>
        ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
        ${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}
        ${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}
        <p>Factura de Venta</p>
      </div>
      <div class="info-grid">
        <div class="info-box"><h3>Cliente</h3><p><strong>${sale.customer_name}</strong></p>${sale.customer_phone ? `<p>${sale.customer_phone}</p>` : ''}</div>
        <div class="info-box"><h3>Detalles</h3><p>Fecha: ${format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: es })}</p><p>ID: ${sale.id.slice(0, 8).toUpperCase()}</p></div>
      </div>
      <table>
        <thead><tr><th>Producto</th><th>Condición</th><th>Garantía</th><th>Cant.</th><th style="text-align:right">Precio</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr><td>${i.product_name}${i.condition_notes ? `<br><small>${i.condition_notes}</small>` : ''}</td><td>${i.condition}</td><td>${i.warranty_days} días</td><td>${i.quantity}</td><td style="text-align:right">${symbol}${(i.unit_price * i.quantity).toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>
      ${items.some(i => i.device_photo_url) ? items.filter(i => i.device_photo_url).map(i => `<img src="${i.device_photo_url}" class="photo" alt="${i.product_name}" />`).join('') : ''}
      <div class="totals"><p class="total">Total: ${symbol}${sale.total_amount.toFixed(2)}</p></div>
      <div class="footer"><p>Gracias por su compra · ${brand.business_name}</p><p>Conserve esta factura como garantía</p></div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const renderSaleRow = (sale: typeof sales[0], showCostAction: boolean) => {
    const symbol = currencySymbols[sale.currency] || "C$";
    const items = sale.sale_items || [];
    const profit = sale.product_cost != null ? sale.total_amount - sale.product_cost : null;
    return (
      <TableRow key={sale.id}>
        <TableCell className="font-medium">{sale.customer_name}</TableCell>
        <TableCell>
          <div className="text-sm">{items.map(i => i.product_name).join(", ") || "—"}</div>
        </TableCell>
        <TableCell>{sale.employees?.profiles?.full_name || "—"}</TableCell>
        <TableCell>{format(new Date(sale.sale_date), "dd MMM yyyy", { locale: es })}</TableCell>
        <TableCell className="text-right font-medium">{symbol}{sale.total_amount.toFixed(2)}</TableCell>
        {showCostAction ? (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => setCostDialogSale(sale.id)}>
                <DollarSign className="h-3 w-3 mr-1" />Costear
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handlePrintInvoice(sale)}><Printer className="h-4 w-4" /></Button>
            </div>
          </TableCell>
        ) : (
          <>
            <TableCell className="text-right">{sale.product_cost != null ? `${symbol}${sale.product_cost.toFixed(2)}` : "—"}</TableCell>
            <TableCell className={`text-right font-bold ${profit && profit > 0 ? "text-green-500" : "text-red-500"}`}>
              {profit != null ? `${symbol}${profit.toFixed(2)}` : "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => handlePrintInvoice(sale)}><Printer className="h-4 w-4" /></Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSale.mutate(sale.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  // Stats
  const totalRevenue = completedSales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalCost = completedSales.reduce((s, sale) => s + (sale.product_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground">Gestiona las ventas de celulares y accesorios</p>
        </div>
        <Button size="sm" onClick={() => navigate("/panel/sales/new")}>
          <Plus className="h-4 w-4 mr-2" />Nueva Venta
        </Button>
      </div>

      {/* Stats */}
      {isAdmin && completedSales.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="glass-card"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ingresos por ventas</div>
            <div className="text-2xl font-bold text-foreground">C${totalRevenue.toFixed(2)}</div>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Costo productos</div>
            <div className="text-2xl font-bold text-foreground">C${totalCost.toFixed(2)}</div>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ganancia neta</div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>C${totalProfit.toFixed(2)}</div>
          </CardContent></Card>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar venta..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Tabs defaultValue={pendingSales.length > 0 && isAdmin ? "pending" : "completed"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="pending">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Pendientes ({pendingSales.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="completed">
            <TrendingUp className="h-4 w-4 mr-2" />
            Completadas ({completedSales.length})
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Ventas pendientes de costeo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filtered(pendingSales).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay ventas pendientes</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Productos</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{filtered(pendingSales).map(s => renderSaleRow(s, true))}</TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="completed">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Ventas completadas ({filtered(completedSales).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filtered(completedSales).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay ventas completadas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">Ganancia</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{filtered(completedSales).map(s => renderSaleRow(s, false))}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Registration Dialog */}
      <Dialog open={!!costDialogSale} onOpenChange={v => { if (!v) setCostDialogSale(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Registrar Costo del Producto
            </DialogTitle>
            <DialogDescription>Ingresa el costo real del producto para calcular las ganancias</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Costo del producto *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={productCost} onChange={e => setProductCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas del admin</Label>
              <Input placeholder="Notas sobre el costo..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostDialogSale(null)}>Cancelar</Button>
            <Button onClick={handleRegisterCost}>Registrar Costo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
