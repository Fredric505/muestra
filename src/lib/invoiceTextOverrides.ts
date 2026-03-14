export type InvoiceTextKey =
  | "sale_invoice_title"
  | "repair_invoice_title"
  | "quick_ticket_title"
  | "sale_warranty_note"
  | "repair_warranty_note"
  | "footer_note"
  | "repair_label_note";

export type InvoiceTextOverrides = Partial<Record<InvoiceTextKey, string>>;

const validKeys: InvoiceTextKey[] = [
  "sale_invoice_title",
  "repair_invoice_title",
  "quick_ticket_title",
  "sale_warranty_note",
  "repair_warranty_note",
  "footer_note",
  "repair_label_note",
];

export const normalizeInvoiceTextOverrides = (value: unknown): InvoiceTextOverrides => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: InvoiceTextOverrides = {};

  validKeys.forEach((key) => {
    const current = record[key];
    if (typeof current === "string") {
      normalized[key] = current;
    }
  });

  return normalized;
};

export const resolveInvoiceText = (
  overrides: InvoiceTextOverrides | undefined,
  key: InvoiceTextKey,
  fallback: string
): string => {
  const value = overrides?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};
