import { forwardRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RepairTicketProps {
  repair: {
    id: string;
    customer_name: string;
    customer_phone: string;
    device_brand: string;
    device_model: string;
    device_imei?: string;
    repair_description?: string;
    estimated_price: number;
    deposit?: number;
    delivery_date?: string;
    delivery_time?: string;
    warranty_days?: number;
    currency: string;
    created_at: string;
  };
}

const currencySymbols: Record<string, string> = {
  NIO: "C$",
  USD: "$",
};

export const RepairTicket = forwardRef<HTMLDivElement, RepairTicketProps>(
  ({ repair }, ref) => {
    const symbol = currencySymbols[repair.currency] || "C$";
    const ticketNumber = repair.id.slice(-8).toUpperCase();

    return (
      <div
        ref={ref}
        className="bg-white text-black p-3 font-mono text-xs"
        style={{ width: "58mm", minHeight: "80mm" }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-bold text-sm">REPAIR TECH</div>
          <div className="text-[10px]">Servicio Técnico de Celulares</div>
          <div className="text-[10px] mt-1">📞 WhatsApp disponible</div>
        </div>

        {/* Ticket Number */}
        <div className="text-center border border-gray-400 py-1 mb-2">
          <div className="text-[10px]">TICKET #</div>
          <div className="font-bold text-lg tracking-wider">{ticketNumber}</div>
        </div>

        {/* Device Info */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-bold mb-1">DISPOSITIVO:</div>
          <div>{repair.device_brand} {repair.device_model}</div>
          {repair.device_imei && (
            <div className="text-[10px]">IMEI: {repair.device_imei}</div>
          )}
        </div>

        {/* Customer */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-bold mb-1">CLIENTE:</div>
          <div>{repair.customer_name}</div>
          <div>{repair.customer_phone}</div>
        </div>

        {/* Repair Details */}
        {repair.repair_description && (
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="font-bold mb-1">PROBLEMA:</div>
            <div className="text-[10px] break-words">{repair.repair_description}</div>
          </div>
        )}

        {/* Pricing */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="flex justify-between">
            <span>Precio Est:</span>
            <span className="font-bold">{symbol}{repair.estimated_price.toFixed(2)}</span>
          </div>
          {repair.deposit && repair.deposit > 0 && (
            <div className="flex justify-between">
              <span>Anticipo:</span>
              <span>{symbol}{repair.deposit.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Resta:</span>
            <span>{symbol}{(repair.estimated_price - (repair.deposit || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Dates */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
          <div className="flex justify-between">
            <span>Ingreso:</span>
            <span>{format(new Date(repair.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
          </div>
          {repair.delivery_date && (
            <div className="flex justify-between">
              <span>Entrega:</span>
              <span>
                {format(new Date(repair.delivery_date), "dd/MM/yyyy", { locale: es })}
                {repair.delivery_time && ` ${repair.delivery_time}`}
              </span>
            </div>
          )}
        </div>

        {/* Warranty */}
        <div className="text-center text-[10px] border border-gray-400 py-1 mb-2">
          <div className="font-bold">GARANTÍA: {repair.warranty_days || 0} DÍAS</div>
          <div>Conserve este ticket</div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600">
          <div>Gracias por su preferencia</div>
          <div>- - - - - - - - - - - - - - - -</div>
        </div>
      </div>
    );
  }
);

RepairTicket.displayName = "RepairTicket";
