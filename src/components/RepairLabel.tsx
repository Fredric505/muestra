import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RepairLabelProps {
  repair: {
    id: string;
    customer_name: string;
    customer_phone: string;
    device_brand: string;
    device_model: string;
    repair_description?: string;
    created_at: string;
  };
  businessName: string;
  tagline: string;
  logoUrl: string;
}

export const RepairLabel = forwardRef<HTMLDivElement, RepairLabelProps>(
  ({ repair, businessName, tagline, logoUrl }, ref) => {
    const ticketNumber = repair.id.slice(-4).toUpperCase();
    const entryDate = format(new Date(repair.created_at), "dd/MM/yy", { locale: es });

    return (
      <div
        ref={ref}
        className="bg-white text-black font-sans"
        style={{ 
          width: "40mm", 
          minHeight: "25mm",
          padding: "2mm",
          fontSize: "7px",
          lineHeight: "1.2"
        }}
      >
        {/* Header with logo */}
        <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-1">
          <div className="flex items-center gap-1">
            <img 
              src={logoUrl} 
              alt={businessName} 
              style={{ width: "8mm", height: "8mm", objectFit: "contain" }}
            />
            <div className="font-bold" style={{ fontSize: "8px" }}>{businessName}</div>
          </div>
          <div className="text-right font-bold" style={{ fontSize: "9px" }}>
            #{ticketNumber}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-0.5">
          <div className="flex">
            <span className="font-bold" style={{ width: "12mm" }}>Cliente:</span>
            <span className="flex-1 truncate">{repair.customer_name}</span>
          </div>
          <div className="flex">
            <span className="font-bold" style={{ width: "12mm" }}>Tel:</span>
            <span className="flex-1">{repair.customer_phone}</span>
          </div>
          <div className="flex">
            <span className="font-bold" style={{ width: "12mm" }}>Modelo:</span>
            <span className="flex-1 truncate">{repair.device_brand} {repair.device_model}</span>
          </div>
          {repair.repair_description && (
            <div className="flex">
              <span className="font-bold" style={{ width: "12mm" }}>Falla:</span>
              <span className="flex-1 truncate">{repair.repair_description}</span>
            </div>
          )}
          <div className="flex">
            <span className="font-bold" style={{ width: "12mm" }}>Ingreso:</span>
            <span className="flex-1">{entryDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 mt-1 pt-0.5 text-center" style={{ fontSize: "6px" }}>
          <span className="opacity-70">{tagline}</span>
        </div>
      </div>
    );
  }
);

RepairLabel.displayName = "RepairLabel";
