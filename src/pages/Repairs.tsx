import { useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  MoreHorizontal,
  MessageCircle,
  ArrowRight,
  Filter,
  Wrench,
  Package,
  Trash2,
  LayoutGrid,
  List,
  XCircle,
  FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { RepairProgressView, getWhatsAppMessage } from "@/components/RepairProgressView";

const statusConfig: Record<RepairStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Recibido", variant: "secondary" },
  in_progress: { label: "En Progreso", variant: "default" },
  ready: { label: "Listo", variant: "outline" },
  delivered: { label: "Entregado", variant: "default" },
  failed: { label: "Fallido", variant: "destructive" },
};

const nextStatus: Record<RepairStatus, RepairStatus | null> = {
  received: "in_progress",
  in_progress: "ready",
  ready: "delivered",
  delivered: null,
  failed: null,
};

const currencySymbols: Record<Currency, string> = {
  NIO: "C$",
  USD: "$",
};

const Repairs = () => {
  const { isAdmin, user } = useAuth();
  const { brand } = useBrand();
  // Filter repairs by technician for non-admins
  const { repairs, isLoading, updateStatus, updateRepair, deleteRepair } = useRepairs(true);
  const { employees, createEarning } = useEmployees();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  
  // Dialog state for completing a repair
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);
  
  // Failed repair dialog state
  const [failedDialogOpen, setFailedDialogOpen] = useState(false);
  const [repairToFail, setRepairToFail] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState("");

  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      // Status filter
      if (statusFilter !== "all" && repair.status !== statusFilter) {
        return false;
      }

      // Search filter
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

    // If advancing to delivered, show dialog to set final price and technician
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
    // Allow completing without technician if "admin" is selected
    if (!selectedTechnician && selectedTechnician !== "admin") return;

    const repair = repairs.find(r => r.id === selectedRepair);
    if (!repair) return;

    const finalPriceNum = parseFloat(finalPrice) || repair.estimated_price;
    const partsCostNum = parseFloat(partsCost) || 0;
    const netProfit = finalPriceNum - partsCostNum;

    try {
      // If admin did the repair themselves, don't assign technician or create earning
      if (selectedTechnician === "admin") {
        await updateRepair.mutateAsync({
          id: selectedRepair,
          final_price: finalPriceNum,
          parts_cost: partsCostNum,
          technician_id: user?.id, // Admin's own user_id
          status: "delivered",
          completed_at: new Date().toISOString(),
        });
      } else {
        const employee = employees.find(e => e.id === selectedTechnician);
        if (!employee) return;

        const commissionEarned = netProfit * (employee.monthly_commission_rate / 100);

        // Update repair with final price, parts cost, and technician
        await updateRepair.mutateAsync({
          id: selectedRepair,
          final_price: finalPriceNum,
          parts_cost: partsCostNum,
          technician_id: employee.user_id,
          status: "delivered",
          completed_at: new Date().toISOString(),
        });

        // Create earning record for the technician
        await createEarning.mutateAsync({
          employee_id: employee.id,
          repair_id: selectedRepair,
          gross_income: finalPriceNum,
          parts_cost: partsCostNum,
          net_profit: netProfit,
          commission_earned: commissionEarned,
        });
      }

      setCompleteDialogOpen(false);
      setSelectedRepair(null);
      setFinalPrice("");
      setPartsCost("");
      setSelectedTechnician("");
    } catch (error) {
      console.error("Error completing repair:", error);
    }
  };

  const handleDeleteRepair = async () => {
    if (!repairToDelete) return;
    
    try {
      await deleteRepair.mutateAsync(repairToDelete);
      setDeleteDialogOpen(false);
      setRepairToDelete(null);
    } catch (error) {
      console.error("Error deleting repair:", error);
    }
  };

  const openDeleteDialog = (id: string) => {
    setRepairToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const openFailedDialog = (id: string) => {
    setRepairToFail(id);
    setFailureReason("");
    setFailedDialogOpen(true);
  };

  const handleMarkAsFailed = async () => {
    if (!repairToFail || !failureReason.trim()) return;
    
    try {
      await updateStatus.mutateAsync({
        id: repairToFail,
        status: "failed",
        failure_reason: failureReason,
      });
      setFailedDialogOpen(false);
      setRepairToFail(null);
      setFailureReason("");
    } catch (error) {
      console.error("Error marking repair as failed:", error);
    }
  };

  const handlePrintInvoice = (repair: any) => {
    const repairSymbol = currencySymbols[repair.currency as Currency];
    const price = repair.final_price || repair.estimated_price;
    const deposit = repair.deposit || 0;
    const remaining = price - deposit;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Factura - ${brand.business_name}</title>
            <style>
              @media print { body { margin: 0; } }
              body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 700px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 22px; }
              .header p { margin: 4px 0; color: #666; font-size: 13px; }
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
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${brand.business_name}</h1>
              ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
              <p>Factura de Reparación</p>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <h3>Cliente</h3>
                <p><strong>${repair.customer_name}</strong></p>
                <p>${repair.customer_phone}</p>
              </div>
              <div class="info-box">
                <h3>Detalles</h3>
                <p>Fecha: ${new Date(repair.created_at).toLocaleDateString('es-NI')}</p>
                <p>ID: ${repair.id.slice(0, 8).toUpperCase()}</p>
                ${repair.warranty_days ? `<p>Garantía: ${repair.warranty_days} días</p>` : ''}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Dispositivo</th>
                  <th style="text-align:right">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${repair.repair_types?.name || repair.repair_description || 'Reparación'}</td>
                  <td>${repair.device_brand} ${repair.device_model}</td>
                  <td style="text-align:right">${repairSymbol}${price.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="totals">
              ${deposit > 0 ? `<p>Anticipo: ${repairSymbol}${deposit.toFixed(2)}</p>` : ''}
              ${deposit > 0 ? `<p>Restante: ${repairSymbol}${remaining.toFixed(2)}</p>` : ''}
              <p class="total">Total: ${repairSymbol}${price.toFixed(2)}</p>
            </div>
            <div class="footer">
              <p>Gracias por su confianza · ${brand.business_name}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const currentRepair = repairs.find(r => r.id === selectedRepair);
  const symbol = currentRepair ? currencySymbols[currentRepair.currency] : "C$";
  const netProfit = (parseFloat(finalPrice) || 0) - (parseFloat(partsCost) || 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reparaciones</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las reparaciones activas
            </p>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/panel/repairs/new">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Reparación
            </Link>
          </Button>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="flex-1 sm:flex-initial"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Tablero
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex-1 sm:flex-initial"
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {viewMode === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="received">Recibido</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="ready">Listo</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <RepairProgressView
          repairs={filteredRepairs}
          onAdvanceStatus={handleAdvanceStatus}
          onContact={(repair) => {
            const message = getWhatsAppMessage(repair, brand.business_name);
            const phone = repair.customer_phone.replace(/\D/g, "");
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
          }}
        />
      )}

      {/* List View - Repairs Table */}
      {viewMode === "list" && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Reparaciones ({activeRepairs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {activeRepairs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay reparaciones que mostrar</p>
                <Button asChild size="sm" className="mt-3">
                  <Link to="/panel/repairs/new">
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar primera reparación
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden space-y-2 p-3">
                  {activeRepairs.map((repair) => {
                    const repairSymbol = currencySymbols[repair.currency];
                    const price = repair.final_price || repair.estimated_price;
                    const parts = repair.parts_cost || 0;
                    const net = price - parts;
                    const whatsappMessage = getWhatsAppMessage(repair, brand.business_name);
                    const phone = repair.customer_phone.replace(/\D/g, "");
                    
                    return (
                      <Card key={repair.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{repair.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {repair.device_brand} {repair.device_model}
                            </p>
                          </div>
                          <Badge
                            variant={statusConfig[repair.status].variant}
                            className={`text-xs ${
                              repair.status === "ready"
                                ? "bg-success text-success-foreground"
                                : repair.status === "in_progress"
                                ? "bg-info text-info-foreground"
                                : ""
                            }`}
                          >
                            {statusConfig[repair.status].label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {repair.repair_types?.name || "N/A"}
                          </span>
                          <span className="font-medium">
                            {repairSymbol}{price.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Button>
                          {nextStatus[repair.status] && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 h-8 text-xs"
                              onClick={() => handleAdvanceStatus(repair.id, repair.status)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Avanzar
                            </Button>
                          )}
                          {repair.status !== "delivered" && repair.status !== "failed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2"
                              onClick={() => openFailedDialog(repair.id)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {isAdmin && repair.status !== "delivered" && repair.status !== "failed" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2"
                              onClick={() => openDeleteDialog(repair.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
                        <TableHead>Cliente</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Reparación</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Neto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
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
                                <p className="font-medium text-foreground text-sm">
                                  {repair.customer_name}
                                </p>
                                <a
                                  href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-success hover:underline flex items-center gap-1"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  {repair.customer_phone}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">
                                {repair.device_brand} {repair.device_model}
                              </p>
                              {repair.device_imei && (
                                <p className="text-xs text-muted-foreground">
                                  IMEI: {repair.device_imei}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{repair.repair_types?.name || "N/A"}</p>
                              {repair.repair_description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                  {repair.repair_description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground text-sm">
                                {repairSymbol}{price.toFixed(2)}
                              </p>
                              {repair.deposit && repair.deposit > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Anticipo: {repairSymbol}{repair.deposit.toFixed(2)}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className={`font-medium text-sm ${net >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {repairSymbol}{net.toFixed(2)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig[repair.status].variant}
                                className={`text-xs ${
                                  repair.status === "ready"
                                    ? "bg-success text-success-foreground"
                                    : repair.status === "in_progress"
                                    ? "bg-info text-info-foreground"
                                    : ""
                                }`}
                              >
                                {statusConfig[repair.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs">
                                {format(parseISO(repair.created_at), "dd MMM", {
                                  locale: es,
                                })}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {nextStatus[repair.status] && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAdvanceStatus(repair.id, repair.status)
                                      }
                                    >
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      Avanzar a{" "}
                                      {statusConfig[nextStatus[repair.status]!].label}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MessageCircle className="h-4 w-4 mr-2" />
                                      Contactar por WhatsApp
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrintInvoice(repair)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Imprimir Factura
                                  </DropdownMenuItem>
                                  {repair.status !== "delivered" && repair.status !== "failed" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-yellow-500"
                                        onClick={() => openFailedDialog(repair.id)}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Marcar como fallida
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isAdmin && repair.status !== "delivered" && repair.status !== "failed" && (
                                    <>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => openDeleteDialog(repair.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar reparación
                                      </DropdownMenuItem>
                                    </>
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
            <DialogTitle>Completar Reparación</DialogTitle>
            <DialogDescription>
              Ingresa el precio final, costo de piezas y selecciona el técnico que realizó la reparación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio final ({symbol}) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    {symbol}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Costo de piezas</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${netProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-sm text-muted-foreground">Ganancia neta:</p>
              <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {symbol}{netProfit.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>¿Quién realizó la reparación? *</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="admin">
                      Yo (Administrador) - Sin comisión
                    </SelectItem>
                  )}
                  {employees.filter(e => e.is_active).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.profiles?.full_name || "Sin nombre"} ({emp.monthly_commission_rate}% comisión)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.filter(e => e.is_active).length === 0 && !isAdmin && (
                <p className="text-sm text-muted-foreground">
                  No hay técnicos registrados. Agrega empleados primero.
                </p>
              )}
            </div>
            {selectedTechnician && selectedTechnician !== "admin" && (
              <div className="p-3 rounded-lg border bg-primary/10 border-primary/30">
                <p className="text-sm text-muted-foreground">Comisión del técnico:</p>
                <p className="text-xl font-bold text-primary">
                  {symbol}{(netProfit * ((employees.find(e => e.id === selectedTechnician)?.monthly_commission_rate || 0) / 100)).toFixed(2)}
                </p>
              </div>
            )}
            {selectedTechnician === "admin" && (
              <div className="p-3 rounded-lg border bg-muted/50 border-muted">
                <p className="text-sm text-muted-foreground">
                  La reparación se registrará sin asignar comisión a ningún empleado.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCompleteRepair} disabled={!selectedTechnician}>
              Completar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reparación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La reparación será eliminada permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRepair} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Failed Repair Dialog */}
      <Dialog open={failedDialogOpen} onOpenChange={setFailedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Marcar Reparación como Fallida
            </DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual no fue posible reparar el dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de la falla *</Label>
              <Textarea
                placeholder="Ej: Placa base dañada irreparablemente, costo de reparación mayor al valor del equipo, etc."
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailedDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleMarkAsFailed}
              disabled={!failureReason.trim()}
            >
              Marcar como Fallida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repairs;