import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ==========================================
// Number to Indian Currency Words Formatter
// ==========================================
export function numberToWordsINR(amount: number): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return 'INR Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  };

  let words = '';
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore > 0) words += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (rem > 0) words += convertLessThanOneThousand(rem) + ' ';

  return `INR ${words.trim()} Only`;
}

// Format numbers with Indian commas: 1,48,680.00
export function formatINR(val: number | string, decimals: number = 2): string {
  const n = Number(val) || 0;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Format date to "7-Aug-26" or "07-Aug-2026"
export function formatInvoiceDate(dateStr?: string): string {
  if (!dateStr) {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${day}-${month}-${year} ${time}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${day}-${month}-${year} ${time}`;
}

// GST state codes
const STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'dadra and nagar haveli and daman and diu': '26',
  'maharashtra': '27',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'andaman and nicobar islands': '35',
  'telangana': '36',
  'andhra pradesh': '37',
  'ladakh': '38'
};

/** GST code of a state, or '' when the name is not a state. It used to answer Kerala's code for anything it did not know. */
export function getStateCode(stateName?: string): string {
  return STATE_CODES[String(stateName || '').trim().toLowerCase()] || '';
}

/**
 * The buyer's state as it is on record: the state of the billing address, or
 * failing that the state a registered buyer's GSTIN begins with. With neither
 * on record no state is printed and the supply is treated as local — the page
 * used to print "Kerala" for every buyer whose state was missing.
 */
function buyerStateOf(billingAddr: any, gstin: string, sellerStateCode: string) {
  const recorded = String(billingAddr?.state || '').trim();
  const gstinCode = /^\d{2}/.test(gstin) ? gstin.slice(0, 2) : '';
  const code = getStateCode(recorded) || gstinCode;
  const fromGstin = Object.keys(STATE_CODES).find(k => STATE_CODES[k] === gstinCode) || '';
  const name = recorded || fromGstin.replace(/\b\w/g, c => c.toUpperCase());
  const isInterState = code ? code !== sellerStateCode : !!recorded;
  const line = name ? `State Name : ${name}${code ? `, Code : ${code}` : ''}` : (code ? `State Code : ${code}` : '');
  return { name, code, isInterState, line };
}

// ==========================================
// Draw Crisp Vector Rupee Symbol in jsPDF
// ==========================================
export function drawRupeeSymbol(doc: jsPDF, x: number, y: number, size: number = 7.5) {
  doc.saveGraphicsState();
  doc.setLineWidth(0.22);
  doc.setDrawColor(0, 0, 0);

  const h = size * 0.35; // height ~2.6mm
  const w = h * 0.7;     // width ~1.8mm
  const topY = y - h + 0.3;

  // Top horizontal bar
  doc.line(x, topY, x + w, topY);
  // Second horizontal bar
  doc.line(x, topY + (h * 0.33), x + (w * 0.85), topY + (h * 0.33));
  // Vertical stem
  doc.line(x + (w * 0.25), topY, x + (w * 0.25), topY + (h * 0.65));
  // Upper semicircle curve
  doc.line(x + (w * 0.25), topY + (h * 0.65), x + (w * 0.8), topY + (h * 0.48));
  // Slanted downward leg
  doc.line(x + (w * 0.35), topY + (h * 0.52), x + w, topY + h);

  doc.restoreGraphicsState();
}

// Cache for Maxtron PNG logo Data URL
let cachedMaxtronLogoDataUrl: string | null = null;

export async function getMaxtronLogoDataUrl(): Promise<string | null> {
  if (cachedMaxtronLogoDataUrl) return cachedMaxtronLogoDataUrl;
  if (typeof window === 'undefined') return null;

  try {
    const candidates = ['/MAXTRON%20LOGO%20(2).png', '/MAXTRON LOGO (2).png'];
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });
          if (dataUrl && dataUrl.startsWith('data:image')) {
            cachedMaxtronLogoDataUrl = dataUrl;
            return dataUrl;
          }
        }
      } catch (e) {
        // try next candidate
      }
    }
  } catch (err) {
    console.error('Failed to load Maxtron PNG logo from public folder:', err);
  }
  return null;
}

// ==========================================
// Draw Maxtron / Keil Logo in jsPDF
// ==========================================
async function drawCompanyLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 14,
  isKeil: boolean = false,
  logoDataUrl?: string | null
) {
  if (!isKeil) {
    const imgData = logoDataUrl || (await getMaxtronLogoDataUrl());
    if (imgData) {
      try {
        doc.addImage(imgData, 'PNG', x, y, size, size, undefined, 'FAST');
        return;
      } catch (e) {
        console.warn('Could not add PNG logo to PDF, rendering vector fallback:', e);
      }
    }
  }

  // Fallback vector drawing if logo file not found or if Keil
  doc.saveGraphicsState();
  doc.setLineWidth(0.6);
  
  if (isKeil) {
    // Keil Geometric Polygon Logo
    doc.setDrawColor(16, 80, 160);
    doc.roundedRect(x, y, size, size, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size * 0.55);
    doc.setTextColor(16, 80, 160);
    doc.text('K', x + size / 2, y + size * 0.7, { align: 'center' });
  } else {
    // Maxtron Monogram Vector Fallback
    doc.setDrawColor(180, 140, 120);
    doc.setLineWidth(1.2);
    const cx = x + size / 2;
    const cy = y + size / 2;
    const w = size * 0.85;
    const h = size * 0.85;
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;

    doc.line(left + 2, top + 4, left + 2, bottom);
    doc.line(right - 2, top + 4, right - 2, bottom);
    doc.ellipse(cx, cy, w * 0.28, h * 0.42, 'S');
    doc.line(left + 2, top + 4, cx, top);
    doc.line(right - 2, top + 4, cx, top);
  }
  doc.restoreGraphicsState();
}

// ==========================================
// Generate High-Res QR Code Data URL
// ==========================================
async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
}

export interface InvoiceLayoutOptions {
  pageWidth?: number;          // in mm (default: 210)
  pageHeight?: number;         // in mm (default: 297)
  margin?: number;             // in mm (default: 8)
  autoFitSinglePage?: boolean; // default: true
  density?: 'compact' | 'standard' | 'spacious';
  fontSizeScale?: number;      // default: 1.0
  itemRowHeight?: number;      // manual override in mm
}

export interface InvoiceItemDetail {
  name: string;
  size: string;
  hsn: string;
  qty: number;
  rate: number;
  taxable: number;
  gstP: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  lineTotal: number;
}

export interface EwbGoodsDetail {
  name: string;
  hsn: string;
  qty: number;
  taxable: number;
  gstRateStr: string;
}

// ==========================================
// Draw Single Tax Invoice Page
// ==========================================
/**
 * The GST rate of an invoice line: the rate typed for that line. 0% is a real
 * rate and must survive — `rate || 18` used to turn it into 18%.
 *
 * Two cases have no usable typed rate and take the rate the invoice was
 * actually charged at (its own saved tax ÷ taxable value) instead:
 *  - lines saved before the rate was stored per line;
 *  - an invoice whose tax total was typed over and no longer agrees with its
 *    line rates (say the rate left at 18% and the tax typed as 0). The typed
 *    total is what was charged, so the lines follow it and the page adds up.
 * Nothing is ever assumed to be 18%. Same rule as lineGstRates in the backend.
 */
export function lineGstPercent(item: any, inv: any): number {
  const typedGstPercent = (line: any): number | null => {
    const v = line?.gst_percent;
    return v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v);
  };

  const taxable = Number(inv?.total_amount) || 0;
  const savedTax = Number(inv?.tax_amount) || 0;
  const invoiceRate = taxable > 0 ? Math.round((savedTax / taxable) * 10000) / 100 : 0;

  const typed = typedGstPercent(item);
  if (typed === null) return invoiceRate;

  const lines: any[] = Array.isArray(inv?.items) ? inv.items : [];
  const hasSavedTax = inv?.tax_amount !== undefined && inv?.tax_amount !== null && inv?.tax_amount !== '';
  if (hasSavedTax && lines.length > 0) {
    const taxFromRates = lines.reduce((sum, l) =>
      sum + (Number(l.quantity) || 0) * (Number(l.rate) || 0) * (typedGstPercent(l) ?? invoiceRate) / 100, 0);
    if (Math.abs(taxFromRates - savedTax) > 1) return invoiceRate;
  }
  return typed;
}

/* This page prints what is on the invoice record and nothing else. Where a
 * value is missing it is left blank or shown as not available — it used to
 * fall back to sample data (another firm's name and GSTIN, a made-up address,
 * item, IRN, Ack and e-Way Bill number), which then printed as if real. */
export async function renderTaxInvoicePage(
  doc: jsPDF,
  inv: any,
  activeTenant: string = 'MAXTRON',
  copySubtitle: string = '(ORIGINAL FOR RECIPIENT)',
  qrDataUrl: string,
  logoDataUrl?: string | null,
  options?: InvoiceLayoutOptions
) {
  const isKeil = activeTenant.toUpperCase() === 'KEIL';

  // Seller Info Defaults & Overrides
  const sellerName = isKeil ? 'KEIL INDUSTRIES LTD' : 'MAXTRON ASSOCIATES';
  const sellerAddr1 = isKeil ? 'Plot No. 45, Keil Industrial Complex' : '13-95, 13-96, PIRIVUSALA';
  const sellerAddr2 = isKeil ? 'Phase II, Industrial Development Area' : 'CHANDRANAGAR';
  const sellerAddr3 = isKeil ? 'KOCHI, KERALA - 682024' : 'PALAKKAD, KERALA';
  const sellerGstin = isKeil ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const sellerState = 'Kerala';
  const sellerStateCode = '32';
  const sellerEmail = isKeil ? 'info@keilindustries.com' : 'maxtronassociates@gmail.com';

  // Bank Info
  const bankName = isKeil ? 'State Bank of India - 38472910482' : 'Canara Bank -125002422134';
  const accountNo = isKeil ? '38472910482' : '125002422134';
  const branchIfsc = isKeil ? 'Kochi Main Branch & SBIN0000856' : 'Palakkad Sultanpet & CNRB0000812';

  // Customer (Consignee & Buyer) Info
  const customer = inv.customers || {};
  const customerName = customer.customer_name || '';
  const customerGstin = customer.gst_no || '';

  // Addresses
  const rawAddresses = customer.addresses || [];
  const billingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[0] || {};
  const shippingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'shipping' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[1] || rawAddresses[0] || {};

  const buildAddressStr = (addr: any) => {
    const parts = [addr.street, addr.city, addr.state, addr.zip_code].filter(Boolean);
    if (customer.contact_person || customer.mobile_no) {
      parts.push(`Contact: ${customer.mobile_no || customer.contact_person}`);
    }
    return parts.join(', ');
  };

  const consigneeAddress = buildAddressStr(shippingAddrObj);
  const buyerAddress = buildAddressStr(billingAddrObj);
  const buyer = buyerStateOf(billingAddrObj, customerGstin, sellerStateCode);

  // Invoice & e-Invoice Info
  /* IRN, Ack number, QR code and e-Way Bill number are printed only when the
   * portal has issued them. Where e-Invoicing applies (a registered buyer, a
   * bill raised in this system) but has not been done yet, the page says so;
   * where it does not apply — an unregistered buyer, an outside bill — that
   * strip stays empty. The space is kept either way, so every invoice is laid
   * out the same. */
  // The same page prints a credit note (sales return) in the client's credit
  // note format: other title, other boxes on the right, same everything else.
  const isCreditNote = inv.document_kind === 'CREDIT_NOTE';
  const hasIrn = !!inv.einvoice_irn;
  const eInvoiceApplies = !!customerGstin && !inv.is_external
    && String(inv.einvoice_status || '').toUpperCase() !== 'NOT_APPLICABLE';
  const invoiceNo = inv.invoice_number || '';
  const ewbNo = inv.ewb_no || '';
  const invoiceDate = formatInvoiceDate(inv.invoice_date);
  const orderNo = inv.orders?.order_number || '';
  const orderDate = inv.orders?.order_date ? formatInvoiceDate(inv.orders.order_date) : '';
  const irn = inv.einvoice_irn || '';
  const ackNo = inv.einvoice_ack_no || '';
  const ackDate = inv.einvoice_ack_date ? formatInvoiceDate(inv.einvoice_ack_date) : '';

  // Tax and Item Calculations
  const isInterState = buyer.isInterState;
  const items = Array.isArray(inv.items) ? inv.items : [];

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQty = 0;

  const processedItems: InvoiceItemDetail[] = items.map((item: any) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    // Taxable value is quantity x rate. A line's `amount` is that too on a saved
    // invoice, but the entry form keeps it tax-inclusive — so it is only a last resort.
    const taxable = (qty * rate) || Number(item.amount) || 0;
    const gstP = lineGstPercent(item, inv);
    const pName = item.finished_products?.product_name || item.product_name || '';
    const hsn = item.finished_products?.hsn_code || item.hsn_code || '';
    const size = item.finished_products?.size || item.size || '';

    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;

    if (isInterState) {
      igstAmt = (taxable * gstP) / 100;
    } else {
      cgstAmt = (taxable * (gstP / 2)) / 100;
      sgstAmt = (taxable * (gstP / 2)) / 100;
    }

    totalTaxable += taxable;
    totalCgst += cgstAmt;
    totalSgst += sgstAmt;
    totalIgst += igstAmt;
    totalQty += qty;

    return {
      name: pName,
      size,
      hsn,
      qty,
      rate,
      taxable,
      gstP,
      cgstAmt,
      sgstAmt,
      igstAmt,
      lineTotal: taxable + (isInterState ? igstAmt : (cgstAmt + sgstAmt))
    };
  });

  const totalTaxAmount = isInterState ? totalIgst : (totalCgst + totalSgst);
  const netInvoiceAmount = Number(inv.net_amount) || (totalTaxable + totalTaxAmount - (Number(inv.discount_amount) || 0));
  const amountWords = numberToWordsINR(netInvoiceAmount);
  const taxWords = numberToWordsINR(totalTaxAmount);

  // ----------------------------------------------------
  // Dynamic Layout Coordinates & Auto-Fit Engine
  // ----------------------------------------------------
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options?.margin !== undefined ? options.margin : Math.max(6, Math.min(8, 8 * (pageWidth / 210)));
  const density = options?.density || 'standard';
  const autoFit = options?.autoFitSinglePage !== false;

  const startX = margin;
  const endX = pageWidth - margin;
  const boxWidth = endX - startX;
  const centerX = pageWidth / 2;
  const rPad = Math.max(1.8, 2.5 * (boxWidth / 194));

  // Dimensional scale factors relative to standard A4 (210mm x 297mm, printable 194mm x 277mm)
  const wScale = boxWidth / 194;
  const hScale = (pageHeight - 16) / 281;
  const dimScale = Math.max(0.35, Math.min(wScale, hScale));

  // Font Scaling Helper: Scales smoothly with page dimensions and density
  const userFontScale = options?.fontSizeScale || (density === 'compact' ? 0.9 : density === 'spacious' ? 1.05 : 1.0);
  const fs = (basePt: number) => Math.max(3.0, basePt * dimScale * userFontScale);

  // 1. Top Header
  const topHeaderY = Math.max(4.0, 7.0 * dimScale);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(12.5));
  doc.setTextColor(0, 0, 0);
  doc.text(isCreditNote ? 'Credit Note' : 'Tax Invoice', centerX, topHeaderY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(8));
  if (copySubtitle) doc.text(copySubtitle, centerX, topHeaderY + (3.8 * dimScale), { align: 'center' });

  // 2. Right Side: 'e-Invoice' Title + QR Code (properly stacked without overlap)
  const qrSize = Math.max(14, Math.min(24, 24 * dimScale));
  const qrX = endX - qrSize;
  const eInvoiceTagY = topHeaderY;

  // The e-Invoice tag and QR code belong to a registered invoice only. Their
  // space is kept regardless, so the rest of the page sits in the same place.
  const qrY = eInvoiceTagY + (2.5 * dimScale);
  if (hasIrn) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(9.5));
    doc.text('e-Invoice', qrX + (qrSize / 2), eInvoiceTagY, { align: 'center' });
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }
  }

  // Left Side: IRN & Ack details
  doc.setFontSize(fs(6.5));
  const irnY = topHeaderY + (5.5 * dimScale);
  const maxChars = Math.max(24, Math.floor(46 * wScale));
  const irnLine1 = irn.length > maxChars ? irn.substring(0, maxChars) + '-' : irn;
  const irnLine2 = irn.length > maxChars ? irn.substring(maxChars) : '';
  if (hasIrn || eInvoiceApplies) {
    doc.setFont('helvetica', 'bold');
    doc.text('IRN :', startX, irnY);
    doc.text(hasIrn ? irnLine1 : 'Pending - not generated', startX + (8 * dimScale), irnY);
    if (irnLine2) {
      doc.text(irnLine2, startX + (8 * dimScale), irnY + (3.0 * dimScale));
    }
  }

  const ackY = irnLine2 ? irnY + (6.0 * dimScale) : irnY + (3.4 * dimScale);
  if (hasIrn && ackNo) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Ack No. : ${ackNo}`, startX, ackY);
    if (ackDate) doc.text(`Ack Date : ${ackDate}`, startX, ackY + (3.0 * dimScale));
  }

  // 3. Main Border Box Outer Frame (guaranteed to start below QR code and Ack info)
  const tableStartY = Math.max(qrY + qrSize + (2.5 * dimScale), ackY + (4.5 * dimScale));
  const bottomMargin = Math.max(4, 7 * dimScale);
  const tableEndY = pageHeight - bottomMargin;
  const tableHeight = Math.max(50, tableEndY - tableStartY);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(startX, tableStartY, boxWidth, tableHeight);

  // Group items by unique HSN & GST rate
  interface HsnTaxGroup {
    hsn: string;
    taxable: number;
    gstP: number;
    cgstAmt: number;
    sgstAmt: number;
    igstAmt: number;
    totalTax: number;
  }
  const hsnMap = new Map<string, HsnTaxGroup>();
  processedItems.forEach(it => {
    const key = `${it.hsn}_${it.gstP}`;
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn: it.hsn,
        taxable: 0,
        gstP: it.gstP,
        cgstAmt: 0,
        sgstAmt: 0,
        igstAmt: 0,
        totalTax: 0
      });
    }
    const grp = hsnMap.get(key)!;
    grp.taxable += it.taxable;
    grp.cgstAmt += it.cgstAmt;
    grp.sgstAmt += it.sgstAmt;
    grp.igstAmt += it.igstAmt;
    grp.totalTax += isInterState ? it.igstAmt : (it.cgstAmt + it.sgstAmt);
  });
  const hsnGroups = Array.from(hsnMap.values());

  // ----------------------------------------------------
  // Strict Percentage-Based Vertical Budgeting
  // ----------------------------------------------------
  const partiesRatio = density === 'compact' ? 0.31 : density === 'spacious' ? 0.36 : 0.33;
  const footerRatio = density === 'compact' ? 0.12 : density === 'spacious' ? 0.15 : 0.135;
  const taxWordsRatio = 0.03;
  const taxTableRatio = density === 'compact' ? 0.12 : density === 'spacious' ? 0.15 : 0.135;
  const wordsRatio = 0.038;
  const goodsTotalRatio = 0.038;
  const goodsHeaderRatio = 0.034;

  // 1. Parties & Metadata
  const partiesHeight = tableHeight * partiesRatio;
  const partiesEndY = tableStartY + partiesHeight;
  const sellerHeight = partiesHeight * 0.33;
  const consigneeHeight = partiesHeight * 0.335;
  const buyerHeight = partiesHeight - sellerHeight - consigneeHeight;
  const sellerBoxEndY = tableStartY + sellerHeight;
  const consigneeBoxEndY = sellerBoxEndY + consigneeHeight;

  // 2. Footer Section
  const footerHeight = tableHeight * footerRatio;
  const footerSectionTopY = tableEndY - footerHeight;

  // 3. Tax in Words
  const taxWordsHeight = tableHeight * taxWordsRatio;
  const taxWordsBottomY = footerSectionTopY;
  const taxTotalRowBottomY = taxWordsBottomY - taxWordsHeight;

  // 4. Tax Analysis Table (HSN Breakdown)
  const taxTableBudget = tableHeight * taxTableRatio;
  const taxHeaderHeight = taxTableBudget * 0.30;
  const taxTotalHeight = taxTableBudget * 0.28;
  const taxDataHeight = taxTableBudget - taxHeaderHeight - taxTotalHeight;
  const taxRowHeight = taxDataHeight / Math.max(1, hsnGroups.length);

  const taxDataBottomY = taxTotalRowBottomY - taxTotalHeight;
  const taxHeaderBottomY = taxDataBottomY - taxDataHeight;
  const taxTableTopY = taxHeaderBottomY - taxHeaderHeight;

  // 5. Amount in Words Row
  const wordsRowHeight = tableHeight * wordsRatio;
  const wordsRowBottomY = taxTableTopY;
  const wordsRowTopY = wordsRowBottomY - wordsRowHeight;

  // 6. Goods Table Total Row
  const goodsTotalRowHeight = tableHeight * goodsTotalRatio;
  const goodsTableBottomY = wordsRowTopY;
  const goodsTotalRowTopY = goodsTableBottomY - goodsTotalRowHeight;

  // 7. Goods Table Items Area
  const goodsTableTopY = partiesEndY;
  const goodsHeaderHeight = tableHeight * goodsHeaderRatio;
  const goodsHeaderBottomY = goodsTableTopY + goodsHeaderHeight;
  const availableItemsHeight = Math.max(8 * dimScale, goodsTotalRowTopY - goodsHeaderBottomY);

  const itemCount = Math.max(1, processedItems.length);
  const itemRowHeight = options?.itemRowHeight || (autoFit ? (availableItemsHeight / itemCount) : Math.min(availableItemsHeight / itemCount, 16 * dimScale));

  // ----------------------------------------------------
  // Section 1: Parties (Left 46%) & Metadata (Right 54%)
  // ----------------------------------------------------
  const metaSplitX = startX + (boxWidth * 0.44);
  const metaW = endX - metaSplitX;
  const partiesW = metaSplitX - startX;

  // Vertical split between Left (Parties) and Right (Metadata)
  doc.line(metaSplitX, tableStartY, metaSplitX, partiesEndY);

  // Left Section 1: Seller Info
  const logoSize = Math.max(6, Math.min(12, 12 * dimScale));
  await drawCompanyLogo(doc, startX + 1.5, tableStartY + (1.2 * dimScale), logoSize, isKeil, logoDataUrl);

  const sTextX = startX + logoSize + (2.5 * dimScale);
  const sMaxW = metaSplitX - sTextX - 1.5;
  const sStep = sellerHeight / 7.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.5));
  doc.text(sellerName, sTextX, tableStartY + (sStep * 1.15), { maxWidth: sMaxW });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.5));
  doc.text(sellerAddr1, sTextX, tableStartY + (sStep * 2.15), { maxWidth: sMaxW });
  doc.text(sellerAddr2, sTextX, tableStartY + (sStep * 3.15), { maxWidth: sMaxW });
  doc.text(sellerAddr3, sTextX, tableStartY + (sStep * 4.15), { maxWidth: sMaxW });

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN: ${sellerGstin}`, sTextX, tableStartY + (sStep * 5.15), { maxWidth: sMaxW });
  doc.setFont('helvetica', 'normal');
  doc.text(`State Name : ${sellerState}, Code : ${sellerStateCode}`, sTextX, tableStartY + (sStep * 6.15), { maxWidth: sMaxW });
  doc.text(`E-Mail : ${sellerEmail}`, sTextX, tableStartY + (sStep * 7.0), { maxWidth: sMaxW });

  // Divider under Seller
  doc.line(startX, sellerBoxEndY, metaSplitX, sellerBoxEndY);

  // Left Section 2: Consignee (Ship to)
  const cStep = consigneeHeight / 7.0;
  doc.setFontSize(fs(5.8));
  doc.text('Consignee (Ship to)', startX + 1.5, sellerBoxEndY + (cStep * 1.0));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(7.5));
  doc.text(customerName, startX + 1.5, sellerBoxEndY + (cStep * 2.1), { maxWidth: partiesW - 3 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.8));
  const splitConsigneeAddr = doc.splitTextToSize(consigneeAddress, partiesW - 3);
  const consigneeLines = splitConsigneeAddr.slice(0, 2);
  doc.text(consigneeLines, startX + 1.5, sellerBoxEndY + (cStep * 3.2));

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${customerGstin || 'Unregistered'}`, startX + 1.5, sellerBoxEndY + (cStep * 5.5), { maxWidth: partiesW - 3 });
  doc.setFont('helvetica', 'normal');
  doc.text(buyer.line, startX + 1.5, sellerBoxEndY + (cStep * 6.6), { maxWidth: partiesW - 3 });

  // Divider under Consignee
  doc.line(startX, consigneeBoxEndY, metaSplitX, consigneeBoxEndY);

  // Left Section 3: Buyer (Bill to)
  const bStep = buyerHeight / 7.0;
  doc.setFontSize(fs(5.8));
  doc.text('Buyer (Bill to)', startX + 1.5, consigneeBoxEndY + (bStep * 1.0));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(7.5));
  doc.text(customerName, startX + 1.5, consigneeBoxEndY + (bStep * 2.1), { maxWidth: partiesW - 3 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.8));
  const splitBuyerAddr = doc.splitTextToSize(buyerAddress, partiesW - 3);
  const buyerLines = splitBuyerAddr.slice(0, 2);
  doc.text(buyerLines, startX + 1.5, consigneeBoxEndY + (bStep * 3.2));

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${customerGstin || 'Unregistered'}`, startX + 1.5, consigneeBoxEndY + (bStep * 5.5), { maxWidth: partiesW - 3 });
  doc.setFont('helvetica', 'normal');
  doc.text(buyer.line, startX + 1.5, consigneeBoxEndY + (bStep * 6.6), { maxWidth: partiesW - 3 });

  // Bottom divider under entire parties & metadata section
  doc.line(startX, partiesEndY, endX, partiesEndY);

  // Right Section: Metadata Grid (4 clean, balanced rows)
  const rRowStep = partiesHeight / 4;
  const rRow1Y = tableStartY + rRowStep;
  const rRow2Y = tableStartY + (rRowStep * 2);
  const rRow3Y = tableStartY + (rRowStep * 3);
  const rRow4Y = partiesEndY;

  doc.line(metaSplitX, rRow1Y, endX, rRow1Y);
  doc.line(metaSplitX, rRow2Y, endX, rRow2Y);
  doc.line(metaSplitX, rRow3Y, endX, rRow3Y);

  if (isCreditNote) {
    // Credit Note No. | Dated / Original Invoice No. & Date | Other References /
    // Buyer's Order No. | Dated — the client's credit note boxes. Fourth row left open.
    const rColMidX = metaSplitX + (metaW * 0.50);
    doc.line(rColMidX, tableStartY, rColMidX, rRow3Y);
    const cells: [string, string][][] = [
      [['Credit Note No.', invoiceNo], ['Dated', invoiceDate]],
      [['Original Invoice No. & Date.', inv.original_invoice_ref || ''], ['Other References', inv.other_references || '']],
      [["Buyer's Order No.", orderNo], ['Dated', orderDate]],
    ];
    cells.forEach((row, i) => {
      const rowTop = tableStartY + (rRowStep * i);
      row.forEach(([label, value], j) => {
        const x = (j === 0 ? metaSplitX : rColMidX) + 1.5;
        const w = (j === 0 ? rColMidX - metaSplitX : endX - rColMidX) - 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fs(5.8));
        doc.text(label, x, rowTop + (rRowStep * 0.36));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fs(7.5));
        if (value) doc.text(value, x, rowTop + (rRowStep * 0.82), { maxWidth: w });
      });
    });
  } else {
    // Row 1: 3 Columns (Invoice No | e-Way Bill No | Dated)
    const rCol1X = metaSplitX + (metaW * 0.33);
    const rCol2X = metaSplitX + (metaW * 0.70);
    doc.line(rCol1X, tableStartY, rCol1X, rRow1Y);
    doc.line(rCol2X, tableStartY, rCol2X, rRow1Y);

    doc.setFontSize(fs(5.8));
    doc.text('Invoice No.', metaSplitX + 1.5, tableStartY + (rRowStep * 0.36));
    doc.setFontSize(fs(7.5));
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceNo, metaSplitX + 1.5, tableStartY + (rRowStep * 0.82), { maxWidth: (rCol1X - metaSplitX) - 2 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('e-Way Bill No.', rCol1X + 1.5, tableStartY + (rRowStep * 0.36));
    doc.setFontSize(fs(7.2));
    doc.setFont('helvetica', 'bold');
    doc.text(ewbNo || 'N/A', rCol1X + 1.5, tableStartY + (rRowStep * 0.82), { maxWidth: (rCol2X - rCol1X) - 2 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Dated', rCol2X + 1.5, tableStartY + (rRowStep * 0.36));
    doc.setFontSize(fs(7.5));
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceDate, rCol2X + 1.5, tableStartY + (rRowStep * 0.82), { maxWidth: (endX - rCol2X) - rPad });

    // Middle vertical column divider for Rows 2 to 4
    const rColMidX = metaSplitX + (metaW * 0.50);
    const rSubW = (rColMidX - metaSplitX) - 2;
    doc.line(rColMidX, rRow1Y, rColMidX, rRow4Y);

    // Row 2: Buyer's Order No. | Order Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text("Buyer's Order No.", metaSplitX + 1.5, rRow1Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    doc.text(orderNo || 'N/A', metaSplitX + 1.5, rRow1Y + (rRowStep * 0.82), { maxWidth: rSubW });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Order Date', rColMidX + 1.5, rRow1Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    doc.text(orderDate || 'N/A', rColMidX + 1.5, rRow1Y + (rRowStep * 0.82), { maxWidth: (endX - rColMidX) - rPad });

    // Row 3: Dispatched through | Destination
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Dispatched through', metaSplitX + 1.5, rRow2Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    const dispatchThrough = inv.transporter_name || inv.vehicle_no || 'N/A';
    doc.text(dispatchThrough, metaSplitX + 1.5, rRow2Y + (rRowStep * 0.82), { maxWidth: rSubW });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Destination', rColMidX + 1.5, rRow2Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    doc.text(billingAddrObj.city || buyer.name || 'N/A', rColMidX + 1.5, rRow2Y + (rRowStep * 0.82), { maxWidth: (endX - rColMidX) - rPad });

    // Row 4: Mode/Terms of Payment | Terms of Delivery
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Mode/Terms of Payment', metaSplitX + 1.5, rRow3Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    doc.text(inv.payment_terms || 'N/A', metaSplitX + 1.5, rRow3Y + (rRowStep * 0.82), { maxWidth: rSubW });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(5.8));
    doc.text('Terms of Delivery', rColMidX + 1.5, rRow3Y + (rRowStep * 0.36));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(6.8));
    const deliveryTerms = inv.scheduled_delivery_date
      ? `Exp: ${formatInvoiceDate(inv.scheduled_delivery_date)}`
      : (inv.remarks || 'N/A');
    doc.text(deliveryTerms, rColMidX + 1.5, rRow3Y + (rRowStep * 0.82), { maxWidth: (endX - rColMidX) - rPad });

  }

  // ----------------------------------------------------
  // Section 2: Goods Items Table
  // ----------------------------------------------------
  doc.line(startX, goodsHeaderBottomY, endX, goodsHeaderBottomY);
  doc.line(startX, goodsTotalRowTopY, endX, goodsTotalRowTopY);
  doc.line(startX, goodsTableBottomY, endX, goodsTableBottomY);

  // Column X coordinates (proportional percentages summing to 100% of boxWidth)
  const colSlX = startX + (boxWidth * 0.05);   // Sl No: 5%
  const colDescX = startX + (boxWidth * 0.44); // Desc: 39%
  const colHsnX = startX + (boxWidth * 0.57);  // HSN: 13%
  const colQtyX = startX + (boxWidth * 0.73);  // Qty: 16%
  const colRateX = startX + (boxWidth * 0.82); // Rate: 9%
  const colPerX = startX + (boxWidth * 0.88);  // per: 6%
  // Amount column is from colPerX to endX (12%)

  doc.line(colSlX, goodsTableTopY, colSlX, goodsTotalRowTopY);
  doc.line(colDescX, goodsTableTopY, colDescX, goodsTotalRowTopY);
  doc.line(colHsnX, goodsTableTopY, colHsnX, goodsTotalRowTopY);
  doc.line(colRateX, goodsTableTopY, colRateX, goodsTotalRowTopY);
  doc.line(colQtyX, goodsTableTopY, colQtyX, goodsTableBottomY);
  doc.line(colPerX, goodsTableTopY, colPerX, goodsTableBottomY);

  // Table Headers
  doc.setFontSize(fs(5.8));
  doc.setFont('helvetica', 'normal');
  doc.text('Sl', (startX + colSlX) / 2, goodsTableTopY + (goodsHeaderHeight * 0.38), { align: 'center' });
  doc.text('No.', (startX + colSlX) / 2, goodsTableTopY + (goodsHeaderHeight * 0.78), { align: 'center' });
  doc.text('Description of Goods', colSlX + (1.5 * dimScale), goodsTableTopY + (goodsHeaderHeight * 0.65));
  doc.text('HSN/SAC', (colDescX + colHsnX) / 2, goodsTableTopY + (goodsHeaderHeight * 0.65), { align: 'center' });
  doc.text('Quantity', colQtyX - (1.5 * dimScale), goodsTableTopY + (goodsHeaderHeight * 0.65), { align: 'right' });
  doc.text('Rate', colRateX - (1.5 * dimScale), goodsTableTopY + (goodsHeaderHeight * 0.65), { align: 'right' });
  doc.text('per', (colRateX + colPerX) / 2, goodsTableTopY + (goodsHeaderHeight * 0.65), { align: 'center' });
  doc.text('Amount', endX - rPad, goodsTableTopY + (goodsHeaderHeight * 0.65), { align: 'right' });

  // Render Items Dynamically
  processedItems.forEach((it, idx) => {
    const itemTopY = goodsHeaderBottomY + (idx * itemRowHeight);
    const itemTextY = itemTopY + Math.min(3.8 * dimScale, itemRowHeight * 0.38);

    // Sl No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(7.5));
    doc.text(String(idx + 1), (startX + colSlX) / 2, itemTextY, { align: 'center' });

    // Description & Size
    doc.text(it.name, colSlX + (1.5 * dimScale), itemTextY, { maxWidth: (colDescX - colSlX) - 3 });
    if (it.size && itemRowHeight >= (6.5 * dimScale)) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(fs(6.2));
      doc.text(it.size, colSlX + (1.5 * dimScale), itemTextY + Math.min(3.0 * dimScale, itemRowHeight * 0.28), { maxWidth: (colDescX - colSlX) - 3 });
    }

    // HSN
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(7));
    doc.text(it.hsn, (colDescX + colHsnX) / 2, itemTextY, { align: 'center' });

    // Qty, Rate, per
    doc.text(`${formatINR(it.qty)} KGS`, colQtyX - (1.5 * dimScale), itemTextY, { align: 'right' });
    doc.text(formatINR(it.rate), colRateX - (1.5 * dimScale), itemTextY, { align: 'right' });
    doc.text('KGS', (colRateX + colPerX) / 2, itemTextY, { align: 'center' });

    // Taxable Amount
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(it.taxable), endX - rPad, itemTextY, { align: 'right' });

    // Optional breakdown line if space is ample (1-3 items)
    if (itemRowHeight >= (12 * dimScale) && processedItems.length <= 3) {
      const taxSubY = itemTextY + (5.5 * dimScale);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(fs(6.2));
      if (isInterState) {
        doc.text(`OUTWARD IGST ${it.gstP}%`, colDescX - (1.5 * dimScale), taxSubY, { align: 'right' });
        doc.text(formatINR(it.igstAmt), endX - rPad, taxSubY, { align: 'right' });
      } else {
        const halfP = it.gstP / 2;
        doc.text(`OUTWARD CGST ${halfP}%`, colDescX - (1.5 * dimScale), taxSubY, { align: 'right' });
        doc.text(formatINR(it.cgstAmt), endX - rPad, taxSubY, { align: 'right' });

        doc.text(`OUTWARD SGST ${halfP}%`, colDescX - (1.5 * dimScale), taxSubY + (2.8 * dimScale), { align: 'right' });
        doc.text(formatINR(it.sgstAmt), endX - rPad, taxSubY + (2.8 * dimScale), { align: 'right' });
      }
    }
  });

  // Discount and round-off, when the invoice has them. Without these lines the
  // goods and tax above would not add up to the total printed below. Round-off
  // is not stored on its own; it is whatever under a rupee separates the saved
  // total from goods + tax - discount.
  const discount = Number(inv.discount_amount) || 0;
  const unexplained = netInvoiceAmount - (totalTaxable + totalTaxAmount - discount);
  const roundOff = Math.abs(unexplained) >= 0.005 && Math.abs(unexplained) < 1 ? unexplained : 0;
  const adjustments: [string, number][] = [];
  if (discount > 0) adjustments.push(['Less : Discount', -discount]);
  if (roundOff) adjustments.push(['Round Off', roundOff]);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(fs(6.2));
  adjustments.forEach(([label, value], i) => {
    const y = goodsTotalRowTopY - ((adjustments.length - i) * 2.8 * dimScale) + (1.0 * dimScale);
    doc.text(label, colDescX - (1.5 * dimScale), y, { align: 'right' });
    doc.text(`${value < 0 ? '(-)' : ''}${formatINR(Math.abs(value))}`, endX - rPad, y, { align: 'right' });
  });

  // Total Line in Goods Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(7.5));
  doc.text('Total', colHsnX - (1.5 * dimScale), goodsTotalRowTopY + (goodsTotalRowHeight * 0.65), { align: 'right' });
  doc.text(`${formatINR(totalQty)} KGS`, colQtyX - (1.5 * dimScale), goodsTotalRowTopY + (goodsTotalRowHeight * 0.65), { align: 'right' });

  // Rupee Symbol + Net Invoice Amount
  drawRupeeSymbol(doc, colPerX + (1.2 * dimScale), goodsTotalRowTopY + (goodsTotalRowHeight * 0.65), fs(7.2));
  doc.setFontSize(fs(7.8));
  doc.text(formatINR(netInvoiceAmount), endX - rPad, goodsTotalRowTopY + (goodsTotalRowHeight * 0.65), { align: 'right' });

  // ----------------------------------------------------
  // Section 4: Amount Chargeable in Words
  // ----------------------------------------------------
  doc.line(startX, wordsRowBottomY, endX, wordsRowBottomY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.8));
  doc.text('Amount Chargeable (in words)', startX + 1.5, wordsRowTopY + (wordsRowHeight * 0.35));
  doc.setFont('helvetica', 'italic');
  doc.text('E. & O.E', endX - rPad, wordsRowTopY + (wordsRowHeight * 0.35), { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(7.2));
  doc.text(amountWords, startX + 1.5, wordsRowTopY + (wordsRowHeight * 0.78), { maxWidth: boxWidth - 3 });

  // ----------------------------------------------------
  // Section 5: Dynamic Tax Analysis Table (HSN Breakdown)
  // ----------------------------------------------------
  const tColHsnX = startX + (boxWidth * 0.22);
  const tColTaxableX = startX + (boxWidth * 0.40);
  const tColCgstRateX = startX + (boxWidth * 0.49);
  const tColCgstAmtX = startX + (boxWidth * 0.63);
  const tColSgstRateX = startX + (boxWidth * 0.72);
  const tColSgstAmtX = startX + (boxWidth * 0.84);

  doc.line(startX, taxHeaderBottomY, endX, taxHeaderBottomY);
  doc.line(startX, taxDataBottomY, endX, taxDataBottomY);
  doc.line(startX, taxTotalRowBottomY, endX, taxTotalRowBottomY);
  doc.line(startX, taxWordsBottomY, endX, taxWordsBottomY);

  doc.line(tColHsnX, taxTableTopY, tColHsnX, taxTotalRowBottomY);
  doc.line(tColTaxableX, taxTableTopY, tColTaxableX, taxTotalRowBottomY);
  doc.line(tColCgstAmtX, taxTableTopY, tColCgstAmtX, taxTotalRowBottomY);
  doc.line(tColSgstAmtX, taxTableTopY, tColSgstAmtX, taxTotalRowBottomY);

  doc.line(tColCgstRateX, taxHeaderBottomY, tColCgstRateX, taxTotalRowBottomY);
  doc.line(tColSgstRateX, taxHeaderBottomY, tColSgstRateX, taxTotalRowBottomY);

  // Headers
  doc.setFontSize(fs(5.8));
  doc.setFont('helvetica', 'normal');
  doc.text('HSN/SAC', (startX + tColHsnX) / 2, taxTableTopY + (taxHeaderHeight * 0.65), { align: 'center' });
  doc.text('Taxable Value', (tColHsnX + tColTaxableX) / 2, taxTableTopY + (taxHeaderHeight * 0.65), { align: 'center' });

  if (isInterState) {
    doc.text('IGST', (tColTaxableX + tColSgstAmtX) / 2, taxTableTopY + (taxHeaderHeight * 0.35), { align: 'center' });
    doc.text('Rate', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });
    doc.text('Amount', (tColCgstRateX + tColSgstAmtX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });
  } else {
    doc.text('CGST', (tColTaxableX + tColCgstAmtX) / 2, taxTableTopY + (taxHeaderHeight * 0.35), { align: 'center' });
    doc.text('Rate', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });
    doc.text('Amount', (tColCgstRateX + tColCgstAmtX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });

    doc.text('SGST/UTGST', (tColCgstAmtX + tColSgstAmtX) / 2, taxTableTopY + (taxHeaderHeight * 0.35), { align: 'center' });
    doc.text('Rate', (tColCgstAmtX + tColSgstRateX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });
    doc.text('Amount', (tColSgstRateX + tColSgstAmtX) / 2, taxHeaderBottomY - (1 * dimScale), { align: 'center' });
  }

  doc.text('Total Tax', (tColSgstAmtX + endX) / 2, taxTableTopY + (taxHeaderHeight * 0.65), { align: 'center' });

  // Render All HSN Groups
  hsnGroups.forEach((grp, gIdx) => {
    const rY = taxHeaderBottomY + (gIdx * taxRowHeight) + (taxRowHeight * 0.68);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs(6.5));
    doc.text(grp.hsn, (startX + tColHsnX) / 2, rY, { align: 'center' });
    doc.text(formatINR(grp.taxable), tColTaxableX - (1.5 * dimScale), rY, { align: 'right' });

    if (isInterState) {
      doc.text(`${grp.gstP}%`, (tColTaxableX + tColCgstRateX) / 2, rY, { align: 'center' });
      doc.text(formatINR(grp.igstAmt), tColSgstAmtX - (1.5 * dimScale), rY, { align: 'right' });
    } else {
      const halfP = grp.gstP / 2;
      doc.text(`${halfP}%`, (tColTaxableX + tColCgstRateX) / 2, rY, { align: 'center' });
      doc.text(formatINR(grp.cgstAmt), tColCgstAmtX - (1.5 * dimScale), rY, { align: 'right' });
      doc.text(`${halfP}%`, (tColCgstAmtX + tColSgstRateX) / 2, rY, { align: 'center' });
      doc.text(formatINR(grp.sgstAmt), tColSgstAmtX - (1.5 * dimScale), rY, { align: 'right' });
    }
    doc.text(formatINR(grp.totalTax), endX - rPad, rY, { align: 'right' });
  });

  // Tax Total Row
  const totalRowY = taxDataBottomY + (taxTotalHeight * 0.68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(6.8));
  doc.text('Total', tColHsnX - (1.5 * dimScale), totalRowY, { align: 'right' });
  doc.text(formatINR(totalTaxable), tColTaxableX - (1.5 * dimScale), totalRowY, { align: 'right' });
  if (isInterState) {
    doc.text(formatINR(totalIgst), tColSgstAmtX - (1.5 * dimScale), totalRowY, { align: 'right' });
  } else {
    doc.text(formatINR(totalCgst), tColCgstAmtX - (1.5 * dimScale), totalRowY, { align: 'right' });
    doc.text(formatINR(totalSgst), tColSgstAmtX - (1.5 * dimScale), totalRowY, { align: 'right' });
  }
  doc.text(formatINR(totalTaxAmount), endX - rPad, totalRowY, { align: 'right' });

  // Tax in Words (Guaranteed zero overlap by dynamically measuring label width)
  const taxWordsY = taxTotalRowBottomY + (taxWordsHeight * 0.68);
  const taxLabel = 'Tax Amount (in words) : ';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.5));
  doc.text(taxLabel, startX + 1.5, taxWordsY);

  const labelW = doc.getTextWidth(taxLabel);
  doc.setFont('helvetica', 'bold');
  doc.text(taxWords, startX + 1.5 + labelW + (1 * dimScale), taxWordsY, { maxWidth: boxWidth - labelW - 4 });

  // ----------------------------------------------------
  // Section 6: Declaration & Bank Details & Signatory
  // ----------------------------------------------------
  const bankSplitX = metaSplitX;
  doc.line(bankSplitX, footerSectionTopY, bankSplitX, tableEndY);

  // Divide right side into Bank Details (60%) and Signatory (40%)
  const bankDetailsW = metaW * 0.60;
  const signatorySplitX = metaSplitX + bankDetailsW;
  const signatoryW = endX - signatorySplitX;
  doc.line(signatorySplitX, footerSectionTopY, signatorySplitX, tableEndY);

  const fStep = footerHeight / 7.5;

  // Left side: Declaration
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(6.5));
  doc.text('Declaration', startX + 1.5, footerSectionTopY + (fStep * 1.1));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.5));
  const declText = 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
  const splitDecl = doc.splitTextToSize(declText, (bankSplitX - startX) - 3);
  doc.text(splitDecl, startX + 1.5, footerSectionTopY + (fStep * 2.2));

  // Middle side: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(6.5));
  doc.text("Company's Bank Details", bankSplitX + 1.5, footerSectionTopY + (fStep * 1.1));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.8));

  // Dynamic measurement of the longest label to eliminate any overlapping
  const bankLabelW = doc.getTextWidth('Branch & IFS Code : ') + (1.0 * dimScale);
  const bankValX = bankSplitX + 1.5 + bankLabelW;
  const bankValMaxW = (signatorySplitX - bankValX) - 2;

  doc.text(`Bank Name`, bankSplitX + 1.5, footerSectionTopY + (fStep * 2.2));
  doc.text(`: ${bankName}`, bankValX, footerSectionTopY + (fStep * 2.2), { maxWidth: bankValMaxW });

  doc.text(`A/c No.`, bankSplitX + 1.5, footerSectionTopY + (fStep * 3.3));
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${accountNo}`, bankValX, footerSectionTopY + (fStep * 3.3), { maxWidth: bankValMaxW });

  doc.setFont('helvetica', 'normal');
  doc.text(`Branch & IFS Code`, bankSplitX + 1.5, footerSectionTopY + (fStep * 4.4));
  doc.text(`: ${branchIfsc}`, bankValX, footerSectionTopY + (fStep * 4.4), { maxWidth: bankValMaxW });

  // Right side: Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(6.8));
  doc.text(`for ${sellerName}`, (signatorySplitX + endX) / 2, footerSectionTopY + (footerHeight * 0.52), { align: 'center', maxWidth: signatoryW - 2 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(5.8));
  doc.text('Authorised Signatory', (signatorySplitX + endX) / 2, tableEndY - (2.5 * dimScale), { align: 'center' });

  // 7. Bottom Line Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(fs(6.5));
  doc.text(isCreditNote ? 'This is a Computer Generated Document' : 'This is a Computer Generated Invoice', centerX, pageHeight - (2.5 * dimScale), { align: 'center' });
}

