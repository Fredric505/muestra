import { useState, useMemo } from "react";
import { useRepairs, Currency, Repair } from "@/hooks/useRepairs";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, History as HistoryIcon, Calendar, MessageCircle, Trash2, Shield, XCircle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

const currencySymbols: Record<Currency, string> = {
  NIO: "C$",
  USD: "$",
};

// Generate personalized WhatsApp message for history (completed/failed repairs)
const getHistoryWhatsAppMessage = (repair: Repair, businessName: string): string => {
  
  if (repair.status === "failed") {
    return `Hola ${repair.customer_name}, te contactamos de ${businessName} respecto a tu ${repair.device_brand} ${repair.device_model}.\n\nLamentablemente no fue posible reparar el equipo. Motivo: ${repair.failure_reason || "No especificado"}.\n\nPuedes pasar a recogerlo cuando gustes. ¡Gracias por confiar en nosotros!`;
  }
  
  // For delivered repairs - follow up message
  const warrantyInfo = repair.warranty_days && repair.warranty_days > 0 
    ? `\n\nRecuerda que tu reparación tiene ${repair.warranty_days} días de garantía.`
    : "";
  
  return `Hola ${repair.customer_name}, somos de ${businessName}. ¿Cómo está funcionando tu ${repair.device_brand} ${repair.device_model} después de la reparación?\n\nSi tienes alguna duda o problema, no dudes en contactarnos.${warrantyInfo}\n\n¡Gracias por tu preferencia!`;
};

const History = () => {
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
        // Status filter
        if (statusFilter !== "all" && repair.status !== statusFilter) {
          return false;
        }
        
        // Month filter
        if (monthFilter !== "all" && repair.completed_at) {
          const [year, month] = monthFilter.split("-");
          const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
          const monthEnd = endOfMonth(monthStart);
          const completedDate = parseISO(repair.completed_at);
          if (!isWithinInterval(completedDate, { start: monthStart, end: monthEnd })) {
            return false;
          }
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
  }, [repairs, search, monthFilter, statusFilter]);

  // Get available months from completed repairs
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    repairs
      .filter((r) => r.completed_at && (r.status === "delivered" || r.status === "failed"))
      .forEach((r) => {
        const date = parseISO(r.completed_at!);
        months.add(format(date, "yyyy-MM"));
      });
    return Array.from(months).sort().reverse();
  }, [repairs]);

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

  // Check if warranty is still valid
  const isWarrantyValid = (completedAt: string, warrantyDays: number) => {
    if (!completedAt || !warrantyDays) return false;
    const completedDate = parseISO(completedAt);
    const warrantyEndDate = addDays(completedDate, warrantyDays);
    return isBefore(new Date(), warrantyEndDate);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Consulta el historial de reparaciones completadas
        </p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, teléfono o dispositivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="delivered">Entregados</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {format(parseISO(`${month}-01`), "MMMM yyyy", { locale: es })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            Historial de Reparaciones ({completedRepairs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedRepairs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay reparaciones en el historial</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Reparación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio Final</TableHead>
                    <TableHead>Ganancia</TableHead>
                    <TableHead>Garantía</TableHead>
                    <TableHead>Fecha</TableHead>
                    {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRepairs.map((repair) => {
                    const symbol = currencySymbols[repair.currency];
                    const price = repair.final_price || repair.estimated_price;
                    const netProfit = price - (repair.parts_cost || 0);
                    const warrantyValid = repair.completed_at && repair.warranty_days 
                      ? isWarrantyValid(repair.completed_at, repair.warranty_days)
                      : false;
                    const whatsappMessage = getHistoryWhatsAppMessage(repair, brand.business_name);
                    const phone = repair.customer_phone.replace(/\D/g, "");

                    return (
                      <TableRow key={repair.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {repair.customer_name}
                            </p>
                            <a
                              href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-success hover:underline flex items-center gap-1"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {repair.customer_phone}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {repair.device_brand} {repair.device_model}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{repair.repair_types?.name || "N/A"}</p>
                        </TableCell>
                        <TableCell>
                          {repair.status === "delivered" ? (
                            <Badge className="bg-success/20 text-success border-success/30">
                              Entregado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Fallido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {symbol}{price.toFixed(2)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {symbol}{netProfit.toFixed(2)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {repair.warranty_days && repair.warranty_days > 0 ? (
                            <Badge 
                              variant={warrantyValid ? "default" : "secondary"}
                              className={warrantyValid ? "bg-success text-success-foreground" : ""}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {repair.warranty_days} días
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin garantía</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {repair.completed_at &&
                            format(parseISO(repair.completed_at), "dd MMM yyyy", {
                              locale: es,
                            })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(repair.id)}
                            >
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reparación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta reparación del historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRepair}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;