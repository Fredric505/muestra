import { useState } from "react";
import { useRepairs } from "@/hooks/useRepairs";
import { useSales } from "@/hooks/useSales";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileDown, Shield, FileText, Wrench, ShoppingBag, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ExportData = () => {
  const { isAdmin } = useAuth();
  const { brand } = useBrand();
  const { workshop } = useAuth();
  const { repairs } = useRepairs();
  const { sales } = useSales();
  const { employees, loans, earnings } = useEmployees();

  const [exportType, setExportType] = useState("repairs");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tienes permisos para ver esta página</p>
        </div>
      </div>
    );
  }

  const filterByDate = <T extends { created_at?: string; sale_date?: string; loan_date?: string; earnings_date?: string }>(items: T[]): T[] => {
    return items.filter(item => {
      const dateStr = (item as any).created_at || (item as any).sale_date || (item as any).loan_date || (item as any).earnings_date;
      if (!dateStr) return true;
      const date = new Date(dateStr);
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    let title = "";
    let tableContent = "";

    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
    const rangeText = dateFrom || dateTo
      ? `Período: ${dateFrom || "inicio"} al ${dateTo || "actual"}`
      : "Todos los registros";

    switch (exportType) {
      case "repairs": {
        title = "Reporte de Reparaciones";
        const data = filterByDate(repairs);
        tableContent = `
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th>Dispositivo</th><th>Estado</th><th>Precio</th><th>Costo Partes</th><th>Garantía</th><th>Fecha</th></tr></thead>
            <tbody>${data.map((r, i) => `<tr>
              <td>${i + 1}</td>
              <td>${r.customer_name}</td>
              <td>${r.customer_phone}</td>
              <td>${r.device_brand} ${r.device_model}</td>
              <td>${r.status}</td>
              <td>${r.currency === "USD" ? "$" : "C$"}${r.estimated_price.toFixed(2)}</td>
              <td>${r.currency === "USD" ? "$" : "C$"}${(r.parts_cost || 0).toFixed(2)}</td>
              <td>${r.warranty_days || 0} días</td>
              <td>${format(new Date(r.created_at), "dd/MM/yyyy", { locale: es })}</td>
            </tr>`).join('')}</tbody>
          </table>
          <div class="summary"><p>Total registros: ${data.length}</p><p>Ingresos totales: C$${data.reduce((s, r) => s + r.estimated_price, 0).toFixed(2)}</p></div>`;
        break;
      }
      case "sales": {
        title = "Reporte de Ventas";
        const data = filterByDate(sales);
        tableContent = `
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Costo</th><th>Ganancia</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>${data.map((s, i) => `<tr>
              <td>${i + 1}</td>
              <td>${s.customer_name}</td>
              <td>${s.sale_items?.map(item => item.product_name).join(", ") || "—"}</td>
              <td>${s.currency === "USD" ? "$" : "C$"}${s.total_amount.toFixed(2)}</td>
              <td>${s.product_cost != null ? `C$${s.product_cost.toFixed(2)}` : "Pendiente"}</td>
              <td>${s.product_cost != null ? `C$${(s.total_amount - s.product_cost).toFixed(2)}` : "—"}</td>
              <td>${s.status === "completed" ? "Completada" : "Pendiente"}</td>
              <td>${format(new Date(s.sale_date), "dd/MM/yyyy", { locale: es })}</td>
            </tr>`).join('')}</tbody>
          </table>
          <div class="summary"><p>Total ventas: ${data.length}</p><p>Ingresos: C$${data.reduce((s, sale) => s + sale.total_amount, 0).toFixed(2)}</p></div>`;
        break;
      }
      case "employees": {
        title = "Reporte de Empleados";
        tableContent = `
          <table>
            <thead><tr><th>#</th><th>Nombre</th><th>Tipo</th><th>Comisión</th><th>Salario Base</th><th>Fecha Ingreso</th><th>Estado</th></tr></thead>
            <tbody>${employees.map((e, i) => `<tr>
              <td>${i + 1}</td>
              <td>${e.profiles?.full_name || "Sin nombre"}</td>
              <td>${(e as any).employee_type === "seller" ? "Vendedor" : "Técnico"}</td>
              <td>${e.monthly_commission_rate}%</td>
              <td>C$${(e.base_salary || 0).toFixed(2)}</td>
              <td>${format(new Date(e.hired_at), "dd/MM/yyyy", { locale: es })}</td>
              <td>${e.is_active ? "Activo" : "Inactivo"}</td>
            </tr>`).join('')}</tbody>
          </table>`;
        break;
      }
      case "earnings": {
        title = "Reporte de Ganancias de Empleados";
        const data = filterByDate(earnings);
        tableContent = `
          <table>
            <thead><tr><th>#</th><th>Empleado</th><th>Ingreso Bruto</th><th>Costo Partes</th><th>Ganancia Neta</th><th>Comisión</th><th>Fecha</th></tr></thead>
            <tbody>${data.map((e, i) => {
              const emp = employees.find(em => em.id === e.employee_id);
              return `<tr>
                <td>${i + 1}</td>
                <td>${emp?.profiles?.full_name || "Desconocido"}</td>
                <td>C$${e.gross_income.toFixed(2)}</td>
                <td>C$${e.parts_cost.toFixed(2)}</td>
                <td>C$${e.net_profit.toFixed(2)}</td>
                <td>C$${e.commission_earned.toFixed(2)}</td>
                <td>${format(new Date(e.earnings_date), "dd/MM/yyyy", { locale: es })}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <div class="summary"><p>Total registros: ${data.length}</p></div>`;
        break;
      }
      case "loans": {
        title = "Reporte de Préstamos";
        const data = filterByDate(loans);
        tableContent = `
          <table>
            <thead><tr><th>#</th><th>Empleado</th><th>Monto</th><th>Descripción</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>${data.map((l, i) => {
              const emp = employees.find(e => e.id === l.employee_id);
              return `<tr>
                <td>${i + 1}</td>
                <td>${emp?.profiles?.full_name || "Desconocido"}</td>
                <td>C$${l.amount.toFixed(2)}</td>
                <td>${l.description || "—"}</td>
                <td>${l.is_paid ? "Pagado" : "Pendiente"}</td>
                <td>${format(new Date(l.loan_date), "dd/MM/yyyy", { locale: es })}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <div class="summary"><p>Total préstamos: ${data.length}</p><p>Monto total: C$${data.reduce((s, l) => s + l.amount, 0).toFixed(2)}</p></div>`;
        break;
      }
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title} - ${brand.business_name}</title>
      <style>
        @media print { body { margin: 0; } }
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 900px; margin: 0 auto; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header h2 { margin: 5px 0; font-size: 16px; color: #666; }
        .header p { margin: 3px 0; color: #888; font-size: 11px; }
        .header img { max-height: 50px; margin: 0 auto 10px; display: block; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 6px 8px; text-align: left; border: 1px solid #ddd; font-size: 11px; }
        th { background: #f0f0f0; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        .summary { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 6px; }
        .summary p { margin: 3px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
      </style></head><body>
      <div class="header">
        ${workshop?.logo_url ? `<img src="${workshop.logo_url}" alt="${brand.business_name}" />` : ''}
        <h1>${brand.business_name}</h1>
        <h2>${title}</h2>
        <p>${rangeText}</p>
        <p>Generado: ${now}</p>
      </div>
      ${tableContent}
      <div class="footer"><p>Documento generado automáticamente · ${brand.business_name} · No afecta los datos del sistema</p></div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Exportar Datos</h1>
        <p className="text-sm text-muted-foreground">Genera copias de seguridad en PDF de tus registros</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Generar Reporte PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tipo de reporte</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="repairs"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" />Reparaciones</div></SelectItem>
                <SelectItem value="sales"><div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Ventas</div></SelectItem>
                <SelectItem value="employees"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Empleados</div></SelectItem>
                <SelectItem value="earnings"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />Ganancias de Empleados</div></SelectItem>
                <SelectItem value="loans"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />Préstamos</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desde (opcional)</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta (opcional)</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <Button onClick={generatePDF} className="w-full" size="lg">
            <FileDown className="h-5 w-5 mr-2" />
            Generar y Descargar PDF
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            El PDF se genera e imprime desde tu navegador. No afecta los datos del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportData;