// ==========================================
// Draw Official e-Way Bill Document Page (Page 2)
// ==========================================
export async function renderEWayBillPage(
  doc: jsPDF,
  inv: any,
  activeTenant: string = 'MAXTRON',
  qrDataUrl: string,
  options?: InvoiceLayoutOptions
) {
  const isKeil = activeTenant.toUpperCase() === 'KEIL';

  const sellerName = isKeil ? 'KEIL INDUSTRIES LTD' : 'MAXTRON ASSOCIATES';
  const sellerGstin = isKeil ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const sellerState = 'Kerala';
  const sellerDispatchAddr = isKeil
    ? 'Plot No. 45, Keil Industrial Complex, Phase II, Industrial Area, Kochi, Kerala 682024'
    : '13-95, 13-96, PIRIVUSALA, CHANDRANAGAR, PALAKKAD, KERALA Kerala Kerala 678007';

  const customer = inv.customers || {};
  // As on the tax invoice page: what is on record, never a sample.
  const customerName = customer.customer_name || '';
  const customerGstin = customer.gst_no || '';
  
  const rawAddresses = customer.addresses || [];
  const billingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[0] || {};
  const shippingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'shipping' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[1] || rawAddresses[0] || {};

  const customerShipAddr = [
    shippingAddrObj.street,
    shippingAddrObj.city,
    shippingAddrObj.state,
    customer.mobile_no ? `Contact:${customer.mobile_no}` : '',
    shippingAddrObj.zip_code
  ].filter(Boolean).join(', ');

  const buyer = buyerStateOf(billingAddrObj, customerGstin, getStateCode(sellerState));
  const buyerState = buyer.name;
  const isInterState = buyer.isInterState;

  const invoiceNo = inv.invoice_number || '';
  const invoiceDate = formatInvoiceDate(inv.invoice_date);
  const ewbNo = inv.ewb_no || '';
  const ewbDate = inv.ewb_date ? formatDateTime(inv.ewb_date) : '';
  const ewbValidUpto = inv.ewb_valid_till ? formatDateTime(inv.ewb_valid_till) : '';
  const distance = inv.trans_distance ? `${inv.trans_distance} KM` : '';
  const vehicleNo = inv.vehicle_no || '';
  const transporterId = inv.transporter_id || '';
  const transporterName = inv.transporter_name || '';
  const transModeStr = inv.trans_mode === '2' ? '2 - Rail' : inv.trans_mode === '3' ? '3 - Air' : inv.trans_mode === '4' ? '4 - Ship' : '1 - Road';

  const irn = inv.einvoice_irn || '';
  const ackNo = inv.einvoice_ack_no || '';
  const ackDate = inv.einvoice_ack_date ? formatInvoiceDate(inv.einvoice_ack_date) : '';

  // Calculate Goods Details
  const items = Array.isArray(inv.items) ? inv.items : [];

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQty = 0;

  const processedGoods: EwbGoodsDetail[] = items.map((it: any) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const taxable = qty * rate;
    const gstP = lineGstPercent(it, inv);
    const pName = it.finished_products?.product_name ? `${it.finished_products.product_name}` : (it.product_name || '');
    const hsn = it.finished_products?.hsn_code || it.hsn_code || '';

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = (taxable * gstP) / 100;
    } else {
      cgst = (taxable * (gstP / 2)) / 100;
      sgst = (taxable * (gstP / 2)) / 100;
    }

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    totalQty += qty;

    return {
      name: pName,
      hsn,
      qty,
      taxable,
      gstRateStr: isInterState ? `${gstP}` : `${gstP / 2}+${gstP / 2}`
    };
  });

  const totalTaxAmount = isInterState ? totalIgst : (totalCgst + totalSgst);
  const netInvoiceAmount = Number(inv.net_amount) || (totalTaxable + totalTaxAmount);

  // ----------------------------------------------------
  // Dynamic Layout Coordinates
  // ----------------------------------------------------
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = options?.margin !== undefined ? options.margin : Math.max(6, Math.min(8, 8 * (pageWidth / 210)));
  const density = options?.density || 'standard';

  const startX = margin;
  const endX = pageWidth - margin;
  const boxWidth = endX - startX;
  const centerX = pageWidth / 2;
  const rPad = Math.max(1.8, 2.5 * (boxWidth / 194));

  const wScale = boxWidth / 194;
  const hScale = (pageHeight - 16) / 281;
  const dimScale = Math.max(0.35, Math.min(wScale, hScale));

  const userFontScale = options?.fontSizeScale || (density === 'compact' ? 0.9 : density === 'spacious' ? 1.05 : 1.0);
  const fs = (basePt: number) => Math.max(3.0, basePt * dimScale * userFontScale);

  // Header Title
  const ewbTopHeaderY = Math.max(4.0, 7.5 * dimScale);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(13.5));
  doc.setTextColor(0, 0, 0);
  doc.text('e-Way Bill', centerX, ewbTopHeaderY, { align: 'center' });

  // QR Code on top right with tag
  const qrSize = Math.max(14, Math.min(26, 26 * dimScale));
  const qrX = endX - qrSize;
  doc.setFontSize(fs(8.5));
  doc.text('e-Way Bill', qrX + (qrSize / 2), ewbTopHeaderY, { align: 'center' });

  const qrY = ewbTopHeaderY + (2.5 * dimScale);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  // Top Left Header Metadata
  const metaStartY = ewbTopHeaderY + (4.5 * dimScale);
  doc.setFontSize(fs(7.2));
  doc.text(`Doc No.:  ${invoiceNo}`, startX, metaStartY);
  doc.text(`Date :     ${invoiceDate}`, startX, metaStartY + (4.0 * dimScale));

  doc.text(`IRN :  ${irn.length > 36 ? irn.substring(0, 36) + '...' : irn}`, startX, metaStartY + (9.0 * dimScale));
  doc.text(`Ack No. : ${ackNo}`, startX, metaStartY + (13.0 * dimScale));
  doc.text(`Ack Date: ${ackDate}`, startX, metaStartY + (17.0 * dimScale));

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // ==========================================
  // Section 1: e-Way Bill Details
  // ==========================================
  let curY = Math.max(qrY + qrSize + (3.5 * dimScale), metaStartY + (21.0 * dimScale));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.2));
  doc.text('1. e-Way Bill Details', startX, curY);

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  const col1W = boxWidth * 0.36;
  const col2W = boxWidth * 0.28;

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.8));
  doc.text('e-Way Bill No.:', startX, curY);
  doc.setFont('helvetica', 'bold');
  const ewbNoOffset = doc.getTextWidth('e-Way Bill No.: ') + (1 * dimScale);
  doc.text(ewbNo, startX + ewbNoOffset, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Mode', startX + col1W, curY);
  const modeOffset = doc.getTextWidth('Mode : ') + (1 * dimScale);
  doc.text(`: ${transModeStr}`, startX + col1W + modeOffset, curY);

  doc.text('Generated Date :', startX + col1W + col2W, curY);
  doc.setFont('helvetica', 'bold');
  const genDateOffset = doc.getTextWidth('Generated Date : ') + (1 * dimScale);
  doc.text(ewbDate, startX + col1W + col2W + genDateOffset, curY, { maxWidth: (endX - (startX + col1W + col2W + genDateOffset)) - rPad });

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.text('Generated By:', startX, curY);
  doc.setFont('helvetica', 'bold');
  const genByOffset = doc.getTextWidth('Generated By: ') + (1 * dimScale);
  doc.text(sellerGstin, startX + genByOffset, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Approx Distance:', startX + col1W, curY);
  doc.setFont('helvetica', 'bold');
  const distOffset = doc.getTextWidth('Approx Distance: ') + (1 * dimScale);
  doc.text(distance, startX + col1W + distOffset, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Valid Upto', startX + col1W + col2W, curY);
  doc.setFont('helvetica', 'bold');
  const validOffset = doc.getTextWidth('Valid Upto : ') + (1 * dimScale);
  doc.text(`: ${ewbValidUpto}`, startX + col1W + col2W + validOffset, curY, { maxWidth: (endX - (startX + col1W + col2W + validOffset)) - rPad });

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.text('Supply Type:', startX, curY);
  doc.setFont('helvetica', 'bold');
  const supTypeOffset = doc.getTextWidth('Supply Type: ') + (1 * dimScale);
  doc.text('Outward', startX + supTypeOffset, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Transaction Type :', startX + col1W, curY);
  doc.setFont('helvetica', 'bold');
  const transTypeOffset = doc.getTextWidth('Transaction Type : ') + (1 * dimScale);
  doc.text('Regular', startX + col1W + transTypeOffset, curY);

  curY += 3 * dimScale;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 2: Address Details
  // ==========================================
  curY += 4.5 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.2));
  doc.text('2. Address Details', startX, curY);

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  // 2 Columns (From / To)
  const addrMidX = startX + (boxWidth * 0.5);
  const addrColW = (boxWidth * 0.5) - (4 * dimScale);

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(7.5));
  doc.text('From', startX, curY);
  doc.text('To', addrMidX, curY);

  curY += 3.5 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(7.0));
  doc.text(sellerName, startX, curY, { maxWidth: addrColW });
  doc.text(customerName, addrMidX, curY, { maxWidth: addrColW });

  curY += 3.5 * dimScale;
  doc.text(`GSTIN : ${sellerGstin}`, startX, curY);
  doc.text(`GSTIN : ${customerGstin}`, addrMidX, curY);

  curY += 3.5 * dimScale;
  doc.text(sellerState, startX, curY);
  doc.text(buyerState, addrMidX, curY);

  curY += 4.5 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.text('Dispatch From', startX, curY);
  doc.text('Ship To', addrMidX, curY);

  curY += 3.5 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.5));
  const splitDisp = doc.splitTextToSize(sellerDispatchAddr, addrColW);
  const splitShip = doc.splitTextToSize(customerShipAddr, addrColW);
  doc.text(splitDisp.slice(0, 3), startX, curY);
  doc.text(splitShip.slice(0, 3), addrMidX, curY);

  curY += Math.max(Math.min(splitDisp.length, 3), Math.min(splitShip.length, 3)) * (3.0 * dimScale) + (2 * dimScale);
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 3: Goods Details Table
  // ==========================================
  curY += 4.5 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.2));
  doc.text('3. Goods Details', startX, curY);

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  curY += 3.5 * dimScale;
  doc.setFontSize(fs(6.5));
  doc.text('HSN', startX, curY);
  doc.text('Product Name & Desc', startX + (boxWidth * 0.15), curY);
  doc.text('Quantity', startX + (boxWidth * 0.62), curY, { align: 'right' });
  doc.text('Taxable Amt', startX + (boxWidth * 0.82), curY, { align: 'right' });
  doc.text('Tax Rate', endX - rPad, curY, { align: 'right' });

  curY += 2.5 * dimScale;
  doc.text('Code', startX, curY);
  doc.text('(C+S)', endX - rPad, curY, { align: 'right' });

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  // Items rows
  processedGoods.forEach((g) => {
    curY += 4.2 * dimScale;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fs(7.0));
    doc.text(g.hsn, startX, curY);
    doc.text(g.name, startX + (boxWidth * 0.15), curY, { maxWidth: (boxWidth * 0.45) });
    doc.text(`${formatINR(g.qty)} KGS`, startX + (boxWidth * 0.62), curY, { align: 'right' });
    doc.text(formatINR(g.taxable), startX + (boxWidth * 0.82), curY, { align: 'right' });
    doc.text(g.gstRateStr, endX - rPad, curY, { align: 'right' });
  });

  curY += 4.5 * dimScale;
  doc.line(startX, curY, endX, curY);

  // Totals Breakdown
  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.5));
  doc.text('Tot.Taxable Amt :', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalTaxable), startX + (25 * dimScale), curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Other Amt :', startX + col1W, curY);

  doc.text('Total Inv Amt :', startX + col1W + col2W, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(netInvoiceAmount), endX - rPad, curY, { align: 'right' });

  curY += 3.8 * dimScale;
  if (isInterState) {
    doc.setFont('helvetica', 'normal');
    doc.text('IGST Amt :', startX, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalIgst), startX + (25 * dimScale), curY);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('CGST Amt :', startX, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalCgst), startX + (25 * dimScale), curY);

    doc.setFont('helvetica', 'normal');
    doc.text('SGST Amt :', startX + col1W, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalSgst), startX + col1W + (18 * dimScale), curY);
  }

  curY += 2.5 * dimScale;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 4: Transportation Details
  // ==========================================
  curY += 4.5 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.2));
  doc.text('4. Transportation Details', startX, curY);

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.8));
  doc.text('Transporter ID :', startX, curY);
  if (transporterId) {
    doc.setFont('helvetica', 'bold');
    doc.text(transporterId, startX + (22 * dimScale), curY);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Doc No. :', startX + col1W + col2W, curY);

  curY += 3.8 * dimScale;
  doc.text('Name :', startX, curY);
  if (transporterName) {
    doc.setFont('helvetica', 'bold');
    doc.text(transporterName, startX + (22 * dimScale), curY);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Date :', startX + col1W + col2W, curY);

  curY += 2.5 * dimScale;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 5: Vehicle Details
  // ==========================================
  curY += 4.5 * dimScale;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fs(8.2));
  doc.text('5. Vehicle Details', startX, curY);

  curY += 2 * dimScale;
  doc.line(startX, curY, endX, curY);

  curY += 4 * dimScale;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs(6.8));
  doc.text('Vehicle No.', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`:  ${vehicleNo}`, startX + (16 * dimScale), curY);

  doc.setFont('helvetica', 'normal');
  doc.text('From', startX + col1W, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`:  ${sellerState}`, startX + col1W + (12 * dimScale), curY);

  doc.setFont('helvetica', 'normal');
  doc.text('CEWB No.:', startX + col1W + col2W, curY);

  curY += 2.5 * dimScale;
  doc.line(startX, curY, endX, curY);
}

