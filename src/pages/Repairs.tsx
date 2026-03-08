import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useRepairs, RepairStatus, Currency } from "@/hooks/useRepairs";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Plus, MoreHorizontal, MessageCircle, ArrowRight, Filter, Wrench,
  Package, Trash2, LayoutGrid, List, XCircle, FileText, Camera, ImageIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { RepairProgressView, getWhatsAppMessage } from "@/components/RepairProgressView";

const currencySymbols: Record<Currency, string> = { NIO: "C$", USD: "$" };

const nextStatus: Record<RepairStatus, RepairStatus | null> = {
  received: "in_progress", in_progress: "ready", ready: "delivered", delivered: null, failed: null,
};

const Repairs = () => {
  const { t, i18n } = useTranslation();
  const dateLoc = getDateLocale(i18n.language);
  const { isAdmin, user, workshop } = useAuth();
  const { brand } = useBrand();
  const { repairs, isLoading, updateStatus, updateRepair, deleteRepair } = useRepairs(true);
  const { employees, createEarning } = useEmployees();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);
  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [repairToFail, setRepairToFail] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null);

  const statusConfig: Record<RepairStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    received: { label: t("repairStatus.received"), variant: "secondary" },
    in_progress: { label: t("repairStatus.in_progress"), variant: "default" },
    ready: { label: t("repairStatus.ready"), variant: "outline" },
    delivered: { label: t("repairStatus.delivered"), variant: "default" },
    failed: { label: t("repairStatus.failed"), variant: "destructive" },
  };

  const handleDeliveryPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return;
      setDeliveryPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setDeliveryPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      if (statusFilter !== "all" && repair.status !== statusFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          repair.customer_name.toLowerCase().includes(searchLower) ||
          repair.customer_phone.includes(search) ||
          repair.device_brand.toLowerCase().includes(searchLower) ||
          repair.device_model.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [repairs, search, statusFilter]);

  const activeRepairs = filteredRepairs.filter((r) => r.status !== "delivered" && r.status !== "failed");

  const handleAdvanceStatus = async (id: string, currentStatus: RepairStatus) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    if (next === "delivered") {
      const repair = repairs.find(r => r.id === id);
      if (repair) {
        setSelectedRepair(id);
        setFinalPrice(String(repair.final_price || repair.estimated_price));
        setPartsCost(String(repair.parts_cost || 0));
        setCompleteDialogOpen(true);
      }
      return;
    }
    await updateStatus.mutateAsync({ id, status: next });
  };

  const handleCompleteRepair = async () => {
    if (!selectedRepair) return;
    if (!selectedTechnician && selectedTechnician !== "admin") return;
    const repair = repairs.find(r => r.id === selectedRepair);
    if (!repair) return;
    const finalPriceNum = parseFloat(finalPrice) || repair.estimated_price;
    const partsCostNum = parseFloat(partsCost) || 0;
    const netProfitVal = finalPriceNum - partsCostNum;
    try {
      let deliveryPhotoUrl: string | undefined;
      if (deliveryPhoto) {
        const ext = deliveryPhoto.name.split(".").pop();
        const path = `delivered/${selectedRepair}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("device-photos").upload(path, deliveryPhoto, { upsert: true });
        if (!uploadErr) {
          const { data } = supabase.storage.from("device-photos").getPublicUrl(path);
          deliveryPhotoUrl = data.publicUrl;
        }
      }
      if (selectedTechnician === "admin") {
        await updateRepair.mutateAsync({
          id: selectedRepair, final_price: finalPriceNum, parts_cost: partsCostNum,
          technician_id: user?.id, status: "delivered", completed_at: new Date().toISOString(),
          ...(deliveryPhotoUrl && { device_photo_delivered: deliveryPhotoUrl }),
        });
      } else {
        const employee = employees.find(e => e.id === selectedTechnician);
        if (!employee) return;
        const commissionEarned = netProfitVal * (employee.monthly_commission_rate / 100);
        await updateRepair.mutateAsync({
          id: selectedRepair, final_price: finalPriceNum, parts_cost: partsCostNum,
          technician_id: employee.user_id, status: "delivered", completed_at: new Date().toISOString(),
          ...(deliveryPhotoUrl && { device_photo_delivered: deliveryPhotoUrl }),
        });
        await createEarning.mutateAsync({
          employee_id: employee.id, repair_id: selectedRepair, gross_income: finalPriceNum,
          parts_cost: partsCostNum, net_profit: netProfitVal, commission_earned: commissionEarned,
        });
      }
      setCompleteDialogOpen(false); setSelectedRepair(null); setFinalPrice(""); setPartsCost("");
      setSelectedTechnician(""); setDeliveryPhoto(null); setDeliveryPhotoPreview(null);
    } catch (error) { console.error("Error completing repair:", error); }
  };

  const handleDeleteRepair = async () => {
    if (!repairToDelete) return;
    try { await deleteRepair.mutateAsync(repairToDelete); setDeleteDialogOpen(false); setRepairToDelete(null); }
    catch (error) { console.error("Error deleting repair:", error); }
  };

  const openDeleteDialog = (id: string) => { setRepairToDelete(id); setDeleteDialogOpen(true); };
  const openFailedDialog = (id: string) => { setRepairToFail(id); setFailureReason(""); setFailedDialogOpen(true); };

  const handleMarkAsFailed = async () => {
    if (!repairToFail || !failureReason.trim()) return;
    try {
      await updateStatus.mutateAsync({ id: repairToFail, status: "failed", failure_reason: failureReason });
      setFailedDialogOpen(false); setRepairToFail(null); setFailureReason("");
    } catch (error) { console.error("Error marking repair as failed:", error); }
  };

  const handlePrintInvoice = (repair: any) => {
    const { printRepairInvoice } = require("@/lib/invoiceUtils");
    printRepairInvoice(repair, brand, workshop, t, dateLoc, (brand as any).invoice_size || 'commercial');
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t("common.loading")}</div></div>);
  }

  const currentRepair = repairs.find(r => r.id === selectedRepair);
  const symbol = currentRepair ? currencySymbols[currentRepair.currency] : "C$";
  const netProfit = (parseFloat(finalPrice) || 0) - (parseFloat(partsCost) || 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("repairs.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("repairs.subtitle")}</p>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/panel/repairs/new"><Plus className="h-4 w-4 mr-2" />{t("repairs.newRepair")}</Link>
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")} className="flex-1 sm:flex-initial">
              <LayoutGrid className="h-4 w-4 mr-1" />{t("repairs.board")}
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} className="flex-1 sm:flex-initial">
              <List className="h-4 w-4 mr-1" />{t("repairs.list")}
            </Button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("repairs.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-9" />
          </div>
          {viewMode === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder={t("common.status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="received">{t("repairStatus.received")}</SelectItem>
                <SelectItem value="in_progress">{t("repairStatus.in_progress")}</SelectItem>
                <SelectItem value="ready">{t("repairStatus.ready")}</SelectItem>
                <SelectItem value="delivered">{t("repairStatus.delivered")}</SelectItem>
                <SelectItem value="failed">{t("repairStatus.failed")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {viewMode === "kanban" && (
        <RepairProgressView repairs={filteredRepairs} onAdvanceStatus={handleAdvanceStatus}
          onContact={(repair) => {
            const message = getWhatsAppMessage(repair, brand.business_name);
            const phone = repair.customer_phone.replace(/\D/g, "");
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
          }}
        />
      )}

      {viewMode === "list" && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />{t("repairs.title")} ({activeRepairs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {activeRepairs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("common.noData")}</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden space-y-2 p-3">
                  {activeRepairs.map((repair) => {
                    const repairSymbol = currencySymbols[repair.currency];
                    const price = repair.final_price || repair.estimated_price;
                    const whatsappMessage = getWhatsAppMessage(repair, brand.business_name);
                    const phone = repair.customer_phone.replace(/\D/g, "");
                    return (
                      <Card key={repair.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{repair.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{repair.device_brand} {repair.device_model}</p>
                          </div>
                          <Badge variant={statusConfig[repair.status].variant} className={`text-xs ${repair.status === "ready" ? "bg-success text-success-foreground" : repair.status === "in_progress" ? "bg-info text-info-foreground" : ""}`}>
                            {statusConfig[repair.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{t(`repairTypeNames.${repair.repair_types?.name}`, repair.repair_types?.name || "N/A")}</span>
                          <span className="font-medium">{repairSymbol}{price.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`, "_blank")}>
                            <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                          </Button>
                          {nextStatus[repair.status] && (
                            <Button size="sm" variant="default" className="flex-1 h-8 text-xs" onClick={() => handleAdvanceStatus(repair.id, repair.status)}>
                              <ArrowRight className="h-3 w-3 mr-1" />{t("repairs.advanceStatus")}
                            </Button>
                          )}
                          {repair.status !== "delivered" && repair.status !== "failed" && (
                            <Button size="sm" variant="secondary" className="h-8 px-2" onClick={() => openFailedDialog(repair.id)}><XCircle className="h-3 w-3" /></Button>
                          )}
                          {isAdmin && repair.status !== "delivered" && repair.status !== "failed" && (
                            <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => openDeleteDialog(repair.id)}><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("invoice.client")}</TableHead>
                        <TableHead>{t("invoice.device")}</TableHead>
                        <TableHead>{t("historyPage.repair")}</TableHead>
                        <TableHead>{t("common.price")}</TableHead>
                        <TableHead>{t("common.profit")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead>{t("common.date")}</TableHead>
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRepairs.map((repair) => {
                        const repairSymbol = currencySymbols[repair.currency];
                        const price = repair.final_price || repair.estimated_price;
                        const parts = repair.parts_cost || 0;
                        const net = price - parts;
                        const whatsappMessage = getWhatsAppMessage(repair, brand.business_name);
                        const phone = repair.customer_phone.replace(/\D/g, "");
                        return (
                          <TableRow key={repair.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground text-sm">{repair.customer_name}</p>
                                <a href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-success hover:underline flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />{repair.customer_phone}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell><p className="font-medium text-sm">{repair.device_brand} {repair.device_model}</p></TableCell>
                            <TableCell><p className="text-sm">{repair.repair_types?.name || "N/A"}</p></TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground text-sm">{repairSymbol}{price.toFixed(2)}</p>
                              {repair.deposit && repair.deposit > 0 && (<p className="text-xs text-muted-foreground">{t("invoice.deposit")}: {repairSymbol}{repair.deposit.toFixed(2)}</p>)}
                            </TableCell>
                            <TableCell><p className={`font-medium text-sm ${net >= 0 ? 'text-success' : 'text-destructive'}`}>{repairSymbol}{net.toFixed(2)}</p></TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[repair.status].variant} className={`text-xs ${repair.status === "ready" ? "bg-success text-success-foreground" : repair.status === "in_progress" ? "bg-info text-info-foreground" : ""}`}>
                                {statusConfig[repair.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell><p className="text-xs">{format(parseISO(repair.created_at), "dd MMM", { locale: dateLoc })}</p></TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {nextStatus[repair.status] && (
                                    <DropdownMenuItem onClick={() => handleAdvanceStatus(repair.id, repair.status)}>
                                      <ArrowRight className="h-4 w-4 mr-2" />{t("repairs.advanceStatus")} → {statusConfig[nextStatus[repair.status]!].label}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem asChild>
                                    <a href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer">
                                      <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrintInvoice(repair)}>
                                    <FileText className="h-4 w-4 mr-2" />{t("common.print")}
                                  </DropdownMenuItem>
                                  {repair.status !== "delivered" && repair.status !== "failed" && (
                                    <><DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-yellow-500" onClick={() => openFailedDialog(repair.id)}>
                                      <XCircle className="h-4 w-4 mr-2" />{t("repairs.markFailed")}
                                    </DropdownMenuItem></>
                                  )}
                                  {isAdmin && repair.status !== "delivered" && repair.status !== "failed" && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(repair.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" />{t("common.delete")}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Repair Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("repairs.complete")}</DialogTitle>
            <DialogDescription>{t("repairs.finalPrice")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("repairs.finalPrice")} ({symbol}) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
                  <Input type="number" step="0.01" placeholder="0.00" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("newRepair.partsCost")}</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" step="0.01" placeholder="0.00" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${netProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-sm text-muted-foreground">{t("newRepair.netProfit")}:</p>
              <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{symbol}{netProfit.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("repairs.technician")} *</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger><SelectValue placeholder={t("repairs.selectTechnician")} /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="admin">{t("repairs.adminDidIt")}</SelectItem>}
                  {employees.filter(e => e.is_active && e.employee_type === "technician").map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.profiles?.full_name || "?"} ({emp.monthly_commission_rate}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Delivery photo */}
            <div className="space-y-2">
              <Label>{t("repairs.deliveryPhoto")}</Label>
              <div className="flex items-start gap-4">
                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {deliveryPhotoPreview ? (
                    <img src={deliveryPhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (<><ImageIcon className="h-6 w-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">{t("newRepair.uploadPhoto")}</span></>)}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDeliveryPhotoChange} />
                </label>
                {deliveryPhotoPreview && <Button type="button" variant="outline" size="sm" onClick={() => { setDeliveryPhoto(null); setDeliveryPhotoPreview(null); }}>{t("newRepair.removePhoto")}</Button>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCompleteRepair} disabled={!selectedTechnician}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("repairs.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("repairs.deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRepair} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Failed dialog */}
      <AlertDialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("repairs.markFailed")}</AlertDialogTitle>
            <AlertDialogDescription>{t("repairs.failureReason")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea placeholder={t("repairs.failureReasonPlaceholder")} value={failureReason} onChange={(e) => setFailureReason(e.target.value)} rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsFailed} disabled={!failureReason.trim()} className="bg-destructive text-destructive-foreground">{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Repairs;
