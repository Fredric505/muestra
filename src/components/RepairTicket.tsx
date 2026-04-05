import { forwardRef } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "@/lib/dateLocale";
import { getCurrencySymbol } from "@/lib/currency";

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

// Keep for backward compat but prefer getCurrencySymbol

export const RepairTicket = forwardRef<HTMLDivElement, RepairTicketProps>(
  ({ repair }, ref) => {
    const { t, i18n } = useTranslation();
    const dateLoc = getDateLocale(i18n.language);
    const symbol = getCurrencySymbol(repair.currency);
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
          <div className="text-[10px]">{t("repairTicket.techService")}</div>
          <div className="text-[10px] mt-1">📞 {t("repairTicket.whatsappAvailable")}</div>
        </div>

        {/* Ticket Number */}
        <div className="text-center border border-gray-400 py-1 mb-2">
          <div className="text-[10px]">{t("invoice.ticket")} #</div>
          <div className="font-bold text-lg tracking-wider">{ticketNumber}</div>
        </div>

        {/* Device Info */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-bold mb-1">{t("repairTicket.deviceLabel")}</div>
          <div>{repair.device_brand} {repair.device_model}</div>
          {repair.device_imei && (
            <div className="text-[10px]">IMEI: {repair.device_imei}</div>
          )}
        </div>

        {/* Customer */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="font-bold mb-1">{t("repairTicket.customerLabel")}</div>
          <div>{repair.customer_name}</div>
          <div>{repair.customer_phone}</div>
        </div>

        {/* Repair Details */}
        {repair.repair_description && (
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="font-bold mb-1">{t("repairTicket.problem")}</div>
            <div className="text-[10px] break-words">{repair.repair_description}</div>
          </div>
        )}

        {/* Pricing */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <div className="flex justify-between">
            <span>{t("repairTicket.estPrice")}</span>
            <span className="font-bold">{symbol}{repair.estimated_price.toFixed(2)}</span>
          </div>
          {repair.deposit && repair.deposit > 0 && (
            <div className="flex justify-between">
              <span>{t("repairTicket.depositLabel")}</span>
              <span>{symbol}{repair.deposit.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>{t("repairTicket.remainingLabel")}</span>
            <span>{symbol}{(repair.estimated_price - (repair.deposit || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Dates */}
        <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
          <div className="flex justify-between">
            <span>{t("repairTicket.entry")}</span>
            <span>{format(new Date(repair.created_at), "dd/MM/yyyy HH:mm", { locale: dateLoc })}</span>
          </div>
          {repair.delivery_date && (
            <div className="flex justify-between">
              <span>{t("repairTicket.deliveryLabel")}</span>
              <span>
                {format(new Date(repair.delivery_date), "dd/MM/yyyy", { locale: dateLoc })}
                {repair.delivery_time && ` ${repair.delivery_time}`}
              </span>
            </div>
          )}
        </div>

        {/* Warranty */}
        <div className="text-center text-[10px] border border-gray-400 py-1 mb-2">
          <div className="font-bold">{t("repairTicket.warrantyLabel")} {repair.warranty_days || 0} {t("repairTicket.daysLabel")}</div>
          <div>{t("repairTicket.keepTicket")}</div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600">
          <div>{t("repairTicket.thanks")}</div>
          <div>- - - - - - - - - - - - - - - -</div>
        </div>
      </div>
    );
  }
);

RepairTicket.displayName = "RepairTicket";