// =========================================================================
// Main Export Function: Generate Full 5-Page Document Bundle PDF
// =========================================================================
export async function generateAllInvoiceDocumentsPDF(
  inv: any,
  activeTenant: string = 'MAXTRON',
  options?: InvoiceLayoutOptions
): Promise<jsPDF> {
  const requestedWidth = options?.pageWidth || 210;
  const requestedHeight = options?.pageHeight || 297;
  const isLandscape = requestedWidth > requestedHeight;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [requestedWidth, requestedHeight]
  });

  // Check if e-Way Bill was generated for this invoice
  const isEwbGenerated = inv.ewb_status === 'GENERATED' || Boolean(inv.ewb_no && inv.ewb_status !== 'CANCELLED' && inv.ewb_status !== 'FAILED');

  // Prepare QR Data URLs
  const invoiceNo = inv.invoice_number || '';
  const ewbNo = inv.ewb_no || '';
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const buyerGstin = inv.customers?.gst_no || '';
  const netAmount = Number(inv.net_amount) || 0;
  const irn = inv.einvoice_irn || '';

  // The QR code is the registered e-Invoice's; with no IRN there is nothing to encode.
  const einvoiceQrData = !irn ? '' : (inv.einvoice_signed_qr_code || JSON.stringify({
    SellerGstin: gstin,
    BuyerGstin: buyerGstin,
    DocNo: invoiceNo,
    DocTyp: 'INV',
    DocDt: formatInvoiceDate(inv.invoice_date),
    TotInvVal: netAmount,
    ItemCnt: inv.items?.length || 0,
    MainHsnCode: inv.items?.[0]?.finished_products?.hsn_code || '',
    Irn: irn
  }));

  const [einvoiceQrUrl, logoDataUrl] = await Promise.all([
    einvoiceQrData ? generateQRCodeDataUrl(einvoiceQrData) : Promise.resolve(''),
    getMaxtronLogoDataUrl()
  ]);

  // Page 1: Tax Invoice (ORIGINAL FOR RECIPIENT)
  await renderTaxInvoicePage(doc, inv, activeTenant, '(ORIGINAL FOR RECIPIENT)', einvoiceQrUrl, logoDataUrl, options);

  // Page 2: e-Way Bill (ONLY IF E-WAY BILL WAS GENERATED)
  if (isEwbGenerated) {
    const ewbQrData = JSON.stringify({
      ewbNo: ewbNo,
      ewbDate: inv.ewb_date || formatInvoiceDate(inv.invoice_date),
      genGstin: gstin,
      docNo: invoiceNo,
      docDate: formatInvoiceDate(inv.invoice_date),
      fromGstin: gstin,
      toGstin: buyerGstin,
      totVal: Number(netAmount)
    });
    const ewbQrUrl = await generateQRCodeDataUrl(ewbQrData);
    doc.addPage([requestedWidth, requestedHeight], isLandscape ? 'landscape' : 'portrait');
    await renderEWayBillPage(doc, inv, activeTenant, ewbQrUrl, options);
  }

  // Tax Invoice Copies
  doc.addPage([requestedWidth, requestedHeight], isLandscape ? 'landscape' : 'portrait');
  await renderTaxInvoicePage(doc, inv, activeTenant, '(DUPLICATE FOR TRANSPORTER)', einvoiceQrUrl, logoDataUrl, options);

  doc.addPage([requestedWidth, requestedHeight], isLandscape ? 'landscape' : 'portrait');
  await renderTaxInvoicePage(doc, inv, activeTenant, '(TRIPLICATE FOR SUPPLIER)', einvoiceQrUrl, logoDataUrl, options);

  doc.addPage([requestedWidth, requestedHeight], isLandscape ? 'landscape' : 'portrait');
  await renderTaxInvoicePage(doc, inv, activeTenant, '(EXTRA COPY)', einvoiceQrUrl, logoDataUrl, options);

  return doc;
}

