import { format } from "date-fns";
import type { Locale } from "date-fns";

type TFunction = (key: string, opts?: any) => string;

interface SaleForInvoice {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  sale_date: string;
  total_amount: number;
  currency: string;
  sale_items?: {
    product_name: string;
    quantity: number;
    unit_price: number;
    condition?: string | null;
    warranty_days?: number | null;
    condition_notes?: string | null;
    device_photo_url?: string | null;
  }[];
}

interface BrandInfo {
  business_name: string;
  tagline?: string | null;
  logo_url?: string | null;
}

interface WorkshopInfo {
  phone?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  logo_url?: string | null;
  currency?: string;
}

const getCurrencySymbol = (currency: string) => {
  const map: Record<string, string> = {
    USD: "$", NIO: "C$", MXN: "$", COP: "$", ARS: "$", PEN: "S/", CRC: "₡",
    GTQ: "Q", HNL: "L", PAB: "B/.", DOP: "RD$", BOB: "Bs", EUR: "€",
  };
  return map[currency] || currency;
};

/** Unified invoice for phones/repairs — supports letter, commercial (22×14.3cm), and ticket sizes */
export const printLetterInvoice = (sale: SaleForInvoice, brand: BrandInfo, workshop: WorkshopInfo | null, t: TFunction, dateLoc: Locale, invoiceSize: string = 'commercial') => {
  const symbol = getCurrencySymbol(sale.currency);
  const items = sale.sale_items || [];
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;

  w.document.write(`<!DOCTYPE html><html><head><title>${t("invoice.invoiceTitle")} ${sale.id.slice(0, 8).toUpperCase()}</title>
<style>
  @page { size: ${invoiceSize === 'commercial' ? '220mm 143mm' : 'letter'}; margin: ${invoiceSize === 'commercial' ? '8mm' : '15mm'}; }
  @media print { body { margin: 0; } .no-print { display: none; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: ${invoiceSize === 'commercial' ? '12px' : '30px'}; max-width: ${invoiceSize === 'commercial' ? '210mm' : '800px'}; margin: 0 auto; font-size: ${invoiceSize === 'commercial' ? '10px' : '13px'}; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #222; padding-bottom: ${invoiceSize === 'commercial' ? '8px' : '16px'}; margin-bottom: ${invoiceSize === 'commercial' ? '10px' : '20px'}; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-left img { max-height: ${invoiceSize === 'commercial' ? '40px' : '65px'}; border-radius: 8px; }
  .header-left h1 { font-size: ${invoiceSize === 'commercial' ? '15px' : '22px'}; margin: 0; }
  .header-left p { color: #666; font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; margin: 2px 0; }
  .header-right { text-align: right; font-size: 12px; color: #555; }
  .header-right .inv-num { font-size: ${invoiceSize === 'commercial' ? '13px' : '18px'}; font-weight: bold; color: #222; }
  .section { margin-bottom: ${invoiceSize === 'commercial' ? '8px' : '18px'}; }
  .section-title { font-size: ${invoiceSize === 'commercial' ? '9px' : '11px'}; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: ${invoiceSize === 'commercial' ? '3px' : '6px'}; font-weight: 600; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: ${invoiceSize === 'commercial' ? '8px' : '16px'}; }
  .info-box { background: #f7f7f7; padding: ${invoiceSize === 'commercial' ? '8px' : '14px'}; border-radius: 8px; }
  .info-box p { margin: 3px 0; font-size: 13px; }
  .info-box strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: ${invoiceSize === 'commercial' ? '6px 0' : '16px 0'}; }
  thead th { background: #333; color: #fff; padding: ${invoiceSize === 'commercial' ? '5px 8px' : '10px 12px'}; text-align: left; font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:last-child { text-align: right; }
  tbody td { padding: ${invoiceSize === 'commercial' ? '5px 8px' : '10px 12px'}; border-bottom: 1px solid #e0e0e0; font-size: ${invoiceSize === 'commercial' ? '10px' : '13px'}; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .totals { display: flex; justify-content: flex-end; margin: 10px 0 30px; }
  .totals-box { min-width: ${invoiceSize === 'commercial' ? '180px' : '250px'}; }
  .totals-row { display: flex; justify-content: space-between; padding: ${invoiceSize === 'commercial' ? '3px 0' : '6px 0'}; font-size: ${invoiceSize === 'commercial' ? '11px' : '14px'}; }
  .totals-row.total { border-top: 3px solid #222; padding-top: ${invoiceSize === 'commercial' ? '6px' : '10px'}; margin-top: ${invoiceSize === 'commercial' ? '3px' : '6px'}; font-size: ${invoiceSize === 'commercial' ? '13px' : '18px'}; font-weight: bold; }
  .photos { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
  .photos img { max-width: 180px; max-height: 180px; border-radius: 8px; border: 1px solid #ddd; object-fit: cover; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: ${invoiceSize === 'commercial' ? '20px' : '40px'}; margin-top: ${invoiceSize === 'commercial' ? '15px' : '50px'}; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 2px solid #222; margin-top: ${invoiceSize === 'commercial' ? '25px' : '60px'}; padding-top: 8px; }
  .sig-label { font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; color: #666; }
  .warranty-box { background: #f0f9f0; border: 1px solid #c3e6c3; border-radius: 8px; padding: ${invoiceSize === 'commercial' ? '8px' : '14px'}; margin: ${invoiceSize === 'commercial' ? '8px 0' : '20px 0'}; text-align: center; }
  .warranty-box strong { color: #2d7a2d; }
  .footer { text-align: center; margin-top: ${invoiceSize === 'commercial' ? '10px' : '30px'}; padding-top: ${invoiceSize === 'commercial' ? '6px' : '16px'}; border-top: 1px solid #ddd; font-size: ${invoiceSize === 'commercial' ? '8px' : '11px'}; color: #999; }
  .stamp-area { display: flex; justify-content: center; margin-top: ${invoiceSize === 'commercial' ? '8px' : '20px'}; }
  .stamp-box { width: ${invoiceSize === 'commercial' ? '80px' : '140px'}; height: ${invoiceSize === 'commercial' ? '80px' : '140px'}; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: ${invoiceSize === 'commercial' ? '9px' : '11px'}; }
</style></head><body>

<div class="header">
  <div class="header-left">
    ${(workshop?.logo_url || brand.logo_url) ? `<img src="${workshop?.logo_url || brand.logo_url}" alt="${brand.business_name}" />` : ''}
    <div>
      <h1>${brand.business_name}</h1>
      ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
      ${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}
      ${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}
      ${workshop?.email ? `<p>✉ ${workshop.email}</p>` : ''}
    </div>
  </div>
  <div class="header-right">
    <div class="inv-num">${t("invoice.invoiceTitle")}</div>
    <div style="font-size:16px; font-weight:bold; margin:4px 0;">#${sale.id.slice(0, 8).toUpperCase()}</div>
    <div>${t("invoice.date")}: ${format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: dateLoc })}</div>
  </div>
</div>

<div class="section">
  <div class="info-grid">
    <div class="info-box">
      <div class="section-title">${t("invoice.clientData")}</div>
      <p><strong>${sale.customer_name}</strong></p>
      ${sale.customer_phone ? `<p>📞 ${sale.customer_phone}</p>` : ''}
    </div>
    <div class="info-box">
      <div class="section-title">${t("invoice.saleInfo")}</div>
      <p>${t("invoice.date")}: ${format(new Date(sale.sale_date), "PPP", { locale: dateLoc })}</p>
      <p>${t("invoice.invoiceNum")}: #${sale.id.slice(0, 8).toUpperCase()}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">${t("invoice.productDetails")}</div>
  <table>
    <thead><tr><th>#</th><th>${t("invoice.description")}</th><th>${t("invoice.condition")}</th><th>${t("invoice.warranty")}</th><th>${t("invoice.qty")}</th><th>${t("invoice.unitPrice")}</th><th>${t("invoice.subtotal")}</th></tr></thead>
    <tbody>
      ${items.map((item, i) => `<tr>
        <td>${i + 1}</td>
        <td>${item.product_name}${item.condition_notes ? `<br><small style="color:#888">${item.condition_notes}</small>` : ''}</td>
        <td>${item.condition || t("invoice.na")}</td>
        <td>${item.warranty_days || 0} ${t("invoice.days")}</td>
        <td>${item.quantity}</td>
        <td>${symbol}${item.unit_price.toFixed(2)}</td>
        <td>${symbol}${(item.unit_price * item.quantity).toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

${items.some(i => i.device_photo_url) ? `<div class="section"><div class="section-title">${t("invoice.devicePhotos")}</div><div class="photos">${items.filter(i => i.device_photo_url).map(i => `<img src="${i.device_photo_url}" alt="${i.product_name}" />`).join('')}</div></div>` : ''}

<div class="totals">
  <div class="totals-box">
    <div class="totals-row"><span>${t("invoice.subtotal")}:</span><span>${symbol}${sale.total_amount.toFixed(2)}</span></div>
    <div class="totals-row total"><span>${t("invoice.total")}:</span><span>${symbol}${sale.total_amount.toFixed(2)}</span></div>
  </div>
</div>

${items.some(i => i.warranty_days && i.warranty_days > 0) ? `<div class="warranty-box"><strong>${t("invoice.warrantyTitle")}</strong><br>${t("invoice.warrantyProductNote")}</div>` : ''}

<div class="signatures">
  <div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.clientSignature")}</div><div class="sig-label">${sale.customer_name}</div></div></div>
  <div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.authorizedSignature")}</div><div class="sig-label">${brand.business_name}</div></div></div>
</div>

<div class="stamp-area"><div class="stamp-box">${t("invoice.workshopStamp")}</div></div>

<div class="footer">
  <p>${brand.business_name} · ${t("invoice.thankPurchase")}</p>
  <p>${t("invoice.legalNote")}</p>
</div>

</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
};

/** Small ticket/receipt for accessories — supermarket style */
export const printTicketInvoice = (sale: SaleForInvoice, brand: BrandInfo, workshop: WorkshopInfo | null, t: TFunction, dateLoc: Locale) => {
  const symbol = getCurrencySymbol(sale.currency);
  const items = sale.sale_items || [];
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;

  w.document.write(`<!DOCTYPE html><html><head><title>${t("invoice.ticket")} ${sale.id.slice(0, 8).toUpperCase()}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  @media print { body { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; color: #000; padding: 8px; width: 76mm; font-size: 11px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 14px; margin: 0; }
  .header p { font-size: 10px; color: #444; margin: 1px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .item { padding: 3px 0; border-bottom: 1px dotted #ccc; }
  .item-name { font-size: 11px; }
  .item-detail { font-size: 10px; color: #555; }
  .total-section { margin-top: 8px; padding-top: 6px; border-top: 2px solid #000; }
  .total { font-size: 16px; font-weight: bold; text-align: right; }
  .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #888; }
</style></head><body>

<div class="header">
  <h1>${brand.business_name}</h1>
  ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
  ${workshop?.address ? `<p>${workshop.address}</p>` : ''}
  ${workshop?.phone ? `<p>${t("invoice.tel")}: ${workshop.phone}</p>` : ''}
</div>

<div class="divider"></div>

<div class="center" style="margin-bottom:6px;">
  <div class="bold">${t("invoice.ticket")} #${sale.id.slice(0, 8).toUpperCase()}</div>
  <div style="font-size:10px;">${format(new Date(sale.sale_date), "dd/MM/yyyy HH:mm", { locale: dateLoc })}</div>
</div>

<div class="row"><span>${t("invoice.client")}:</span><span class="bold">${sale.customer_name}</span></div>
${sale.customer_phone ? `<div class="row"><span>${t("invoice.tel")}:</span><span>${sale.customer_phone}</span></div>` : ''}

<div class="divider"></div>

${items.map(item => `<div class="item">
  <div class="item-name">${item.product_name}</div>
  <div class="row">
    <span class="item-detail">${item.quantity} x ${symbol}${item.unit_price.toFixed(2)}</span>
    <span class="bold">${symbol}${(item.unit_price * item.quantity).toFixed(2)}</span>
  </div>
  ${item.warranty_days && item.warranty_days > 0 ? `<div class="item-detail">${t("invoice.warranty")}: ${item.warranty_days} ${t("invoice.days")}</div>` : ''}
</div>`).join('')}

<div class="total-section">
  <div class="row total"><span>${t("invoice.total")}:</span><span>${symbol}${sale.total_amount.toFixed(2)}</span></div>
</div>

<div class="divider"></div>

<div class="footer">
  <p>${t("invoice.keepTicket")}</p>
  <p>${t("invoice.thankPurchase")}</p>
  <p>${brand.business_name}</p>
  <p>- - - - - - - - - - - - - - - -</p>
</div>

</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
};

/** Invoice for repairs — supports letter, commercial (22×14.3cm) sizes */
export const printRepairInvoice = (repair: any, brand: BrandInfo, workshop: WorkshopInfo | null, t: TFunction, dateLoc: Locale, invoiceSize: string = 'commercial') => {
  const symbol = getCurrencySymbol(repair.currency || workshop?.currency || "USD");
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;

  w.document.write(`<!DOCTYPE html><html><head><title>${t("invoice.serviceOrder")} ${repair.id.slice(0, 8).toUpperCase()}</title>
<style>
  @page { size: ${invoiceSize === 'commercial' ? '220mm 143mm' : 'letter'}; margin: ${invoiceSize === 'commercial' ? '8mm' : '15mm'}; }
  @media print { body { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: ${invoiceSize === 'commercial' ? '12px' : '30px'}; max-width: ${invoiceSize === 'commercial' ? '210mm' : '800px'}; margin: 0 auto; font-size: ${invoiceSize === 'commercial' ? '10px' : '13px'}; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #222; padding-bottom: ${invoiceSize === 'commercial' ? '8px' : '16px'}; margin-bottom: ${invoiceSize === 'commercial' ? '10px' : '20px'}; }
  .header-left { display: flex; align-items: center; gap: ${invoiceSize === 'commercial' ? '10px' : '16px'}; }
  .header-left img { max-height: ${invoiceSize === 'commercial' ? '40px' : '65px'}; border-radius: 8px; }
  .header-left h1 { font-size: ${invoiceSize === 'commercial' ? '15px' : '22px'}; }
  .header-left p { color: #666; font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; margin: 2px 0; }
  .header-right { text-align: right; }
  .header-right .inv-num { font-size: ${invoiceSize === 'commercial' ? '13px' : '18px'}; font-weight: bold; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: ${invoiceSize === 'commercial' ? '8px' : '16px'}; margin-bottom: ${invoiceSize === 'commercial' ? '10px' : '20px'}; }
  .info-box { background: #f7f7f7; padding: ${invoiceSize === 'commercial' ? '8px' : '14px'}; border-radius: 8px; }
  .info-box p { margin: 3px 0; font-size: ${invoiceSize === 'commercial' ? '10px' : '13px'}; }
  .section-title { font-size: ${invoiceSize === 'commercial' ? '9px' : '11px'}; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: ${invoiceSize === 'commercial' ? '3px' : '6px'}; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: ${invoiceSize === 'commercial' ? '6px 0' : '16px 0'}; }
  thead th { background: #333; color: #fff; padding: ${invoiceSize === 'commercial' ? '5px 8px' : '10px 12px'}; text-align: left; font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; }
  thead th:last-child { text-align: right; }
  tbody td { padding: ${invoiceSize === 'commercial' ? '5px 8px' : '10px 12px'}; border-bottom: 1px solid #e0e0e0; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { display: flex; justify-content: flex-end; margin: ${invoiceSize === 'commercial' ? '6px 0 10px' : '10px 0 30px'}; }
  .totals-box { min-width: ${invoiceSize === 'commercial' ? '180px' : '250px'}; }
  .totals-row { display: flex; justify-content: space-between; padding: ${invoiceSize === 'commercial' ? '3px 0' : '6px 0'}; font-size: ${invoiceSize === 'commercial' ? '11px' : '14px'}; }
  .totals-row.total { border-top: 3px solid #222; padding-top: ${invoiceSize === 'commercial' ? '6px' : '10px'}; font-size: ${invoiceSize === 'commercial' ? '13px' : '18px'}; font-weight: bold; }
  .warranty-box { background: #f0f9f0; border: 1px solid #c3e6c3; border-radius: 8px; padding: ${invoiceSize === 'commercial' ? '8px' : '14px'}; margin: ${invoiceSize === 'commercial' ? '8px 0' : '20px 0'}; text-align: center; }
  .warranty-box strong { color: #2d7a2d; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: ${invoiceSize === 'commercial' ? '20px' : '40px'}; margin-top: ${invoiceSize === 'commercial' ? '15px' : '50px'}; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 2px solid #222; margin-top: ${invoiceSize === 'commercial' ? '25px' : '60px'}; padding-top: 8px; }
  .sig-label { font-size: ${invoiceSize === 'commercial' ? '9px' : '12px'}; color: #666; }
  .stamp-area { display: flex; justify-content: center; margin-top: ${invoiceSize === 'commercial' ? '8px' : '20px'}; }
  .stamp-box { width: ${invoiceSize === 'commercial' ? '80px' : '140px'}; height: ${invoiceSize === 'commercial' ? '80px' : '140px'}; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: ${invoiceSize === 'commercial' ? '9px' : '11px'}; }
  .footer { text-align: center; margin-top: ${invoiceSize === 'commercial' ? '10px' : '30px'}; padding-top: ${invoiceSize === 'commercial' ? '6px' : '16px'}; border-top: 1px solid #ddd; font-size: ${invoiceSize === 'commercial' ? '8px' : '11px'}; color: #999; }
</style></head><body>

<div class="header">
  <div class="header-left">
    ${(workshop?.logo_url || brand.logo_url) ? `<img src="${workshop?.logo_url || brand.logo_url}" alt="${brand.business_name}" />` : ''}
    <div>
      <h1>${brand.business_name}</h1>
      ${brand.tagline ? `<p>${brand.tagline}</p>` : ''}
      ${workshop?.address ? `<p>📍 ${workshop.address}</p>` : ''}
      ${workshop?.phone ? `<p>📞 ${workshop.phone}</p>` : ''}
    </div>
  </div>
  <div class="header-right">
    <div class="inv-num">${t("invoice.serviceOrder")}</div>
    <div style="font-size:16px; font-weight:bold; margin:4px 0;">#${repair.id.slice(0, 8).toUpperCase()}</div>
    <div style="font-size:12px; color:#555;">${t("invoice.date")}: ${format(new Date(repair.created_at), "dd/MM/yyyy", { locale: dateLoc })}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <div class="section-title">${t("invoice.clientData")}</div>
    <p><strong>${repair.customer_name}</strong></p>
    <p>📞 ${repair.customer_phone}</p>
  </div>
  <div class="info-box">
    <div class="section-title">${t("invoice.device")}</div>
    <p><strong>${repair.device_brand} ${repair.device_model}</strong></p>
    ${repair.device_imei ? `<p>IMEI: ${repair.device_imei}</p>` : ''}
  </div>
</div>

${repair.repair_description ? `<div class="info-box" style="margin-bottom:16px;"><div class="section-title">${t("invoice.description")}</div><p>${repair.repair_description}</p></div>` : ''}

<table>
  <thead><tr><th>${t("invoice.concept")}</th><th>${t("invoice.detail")}</th><th>${t("invoice.amount")}</th></tr></thead>
  <tbody>
    <tr><td>${t("invoice.repairService")}</td><td>${repair.repair_types?.name || t("invoice.generalRepair")}</td><td>${symbol}${(repair.final_price || repair.estimated_price).toFixed(2)}</td></tr>
    ${repair.deposit && repair.deposit > 0 ? `<tr><td>${t("invoice.depositReceived")}</td><td>—</td><td>-${symbol}${repair.deposit.toFixed(2)}</td></tr>` : ''}
  </tbody>
</table>

<div class="totals">
  <div class="totals-box">
    <div class="totals-row"><span>${t("invoice.price")}:</span><span>${symbol}${(repair.final_price || repair.estimated_price).toFixed(2)}</span></div>
    ${repair.deposit && repair.deposit > 0 ? `<div class="totals-row"><span>${t("invoice.deposit")}:</span><span>-${symbol}${repair.deposit.toFixed(2)}</span></div>` : ''}
    <div class="totals-row total"><span>${t("invoice.toPay")}:</span><span>${symbol}${((repair.final_price || repair.estimated_price) - (repair.deposit || 0)).toFixed(2)}</span></div>
  </div>
</div>

${repair.delivery_date ? `<div class="info-box" style="margin-bottom:16px;"><div class="section-title">${t("invoice.estimatedDelivery")}</div><p>${format(new Date(repair.delivery_date), "PPP", { locale: dateLoc })}${repair.delivery_time ? ` ${t("invoice.atTime")} ${repair.delivery_time}` : ''}</p></div>` : ''}

<div class="warranty-box"><strong>${t("invoice.warrantyTitle")}: ${repair.warranty_days || 0} ${t("invoice.days").toUpperCase()}</strong><br>${t("invoice.warrantyRepairNote")}</div>

<div class="signatures">
  <div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.clientSignature")}</div><div class="sig-label">${repair.customer_name}</div></div></div>
  <div class="sig-box"><div class="sig-line"><div class="sig-label">${t("invoice.responsibleTech")}</div><div class="sig-label">${brand.business_name}</div></div></div>
</div>

<div class="stamp-area"><div class="stamp-box">${t("invoice.workshopStamp")}</div></div>

<div class="footer">
  <p>${brand.business_name} · ${t("invoice.professionalService")}</p>
  <p>${t("invoice.keepAsWarranty")}</p>
</div>

</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
};
