import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRepairs, Currency } from "@/hooks/useRepairs";
import { useBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Smartphone,
  User,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Wrench,
  Save,
  ArrowLeft,
  Package,
  Coins,
  Shield,
  Printer,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RepairLabel } from "@/components/RepairLabel";

const currencySymbols: Record<Currency, string> = {
  NIO: "C$",
  USD: "$",
};

const NewRepair = () => {
  const navigate = useNavigate();
  const { repairTypes, createRepair } = useRepairs();
  const { brand, defaultLogoUrl } = useBrand();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [partsCost, setPartsCost] = useState(0);
  const [currency, setCurrency] = useState<Currency>("NIO");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [savedRepair, setSavedRepair] = useState<any>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const netProfit = estimatedPrice - partsCost;
  const symbol = currencySymbols[currency];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const repair = {
      customer_name: formData.get("customer_name") as string,
      customer_phone: formData.get("customer_phone") as string,
      device_brand: formData.get("device_brand") as string,
      device_model: formData.get("device_model") as string,
      device_imei: formData.get("device_imei") as string || undefined,
      repair_type_id: formData.get("repair_type_id") as string || undefined,
      repair_description: formData.get("repair_description") as string || undefined,
      technical_notes: formData.get("technical_notes") as string || undefined,
      estimated_price: parseFloat(formData.get("estimated_price") as string) || 0,
      parts_cost: parseFloat(formData.get("parts_cost") as string) || 0,
      deposit: parseFloat(formData.get("deposit") as string) || 0,
      delivery_date: formData.get("delivery_date") as string || undefined,
      delivery_time: formData.get("delivery_time") as string || undefined,
      warranty_days: warrantyDays,
      currency,
      status: "received" as const,
    };

    try {
      const result = await createRepair.mutateAsync(repair);
      // Store repair data for printing
      setSavedRepair({
        ...repair,
        id: result.id,
        created_at: result.created_at,
      });
      setShowPrintDialog(true);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (ticketRef.current) {
      const printContent = ticketRef.current.innerHTML;
      const printWindow = window.open('', '_blank', 'width=300,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta ${brand.business_name}</title>
              <style>
                @page { size: 40mm 25mm; margin: 0; }
                @media print {
                  body { 
                    margin: 0; 
                    padding: 0; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: Arial, sans-serif;
                  font-size: 7px;
                  line-height: 1.2;
                  background: white;
                  color: black;
                }
                img { max-width: 8mm; height: auto; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleCloseAndNavigate = () => {
    setShowPrintDialog(false);
    navigate("/repairs");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nueva Reparación</h1>
          <p className="text-muted-foreground">
            Registra una nueva reparación en el sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nombre del cliente *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Teléfono (WhatsApp) *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  placeholder="+505 1234 5678"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Información del Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="device_brand">Marca *</Label>
              <Input
                id="device_brand"
                name="device_brand"
                placeholder="Samsung, Apple, Xiaomi..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_model">Modelo *</Label>
              <Input
                id="device_model"
                name="device_model"
                placeholder="Galaxy S21, iPhone 13..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_imei">IMEI (opcional)</Label>
              <Input
                id="device_imei"
                name="device_imei"
                placeholder="123456789012345"
              />
            </div>
          </CardContent>
        </Card>

        {/* Repair Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Detalles de la Reparación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="repair_type_id">Tipo de reparación</Label>
                <Select name="repair_type_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {repairTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda *</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger>
                    <Coins className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIO">C$ Córdobas</SelectItem>
                    <SelectItem value="USD">$ Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_price">Precio estimado *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    {symbol}
                  </span>
                  <Input
                    id="estimated_price"
                    name="estimated_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    required
                    onChange={(e) => setEstimatedPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="parts_cost">Costo de piezas</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="parts_cost"
                    name="parts_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    onChange={(e) => setPartsCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Ganancia neta estimada</Label>
                <div className={`p-3 rounded-lg border ${netProfit >= 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  <span className="text-lg font-bold">{symbol}{netProfit.toFixed(2)}</span>
                  <span className="text-sm ml-2 opacity-70">
                    (Precio: {symbol}{estimatedPrice.toFixed(2)} - Piezas: {symbol}{partsCost.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair_description">Descripción del problema</Label>
              <Textarea
                id="repair_description"
                name="repair_description"
                placeholder="Describe el problema o daño del dispositivo..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="technical_notes">Notas técnicas</Label>
              <Textarea
                id="technical_notes"
                name="technical_notes"
                placeholder="Notas adicionales para el técnico..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery, Payment & Warranty */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Entrega, Pago y Garantía
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Fecha de entrega</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_time">Hora de entrega</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="delivery_time"
                  name="delivery_time"
                  type="time"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Anticipo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  {symbol}
                </span>
                <Input
                  id="deposit"
                  name="deposit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_days">Días de garantía</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="warranty_days"
                  name="warranty_days"
                  type="number"
                  min="0"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 0)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Guardando..." : "Guardar Reparación"}
          </Button>
        </div>
      </form>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Reparación Guardada
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm mb-4">
              ¿Deseas imprimir la etiqueta para pegar en el dispositivo?
            </p>
            {savedRepair && (
              <div className="border rounded-lg overflow-hidden bg-white p-2 flex justify-center">
                <RepairLabel 
                  ref={ticketRef} 
                  repair={savedRepair}
                  businessName={brand.business_name}
                  tagline={brand.tagline}
                  logoUrl={brand.logo_url || defaultLogoUrl}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCloseAndNavigate}>
              No imprimir
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Etiqueta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewRepair;
