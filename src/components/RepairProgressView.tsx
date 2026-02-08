import { useMemo } from "react";
import { Repair, RepairStatus } from "@/hooks/useRepairs";
import { useBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Wrench,
  CheckCircle,
  Package,
  MessageCircle,
  ArrowRight,
  Phone,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface RepairProgressViewProps {
  repairs: Repair[];
  onAdvanceStatus: (id: string, currentStatus: RepairStatus) => void;
  onContact: (repair: Repair) => void;
}

const statusConfig: Record<
  RepairStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  received: {
    label: "Recibidos",
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
  },
  in_progress: {
    label: "En Progreso",
    icon: Wrench,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  ready: {
    label: "Listos",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/30",
  },
  delivered: {
    label: "Entregados",
    icon: Package,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10 border-gray-500/30",
  },
  failed: {
    label: "Fallidos",
    icon: Package,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
  },
};

const getWhatsAppMessage = (repair: Repair, businessName: string): string => {
  const deviceInfo = `${repair.device_brand} ${repair.device_model}`;
  const customerName = repair.customer_name;

  switch (repair.status) {
    case "received":
      return `Hola ${customerName}, confirmamos que hemos recibido su ${deviceInfo} para reparación. Le mantendremos informado del progreso. Gracias por confiar en ${businessName}.`;
    case "in_progress":
      return `Hola ${customerName}, le informamos que estamos trabajando en la reparación de su ${deviceInfo}. Le notificaremos cuando esté listo. Gracias por su paciencia.`;
    case "ready":
      return `¡Buenas noticias ${customerName}! Su ${deviceInfo} ya está reparado y listo para recoger. Puede pasar a nuestra tienda ${businessName} cuando guste. ¡Gracias por su preferencia!`;
    case "delivered":
      return `Hola ${customerName}, esperamos que su ${deviceInfo} esté funcionando correctamente. Si tiene alguna consulta sobre la reparación, no dude en contactarnos. ¡Gracias por elegir ${businessName}!`;
    case "failed":
      return `Hola ${customerName}, lamentamos informarle que no fue posible reparar su ${deviceInfo}. ${repair.failure_reason ? `Motivo: ${repair.failure_reason}. ` : ""}Puede pasar a recoger su dispositivo en ${businessName}. Disculpe las molestias.`;
    default:
      return `Hola ${customerName}, le contactamos desde ${businessName} sobre su ${deviceInfo}.`;
  }
};

export function RepairProgressView({
  repairs,
  onAdvanceStatus,
  onContact,
}: RepairProgressViewProps) {
  const { brand } = useBrand();
  
  const repairsByStatus = useMemo(() => {
    const grouped: Record<RepairStatus, Repair[]> = {
      received: [],
      in_progress: [],
      ready: [],
      delivered: [],
      failed: [],
    };

    repairs.forEach((repair) => {
      if (grouped[repair.status]) {
        grouped[repair.status].push(repair);
      }
    });

    return grouped;
  }, [repairs]);

  const activeStatuses: RepairStatus[] = ["received", "in_progress", "ready"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {activeStatuses.map((status) => {
        const config = statusConfig[status];
        const StatusIcon = config.icon;
        const statusRepairs = repairsByStatus[status];

        return (
          <Card key={status} className={`border ${config.bgColor}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
                <span>{config.label}</span>
                <Badge variant="secondary" className="ml-auto">
                  {statusRepairs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-2">
                  {statusRepairs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sin reparaciones
                    </p>
                  ) : (
                    statusRepairs.map((repair) => (
                      <div
                        key={repair.id}
                        className="p-3 rounded-lg bg-card border border-border space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {repair.customer_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {repair.device_brand} {repair.device_model}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(repair.created_at), "dd MMM", {
                              locale: es,
                            })}
                          </span>
                        </div>

                        {repair.repair_types?.name && (
                          <Badge variant="outline" className="text-xs">
                            {repair.repair_types.name}
                          </Badge>
                        )}

                        {repair.repair_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {repair.repair_description}
                          </p>
                        )}

                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-8 text-xs"
                            onClick={() => {
                              const message = getWhatsAppMessage(repair, brand.business_name);
                              const phone = repair.customer_phone.replace(
                                /\D/g,
                                ""
                              );
                              window.open(
                                `https://wa.me/${phone}?text=${encodeURIComponent(
                                  message
                                )}`,
                                "_blank"
                              );
                            }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Button>
                          {status !== "delivered" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 h-8 text-xs"
                              onClick={() => onAdvanceStatus(repair.id, status)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Avanzar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { getWhatsAppMessage };