// Download Trigger Helper
export async function downloadAllInvoiceDocs(
  inv: any,
  activeTenant: string = 'MAXTRON',
  onSuccess?: () => void,
  onError?: (err: any) => void,
  options?: InvoiceLayoutOptions
) {
  try {
    const doc = await generateAllInvoiceDocumentsPDF(inv, activeTenant, options);
    const invoiceNumber = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${invoiceNumber}_All_Documents.pdf`;
    doc.save(filename);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error('Error generating all invoice documents PDF:', err);
    if (onError) onError(err);
  }
}

/**
 * The tax invoice as a PDF document, not yet saved. The on-screen preview
 * shows this, and the download saves it — one page, drawn once, so what is
 * previewed is what prints.
 */
export async function buildSingleTaxInvoice(
  inv: any,
  activeTenant: string = 'MAXTRON',
  copyType: string = '(ORIGINAL FOR RECIPIENT)',
  options?: InvoiceLayoutOptions
): Promise<jsPDF> {
  const requestedWidth = options?.pageWidth || 210;
  const requestedHeight = options?.pageHeight || 297;
  const isLandscape = requestedWidth > requestedHeight;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [requestedWidth, requestedHeight]
  });
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  // The QR code is the registered e-Invoice's; with no IRN there is nothing to encode.
  const qrData = !inv.einvoice_irn ? '' : (inv.einvoice_signed_qr_code || JSON.stringify({
    SellerGstin: gstin,
    BuyerGstin: inv.customers?.gst_no || '',
    DocNo: inv.invoice_number || '',
    DocTyp: 'INV',
    TotInvVal: Number(inv.net_amount || 0),
    Irn: inv.einvoice_irn
  }));
  const [qrUrl, logoDataUrl] = await Promise.all([
    qrData ? generateQRCodeDataUrl(qrData) : Promise.resolve(''),
    getMaxtronLogoDataUrl()
  ]);
  await renderTaxInvoicePage(doc, inv, activeTenant, copyType, qrUrl, logoDataUrl, options);
  return doc;
}

// Download Single Document (e.g. only Tax Invoice or only e-Way Bill)
export async function downloadSingleTaxInvoice(
  inv: any,
  activeTenant: string = 'MAXTRON',
  copyType: string = '(ORIGINAL FOR RECIPIENT)',
  options?: InvoiceLayoutOptions
) {
  const doc = await buildSingleTaxInvoice(inv, activeTenant, copyType, options);
  const cleanInvNo = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanType = copyType.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanInvNo}_Tax_Invoice_${cleanType}.pdf`);
}

export async function downloadSingleEWayBill(
  inv: any,
  activeTenant: string = 'MAXTRON',
  options?: InvoiceLayoutOptions
) {
  const requestedWidth = options?.pageWidth || 210;
  const requestedHeight = options?.pageHeight || 297;
  const isLandscape = requestedWidth > requestedHeight;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [requestedWidth, requestedHeight]
  });
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  // There is no e-Way Bill document to print for an invoice that has none.
  if (!inv.ewb_no) throw new Error('No e-Way Bill has been generated for this invoice.');
  const qrData = JSON.stringify({
    ewbNo: inv.ewb_no,
    docNo: inv.invoice_number || '',
    fromGstin: gstin,
    toGstin: inv.customers?.gst_no || '',
    totVal: Number(inv.net_amount || 0)
  });
  const qrUrl = await generateQRCodeDataUrl(qrData);
  await renderEWayBillPage(doc, inv, activeTenant, qrUrl, options);
  const cleanInvNo = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanInvNo}_eWayBill.pdf`);
}
