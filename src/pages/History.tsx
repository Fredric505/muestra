import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRepairs, Currency, Repair } from "@/hooks/useRepairs";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, History as HistoryIcon, Calendar, MessageCircle, Trash2, Shield, XCircle, Camera, ImageIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addDays, isBefore } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { getCurrencySymbol } from "@/lib/currency";

const getHistoryWhatsAppMessage = (repair: Repair, businessName: string, t: (key: string, opts?: any) => string): string => {
  if (repair.status === "failed") {
    return t("whatsapp.repairFailed", { name: repair.customer_name, business: businessName, brand: repair.device_brand, model: repair.device_model, reason: repair.failure_reason || "N/A" });
  }
  const warrantyInfo = repair.warranty_days && repair.warranty_days > 0 
    ? `\n\n${t("invoice.warranty")}: ${repair.warranty_days} ${t("invoice.days")}` : "";
  return t("whatsapp.repairFollowUp", { name: repair.customer_name, business: businessName, brand: repair.device_brand, model: repair.device_model, warranty: warrantyInfo });
};

const History = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { isAdmin } = useAuth();
  const { brand } = useBrand();
  const { repairs, isLoading, deleteRepair } = useRepairs();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);

  const completedRepairs = useMemo(() => {
    return repairs
      .filter((r) => r.status === "delivered" || r.status === "failed")
      .filter((repair) => {
        if (statusFilter !== "all" && repair.status !== statusFilter) return false;
        if (monthFilter !== "all" && repair.completed_at) {
          const [year, month] = monthFilter.split("-");
          const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
          const monthEnd = endOfMonth(monthStart);
          const completedDate = parseISO(repair.completed_at);
          if (!isWithinInterval(completedDate, { start: monthStart, end: monthEnd })) return false;
        }
        if (search) {
          const searchLower = search.toLowerCase();
          return repair.customer_name.toLowerCase().includes(searchLower) || repair.customer_phone.includes(search) || repair.device_brand.toLowerCase().includes(searchLower) || repair.device_model.toLowerCase().includes(searchLower);
        }
        return true;
      });
  }, [repairs, search, monthFilter, statusFilter]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    repairs.filter((r) => r.completed_at && (r.status === "delivered" || r.status === "failed")).forEach((r) => {
      const date = parseISO(r.completed_at!);
      months.add(format(date, "yyyy-MM"));
    });
    return Array.from(months).sort().reverse();
  }, [repairs]);

  const handleDeleteRepair = async () => {
    if (!repairToDelete) return;
    try { await deleteRepair.mutateAsync(repairToDelete); setDeleteDialogOpen(false); setRepairToDelete(null); } catch (error) { console.error("Error deleting repair:", error); }
  };

  const openDeleteDialog = (id: string) => { setRepairToDelete(id); setDeleteDialogOpen(true); };

  const isWarrantyValid = (completedAt: string, warrantyDays: number) => {
    if (!completedAt || !warrantyDays) return false;
    const completedDate = parseISO(completedAt);
    const warrantyEndDate = addDays(completedDate, warrantyDays);
    return isBefore(new Date(), warrantyEndDate);
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t("common.loading")}</div></div>);
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("historyPage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("historyPage.subtitle")}</p>
      </div>

      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("historyPage.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("common.status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("historyPage.allStatuses")}</SelectItem>
                <SelectItem value="delivered">{t("historyPage.deliveredOnly")}</SelectItem>
                <SelectItem value="failed">{t("historyPage.failedOnly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("historyPage.filterByMonth")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("historyPage.allMonths")}</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {format(parseISO(`${month}-01`), "MMMM yyyy", { locale: dateLoc })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            {t("historyPage.repairHistory")} ({completedRepairs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedRepairs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("historyPage.noHistory")}</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("salesPage.client")}</TableHead>
                    <TableHead>{t("historyPage.device")}</TableHead>
                    <TableHead>{t("historyPage.repair")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("historyPage.finalPrice")}</TableHead>
                    <TableHead>{t("common.profit")}</TableHead>
                    <TableHead>{t("common.warranty")}</TableHead>
                    <TableHead>{t("historyPage.photos")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    {isAdmin && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRepairs.map((repair) => {
                    const symbol = currencySymbols[repair.currency];
                    const price = repair.final_price || repair.estimated_price;
                    const netProfit = price - (repair.parts_cost || 0);
                    const warrantyValid = repair.completed_at && repair.warranty_days ? isWarrantyValid(repair.completed_at, repair.warranty_days) : false;
                    const whatsappMessage = getHistoryWhatsAppMessage(repair, brand.business_name, t);
                    const phone = repair.customer_phone.replace(/\D/g, "");
                    return (
                      <TableRow key={repair.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{repair.customer_name}</p>
                            <a href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-success hover:underline flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />{repair.customer_phone}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell><p className="font-medium">{repair.device_brand} {repair.device_model}</p></TableCell>
                        <TableCell><p>{t(`repairTypeNames.${repair.repair_types?.name}`, repair.repair_types?.name || "N/A")}</p></TableCell>
                        <TableCell>
                          {repair.status === "delivered" ? (
                            <Badge className="bg-success/20 text-success border-success/30">{t("historyPage.deliveredStatus")}</Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" />{t("repairStatus.failed")}</Badge>
                          )}
                        </TableCell>
                        <TableCell><p className="font-medium text-foreground">{symbol}{price.toFixed(2)}</p></TableCell>
                        <TableCell><p className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{symbol}{netProfit.toFixed(2)}</p></TableCell>
                        <TableCell>
                          {repair.warranty_days && repair.warranty_days > 0 ? (
                            <Badge variant={warrantyValid ? "default" : "secondary"} className={warrantyValid ? "bg-success text-success-foreground" : ""}>
                              <Shield className="h-3 w-3 mr-1" />{repair.warranty_days} {t("common.days")}
                            </Badge>
                          ) : (<span className="text-muted-foreground text-sm">{t("historyPage.noWarranty")}</span>)}
                        </TableCell>
                        <TableCell>
                          {(repair.device_photo_received || repair.device_photo_delivered) ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1"><Camera className="h-3.5 w-3.5" />{t("common.view")}</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader><DialogTitle>{t("historyPage.photos")} - {repair.device_brand} {repair.device_model}</DialogTitle></DialogHeader>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">📥 {t("historyPage.received")}</p>
                                    {repair.device_photo_received ? (
                                      <img src={repair.device_photo_received.startsWith("http") ? repair.device_photo_received : supabase.storage.from("device-photos").getPublicUrl(repair.device_photo_received).data.publicUrl} alt={t("historyPage.received")} className="rounded-lg border w-full object-cover max-h-80" />
                                    ) : (<div className="rounded-lg border border-dashed flex items-center justify-center h-48 text-muted-foreground text-sm"><ImageIcon className="h-5 w-5 mr-2 opacity-50" />{t("historyPage.noPhotos")}</div>)}
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">📤 {t("historyPage.deliveredStatus")}</p>
                                    {repair.device_photo_delivered ? (
                                      <img src={repair.device_photo_delivered.startsWith("http") ? repair.device_photo_delivered : supabase.storage.from("device-photos").getPublicUrl(repair.device_photo_delivered).data.publicUrl} alt={t("historyPage.deliveredStatus")} className="rounded-lg border w-full object-cover max-h-80" />
                                    ) : (<div className="rounded-lg border border-dashed flex items-center justify-center h-48 text-muted-foreground text-sm"><ImageIcon className="h-5 w-5 mr-2 opacity-50" />{t("historyPage.noPhotos")}</div>)}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (<span className="text-muted-foreground text-sm">{t("historyPage.noPhotos")}</span>)}
                        </TableCell>
                        <TableCell>{repair.completed_at && format(parseISO(repair.completed_at), "dd MMM yyyy", { locale: dateLoc })}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(repair.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {completedRepairs.map((repair) => {
                const symbol = currencySymbols[repair.currency];
                const price = repair.final_price || repair.estimated_price;
                const netProfit = price - (repair.parts_cost || 0);
                const warrantyValid = repair.completed_at && repair.warranty_days ? isWarrantyValid(repair.completed_at, repair.warranty_days) : false;
                const whatsappMessage = getHistoryWhatsAppMessage(repair, brand.business_name, t);
                const phone = repair.customer_phone.replace(/\D/g, "");
                return (
                  <div key={repair.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{repair.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{repair.device_brand} {repair.device_model}</p>
                      </div>
                      {repair.status === "delivered" ? (
                        <Badge className="bg-success/20 text-success border-success/30 text-xs">{t("historyPage.deliveredStatus")}</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">{t("repairStatus.failed")}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t(`repairTypeNames.${repair.repair_types?.name}`, repair.repair_types?.name || "N/A")}</span>
                      <span className="text-muted-foreground">{repair.completed_at && format(parseISO(repair.completed_at), "dd/MM/yy", { locale: dateLoc })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">{t("common.price")}: </span>
                        <span className="font-medium">{symbol}{price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">{t("common.profit")}: </span>
                        <span className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{symbol}{netProfit.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <a href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-success hover:underline flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />WhatsApp
                      </a>
                      {repair.warranty_days && repair.warranty_days > 0 && (
                        <Badge variant={warrantyValid ? "default" : "secondary"} className={cn("text-xs", warrantyValid ? "bg-success text-success-foreground" : "")}>
                          <Shield className="h-3 w-3 mr-1" />{repair.warranty_days}d
                        </Badge>
                      )}
                      <div className="ml-auto">
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="text-destructive h-7 px-2" onClick={() => openDeleteDialog(repair.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("repairs.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("repairs.deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRepair} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
