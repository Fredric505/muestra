import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ReceiptText } from "lucide-react";
import { InvoiceTextKey, InvoiceTextOverrides, resolveInvoiceText } from "@/lib/invoiceTextOverrides";

interface InvoiceTextCustomizerProps {
  value: InvoiceTextOverrides;
  onChange: (next: InvoiceTextOverrides) => void;
}

const fields: { key: InvoiceTextKey; isLong?: boolean; labelKey: string; fallbackKey: string }[] = [
  { key: "sale_invoice_title", labelKey: "settings.saleInvoiceTitle", fallbackKey: "invoice.invoiceTitle" },
  { key: "repair_invoice_title", labelKey: "settings.repairInvoiceTitle", fallbackKey: "invoice.serviceOrder" },
  { key: "quick_ticket_title", labelKey: "settings.quickTicketTitle", fallbackKey: "invoice.ticket" },
  { key: "repair_label_note", labelKey: "settings.repairLabelNote", fallbackKey: "repairTicket.techService" },
  { key: "footer_note", labelKey: "settings.footerNote", fallbackKey: "invoice.legalNote", isLong: true },
  { key: "sale_warranty_note", labelKey: "settings.saleWarrantyNote", fallbackKey: "invoice.warrantyProductNote", isLong: true },
  { key: "repair_warranty_note", labelKey: "settings.repairWarrantyNote", fallbackKey: "invoice.warrantyRepairNote", isLong: true },
];

export const InvoiceTextCustomizer = ({ value, onChange }: InvoiceTextCustomizerProps) => {
  const { t } = useTranslation();

  const previews = useMemo(
    () => ({
      saleTitle: resolveInvoiceText(value, "sale_invoice_title", t("invoice.invoiceTitle")),
      repairTitle: resolveInvoiceText(value, "repair_invoice_title", t("invoice.serviceOrder")),
      ticketTitle: resolveInvoiceText(value, "quick_ticket_title", t("invoice.ticket")),
      repairLabel: resolveInvoiceText(value, "repair_label_note", t("repairTicket.techService")),
      footer: resolveInvoiceText(value, "footer_note", t("invoice.legalNote")),
    }),
    [value, t]
  );

  const handleField = (key: InvoiceTextKey, newValue: string) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t("settings.invoiceTexts")}
        </CardTitle>
        <CardDescription>{t("settings.invoiceTextsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const control = field.isLong ? (
              <Textarea
                rows={3}
                value={value[field.key] || ""}
                onChange={(e) => handleField(field.key, e.target.value)}
                placeholder={t(field.fallbackKey)}
              />
            ) : (
              <Input
                value={value[field.key] || ""}
                onChange={(e) => handleField(field.key, e.target.value)}
                placeholder={t(field.fallbackKey)}
              />
            );

            return (
              <div key={field.key} className={field.isLong ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                <Label>{t(field.labelKey)}</Label>
                {control}
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("settings.previewInvoice")}</p>
            <p className="font-semibold text-card-foreground">{previews.saleTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{previews.footer}</p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">{t("settings.previewRepairInvoice")}</p>
            <p className="font-semibold text-card-foreground">{previews.repairTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{previews.footer}</p>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <ReceiptText className="h-3.5 w-3.5" />
              {t("settings.previewTicket")}
            </p>
            <p className="font-semibold text-card-foreground">{previews.ticketTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{previews.repairLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
