import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSales } from "@/hooks/useSales";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { useEmployees } from "@/hooks/useEmployees";
import { getCurrencySymbol } from "@/lib/currency";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Plus, Search, DollarSign, Trash2, Printer, ClipboardCheck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { printLetterInvoice, printTicketInvoice } from "@/lib/invoiceUtils";

const Sales = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { isAdmin, user, workshop, employeeType } = useAuth();
  const { brand } = useBrand();
  const { sales, isLoading, registerCost, deleteSale } = useSales();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [costDialogSale, setCostDialogSale] = useState<string | null>(null);
  const [productCost, setProductCost] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const currencySymbol = getCurrencySymbol(workshop?.currency);

  const myEmployee = useMemo(() => {
    if (isAdmin) return null;
    return employees.find(e => e.user_id === user?.id);
  }, [employees, user, isAdmin]);

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
      await registerCost.mutateAsync({ saleId: costDialogSale, productCost: parseFloat(productCost), adminNotes: adminNotes || undefined });
      setCostDialogSale(null); setProductCost(""); setAdminNotes("");
    } catch (e) { console.error(e); }
  };

  const handlePrintInvoice = (sale: typeof sales[0]) => {
    const items = sale.sale_items || [];
    const hasDevices = items.some(i => i.condition === "nuevo" || i.condition === "usado" || (i.warranty_days && i.warranty_days > 30));
    const textOverrides = (brand as any).invoice_text_overrides;
    if (hasDevices) { printLetterInvoice(sale, brand, workshop, t, dateLoc, (brand as any).invoice_size || 'commercial', textOverrides); } else { printTicketInvoice(sale, brand, workshop, t, dateLoc, textOverrides); }
  };

  const myCommission = useMemo(() => {
    if (isAdmin || !myEmployee || myEmployee.compensation_type === "fixed") return null;
    const rate = myEmployee.monthly_commission_rate / 100;
    return completedSales.reduce((s, sale) => {
      const profit = sale.total_amount - (sale.product_cost || 0);
      return s + (profit > 0 ? profit * rate : 0);
    }, 0);
  }, [completedSales, myEmployee, isAdmin]);

  const renderSaleRow = (sale: typeof sales[0], showCostAction: boolean) => {
    const items = sale.sale_items || [];
    const profit = sale.product_cost != null ? sale.total_amount - sale.product_cost : null;
    return (
      <TableRow key={sale.id}>
        <TableCell className="font-medium">{sale.customer_name}</TableCell>
        <TableCell><div className="text-sm">{items.map(i => i.product_name).join(", ") || "—"}</div></TableCell>
        {isAdmin && <TableCell>{sale.employees?.profiles?.full_name || "—"}</TableCell>}
        <TableCell>{format(new Date(sale.sale_date), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
        <TableCell className="text-right font-medium">{currencySymbol}{sale.total_amount.toFixed(2)}</TableCell>
        {showCostAction ? (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              {isAdmin && (<Button size="sm" variant="outline" onClick={() => setCostDialogSale(sale.id)}><DollarSign className="h-3 w-3 mr-1" />{t("salesPage.costProduct")}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => handlePrintInvoice(sale)}><Printer className="h-4 w-4" /></Button>
            </div>
          </TableCell>
        ) : (
          <>
            {isAdmin && <TableCell className="text-right">{sale.product_cost != null ? `${currencySymbol}${sale.product_cost.toFixed(2)}` : "—"}</TableCell>}
            {isAdmin && (<TableCell className={`text-right font-bold ${profit && profit > 0 ? "text-success" : "text-destructive"}`}>{profit != null ? `${currencySymbol}${profit.toFixed(2)}` : "—"}</TableCell>)}
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
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("salesPage.deleteSale")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("salesPage.deleteWarning")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSale.mutate(sale.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
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

  const renderSaleCard = (sale: typeof sales[0], showCostAction: boolean) => {
    const items = sale.sale_items || [];
    const profit = sale.product_cost != null ? sale.total_amount - sale.product_cost : null;
    return (
      <div key={sale.id} className="border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-foreground">{sale.customer_name}</p>
            <p className="text-xs text-muted-foreground">{items.map(i => i.product_name).join(", ") || "—"}</p>
          </div>
          <p className="font-bold text-foreground">{currencySymbol}{sale.total_amount.toFixed(2)}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(sale.sale_date), "dd/MM/yy", { locale: dateLoc })}</span>
          {isAdmin && <span>{sale.employees?.profiles?.full_name || "—"}</span>}
        </div>
        {!showCostAction && isAdmin && profit != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("common.cost")}: {currencySymbol}{(sale.product_cost || 0).toFixed(2)}</span>
            <span className={`font-bold ${profit > 0 ? "text-success" : "text-destructive"}`}>{t("common.profit")}: {currencySymbol}{profit.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          {showCostAction && isAdmin && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setCostDialogSale(sale.id)}>
              <DollarSign className="h-3 w-3 mr-1" />{t("salesPage.costProduct")}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7" onClick={() => handlePrintInvoice(sale)}><Printer className="h-3 w-3" /></Button>
          {!showCostAction && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive h-7 ml-auto"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("salesPage.deleteSale")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("salesPage.deleteWarning")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteSale.mutate(sale.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    );
  };

  const totalRevenue = completedSales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalCost = completedSales.reduce((s, sale) => s + (sale.product_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("salesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? t("salesPage.subtitleAdmin") : t("salesPage.subtitleSeller")}</p>
        </div>
        <Button size="sm" onClick={() => navigate("/panel/sales/new")}>
          <Plus className="h-4 w-4 mr-2" />{t("salesPage.newSale")}
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="glass-card"><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">{isAdmin ? t("salesPage.salesRevenue") : t("salesPage.mySalesTotal")}</div>
          <div className="text-2xl font-bold text-foreground">{currencySymbol}{totalRevenue.toFixed(2)}</div>
        </CardContent></Card>
        {isAdmin ? (
          <>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t("salesPage.productCost")}</div>
              <div className="text-2xl font-bold text-foreground">{currencySymbol}{totalCost.toFixed(2)}</div>
            </CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t("salesPage.netProfit")}</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>{currencySymbol}{totalProfit.toFixed(2)}</div>
            </CardContent></Card>
          </>
        ) : (
          <>
            <Card className="glass-card"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t("salesPage.completedSales")}</div>
              <div className="text-2xl font-bold text-foreground">{completedSales.length}</div>
            </CardContent></Card>
            {myCommission !== null && (
              <Card className="glass-card"><CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{t("salesPage.myCommissionEarned")}</div>
                <div className="text-2xl font-bold text-success">{currencySymbol}{myCommission.toFixed(2)}</div>
              </CardContent></Card>
            )}
          </>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("salesPage.searchSale")} className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Tabs defaultValue={pendingSales.length > 0 && isAdmin ? "pending" : "completed"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="pending"><ClipboardCheck className="h-4 w-4 mr-2" />{t("salesPage.pending")} ({pendingSales.length})</TabsTrigger>
          )}
          <TabsTrigger value="completed"><TrendingUp className="h-4 w-4 mr-2" />{t("salesPage.completed")} ({completedSales.length})</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />{t("salesPage.pendingCosting")}</CardTitle></CardHeader>
              <CardContent>
                {filtered(pendingSales).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("salesPage.noPendingSales")}</p></div>
                ) : (
                  <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{t("salesPage.client")}</TableHead><TableHead>{t("salesPage.products")}</TableHead>
                        {isAdmin && <TableHead>{t("salesPage.seller")}</TableHead>}
                        <TableHead>{t("common.date")}</TableHead><TableHead className="text-right">{t("common.total")}</TableHead><TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>{filtered(pendingSales).map(s => renderSaleRow(s, true))}</TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3">{filtered(pendingSales).map(s => renderSaleCard(s, true))}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="completed">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />{t("salesPage.completed")} ({filtered(completedSales).length})</CardTitle></CardHeader>
            <CardContent>
              {filtered(completedSales).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("salesPage.noCompletedSales")}</p></div>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t("salesPage.client")}</TableHead><TableHead>{t("salesPage.products")}</TableHead>
                      {isAdmin && <TableHead>{t("salesPage.seller")}</TableHead>}
                      <TableHead>{t("common.date")}</TableHead><TableHead className="text-right">{t("common.total")}</TableHead>
                      {isAdmin && <TableHead className="text-right">{t("common.cost")}</TableHead>}
                      {isAdmin && <TableHead className="text-right">{t("common.profit")}</TableHead>}
                      {!isAdmin && myEmployee && myEmployee.compensation_type !== "fixed" && <TableHead className="text-right">{t("salesPage.myCommission")}</TableHead>}
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{filtered(completedSales).map(s => renderSaleRow(s, false))}</TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">{filtered(completedSales).map(s => renderSaleCard(s, false))}</div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!costDialogSale} onOpenChange={v => { if (!v) setCostDialogSale(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />{t("salesPage.registerProductCost")}</DialogTitle>
            <DialogDescription>{t("salesPage.registerCostDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{t("salesPage.productCostLabel")} *</Label><Input type="number" step="0.01" placeholder="0.00" value={productCost} onChange={e => setProductCost(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("salesPage.adminNotes")}</Label><Input placeholder="..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostDialogSale(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleRegisterCost}>{t("salesPage.registerCost")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
