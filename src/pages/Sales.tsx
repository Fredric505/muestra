import { useState, useMemo } from "react";
import { useSales } from "@/hooks/useSales";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { useEmployees } from "@/hooks/useEmployees";
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
import { printLetterInvoice, printTicketInvoice } from "@/lib/invoiceUtils";

const Sales = () => {
  const { isAdmin, user, workshop, employeeType } = useAuth();
  const { brand } = useBrand();
  const { sales, isLoading, registerCost, deleteSale } = useSales();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [costDialogSale, setCostDialogSale] = useState<string | null>(null);
  const [productCost, setProductCost] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const currencySymbol = workshop?.currency === "USD" ? "$" : (workshop?.currency || "C$");

  // Find current user's employee record
  const myEmployee = useMemo(() => {
    if (isAdmin) return null;
    return employees.find(e => e.user_id === user?.id);
  }, [employees, user, isAdmin]);

  // Filter sales: admin sees all, sellers see only theirs
  const mySales = useMemo(() => {
    if (isAdmin) return sales;
    if (!myEmployee) return [];
    return sales.filter(s => s.seller_id === myEmployee.id || s.created_by === user?.id);
  }, [sales, isAdmin, myEmployee, user]);

  const pendingSales = mySales.filter(s => s.status === "pending_cost");
  const completedSales = mySales.filter(s => s.status === "completed");

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
    const items = sale.sale_items || [];
    const hasDevices = items.some(i => i.condition === "nuevo" || i.condition === "usado" || (i.warranty_days && i.warranty_days > 30));
    if (hasDevices) {
      printLetterInvoice(sale, brand, workshop);
    } else {
      printTicketInvoice(sale, brand, workshop);
    }
  };

  // Commission calculation for sellers
  const myCommission = useMemo(() => {
    if (isAdmin || !myEmployee || myEmployee.compensation_type === "fixed") return null;
    const rate = myEmployee.monthly_commission_rate / 100;
    const totalEarned = completedSales.reduce((s, sale) => {
      const profit = sale.total_amount - (sale.product_cost || 0);
      return s + (profit > 0 ? profit * rate : 0);
    }, 0);
    return totalEarned;
  }, [completedSales, myEmployee, isAdmin]);

  const renderSaleRow = (sale: typeof sales[0], showCostAction: boolean) => {
    const items = sale.sale_items || [];
    const profit = sale.product_cost != null ? sale.total_amount - sale.product_cost : null;
    return (
      <TableRow key={sale.id}>
        <TableCell className="font-medium">{sale.customer_name}</TableCell>
        <TableCell>
          <div className="text-sm">{items.map(i => i.product_name).join(", ") || "—"}</div>
        </TableCell>
        {isAdmin && <TableCell>{sale.employees?.profiles?.full_name || "—"}</TableCell>}
        <TableCell>{format(new Date(sale.sale_date), "dd MMM yyyy", { locale: es })}</TableCell>
        <TableCell className="text-right font-medium">{currencySymbol}{sale.total_amount.toFixed(2)}</TableCell>
        {showCostAction ? (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setCostDialogSale(sale.id)}>
                  <DollarSign className="h-3 w-3 mr-1" />Costear
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => handlePrintInvoice(sale)}><Printer className="h-4 w-4" /></Button>
            </div>
          </TableCell>
        ) : (
          <>
            {isAdmin && <TableCell className="text-right">{sale.product_cost != null ? `${currencySymbol}${sale.product_cost.toFixed(2)}` : "—"}</TableCell>}
            {isAdmin && (
              <TableCell className={`text-right font-bold ${profit && profit > 0 ? "text-green-500" : "text-red-500"}`}>
                {profit != null ? `${currencySymbol}${profit.toFixed(2)}` : "—"}
              </TableCell>
            )}
            {!isAdmin && myEmployee && myEmployee.compensation_type !== "fixed" && (
              <TableCell className="text-right font-bold text-success">
                {profit != null ? `${currencySymbol}${(profit > 0 ? profit * (myEmployee.monthly_commission_rate / 100) : 0).toFixed(2)}` : "—"}
              </TableCell>
            )}
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
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gestiona todas las ventas del taller" : "Tu historial de ventas"}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/panel/sales/new")}>
          <Plus className="h-4 w-4 mr-2" />Nueva Venta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="glass-card"><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">{isAdmin ? "Ingresos por ventas" : "Mis ventas totales"}</div>
          <div className="text-2xl font-bold text-foreground">{currencySymbol}{totalRevenue.toFixed(2)}</div>
        </CardContent></Card>
        {isAdmin ? (
          <>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Costo productos</div>
              <div className="text-2xl font-bold text-foreground">{currencySymbol}{totalCost.toFixed(2)}</div>
            </CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Ganancia neta</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>{currencySymbol}{totalProfit.toFixed(2)}</div>
            </CardContent></Card>
          </>
        ) : (
          <>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Ventas completadas</div>
              <div className="text-2xl font-bold text-foreground">{completedSales.length}</div>
            </CardContent></Card>
            {myCommission !== null && (
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Mi comisión ganada</div>
                <div className="text-2xl font-bold text-success">{currencySymbol}{myCommission.toFixed(2)}</div>
              </CardContent></Card>
            )}
          </>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar venta..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Tabs defaultValue={pendingSales.length > 0 && isAdmin ? "pending" : "completed"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="pending">
              <ClipboardCheck className="h-4 w-4 mr-2" />Pendientes ({pendingSales.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="completed">
            <TrendingUp className="h-4 w-4 mr-2" />Completadas ({completedSales.length})
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Ventas pendientes de costeo</CardTitle></CardHeader>
              <CardContent>
                {filtered(pendingSales).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No hay ventas pendientes</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Cliente</TableHead><TableHead>Productos</TableHead>
                        {isAdmin && <TableHead>Vendedor</TableHead>}
                        <TableHead>Fecha</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Acciones</TableHead>
                      </TableRow></TableHeader>
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
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Ventas completadas ({filtered(completedSales).length})</CardTitle></CardHeader>
            <CardContent>
              {filtered(completedSales).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No hay ventas completadas</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Cliente</TableHead><TableHead>Productos</TableHead>
                      {isAdmin && <TableHead>Vendedor</TableHead>}
                      <TableHead>Fecha</TableHead><TableHead className="text-right">Total</TableHead>
                      {isAdmin && <TableHead className="text-right">Costo</TableHead>}
                      {isAdmin && <TableHead className="text-right">Ganancia</TableHead>}
                      {!isAdmin && myEmployee && myEmployee.compensation_type !== "fixed" && <TableHead className="text-right">Mi Comisión</TableHead>}
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow></TableHeader>
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
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Registrar Costo del Producto</DialogTitle>
            <DialogDescription>Ingresa el costo real del producto para calcular las ganancias</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Costo del producto *</Label><Input type="number" step="0.01" placeholder="0.00" value={productCost} onChange={e => setProductCost(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notas del admin</Label><Input placeholder="Notas sobre el costo..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} /></div>
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
