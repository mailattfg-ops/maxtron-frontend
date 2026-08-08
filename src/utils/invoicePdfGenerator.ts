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

// State Code Mapping
const STATE_CODES: Record<string, string> = {
  'kerala': '32',
  'tamil nadu': '33',
  'karnataka': '29',
  'maharashtra': '27',
  'andhra pradesh': '37',
  'telangana': '36',
  'delhi': '07',
  'gujarat': '24',
  'uttar pradesh': '09',
  'haryana': '06',
  'punjab': '03',
  'west bengal': '19',
  'rajasthan': '08',
  'madhya pradesh': '23',
  'bihar': '10',
  'odisha': '21',
  'goa': '30'
};

export function getStateCode(stateName?: string): string {
  if (!stateName) return '32';
  const clean = stateName.trim().toLowerCase();
  return STATE_CODES[clean] || '32';
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
export async function renderTaxInvoicePage(
  doc: jsPDF,
  inv: any,
  activeTenant: string = 'MAXTRON',
  copySubtitle: string = '(ORIGINAL FOR RECIPIENT)',
  qrDataUrl: string,
  logoDataUrl?: string | null
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
  const customerName = customer.customer_name || 'THE NATIONAL AGENCIES';
  const customerGstin = customer.gst_no || '32BDXPP5589C1ZZ';
  
  // Addresses
  const rawAddresses = customer.addresses || [];
  const billingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[0] || {};
  const shippingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'shipping' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[1] || rawAddresses[0] || {};

  const buildAddressStr = (addr: any) => {
    const parts = [addr.street, addr.city, addr.state, addr.zip_code].filter(Boolean);
    if (customer.contact_person || customer.mobile_no) {
      parts.push(`Contact: ${customer.mobile_no || customer.contact_person}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Cellar, Ground and First Floors, 67/11896, 67/11897, 67/11898, CENTURY BUILDING, Basin Road, St Thomas Church, NEAR MARKET ROAD, Kochi, Ernakulam, Kerala, Contact:8089758114';
  };

  const consigneeAddress = buildAddressStr(shippingAddrObj);
  const buyerAddress = buildAddressStr(billingAddrObj);
  const buyerState = billingAddrObj.state || 'Kerala';
  const buyerStateCode = getStateCode(buyerState);

  // Invoice & e-Invoice Info
  const invoiceNo = inv.invoice_number || 'MA154/26-27';
  const ewbNo = inv.ewb_no || '592050677018';
  const invoiceDate = formatInvoiceDate(inv.invoice_date);
  const orderNo = inv.orders?.order_number || '';
  const orderDate = inv.orders?.order_date ? formatInvoiceDate(inv.orders.order_date) : '';
  const irn = inv.einvoice_irn || 'adc49db2ff35768faa247a838a7a23a6ed8fae3d99db8fb76736ee546d62b404';
  const ackNo = inv.einvoice_ack_no || '152626715521045';
  const ackDate = inv.einvoice_ack_date ? formatInvoiceDate(inv.einvoice_ack_date) : invoiceDate;

  // Tax and Item Calculations
  const isInterState = buyerState.trim().toLowerCase() !== sellerState.toLowerCase();
  const items = (inv.items && inv.items.length > 0) ? inv.items : [
    {
      product_name: 'GREEN BAG',
      product_code: 'FP-000001',
      hsn_code: '39232100',
      size: 'Size:30×50',
      quantity: 1200,
      rate: 105,
      gst_percent: 18,
      amount: 148680
    }
  ];

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQty = 0;

  const processedItems: InvoiceItemDetail[] = items.map((item: any) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxable = qty * rate;
    const gstP = Number(item.gst_percent) || 18;
    const pName = item.finished_products?.product_name || item.product_name || 'GREEN BAG';
    const hsn = item.finished_products?.hsn_code || item.hsn_code || '39232100';
    const size = item.finished_products?.size || item.size || 'Size:30×50';

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
  // Layout Coordinates on A4 Sheet (210mm x 297mm)
  // ----------------------------------------------------
  const startX = 8;
  const endX = 202;
  const boxWidth = endX - startX; // 194mm

  // 1. Top Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('Tax Invoice', 105, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(copySubtitle, 105, 14.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('e-Invoice', endX, 10, { align: 'right' });

  // 2. IRN & Ack details (Left) and QR Code (Right)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('IRN :', startX, 19);
  doc.setFont('helvetica', 'normal');

  const irnLine1 = irn.length > 50 ? irn.substring(0, 48) + '-' : irn;
  const irnLine2 = irn.length > 50 ? irn.substring(48) : '';
  doc.setFont('helvetica', 'bold');
  doc.text(irnLine1, startX + 10, 19);
  if (irnLine2) {
    doc.text(irnLine2, startX + 10, 23);
  }

  const ackY = irnLine2 ? 27 : 24;
  doc.text(`Ack No. : ${ackNo}`, startX, ackY);
  doc.text(`Ack Date : ${ackDate}`, startX, ackY + 4);

  // QR Code on the right
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', endX - 32, 13, 32, 32);
  }

  // 3. Main Border Box Outer Frame
  const tableStartY = 46;
  const tableEndY = 286;
  const tableHeight = tableEndY - tableStartY; // 240mm

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(startX, tableStartY, boxWidth, tableHeight);

  // ----------------------------------------------------
  // Section 1: Company Header (Left) & Metadata (Right)
  // ----------------------------------------------------
  const metaSplitX = startX + 90; // 98mm
  const sellerBoxEndY = tableStartY + 30; // 76mm
  const consigneeBoxEndY = tableStartY + 61; // 107mm
  const partiesEndY = tableStartY + 92; // 138mm

  // Vertical split between Left (Parties) and Right (Metadata)
  doc.line(metaSplitX, tableStartY, metaSplitX, partiesEndY);

  // Left Section 1: Seller Info with High-Res PNG Logo
  await drawCompanyLogo(doc, startX + 2, tableStartY + 3, 14, isKeil, logoDataUrl);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(sellerName, startX + 18, tableStartY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(sellerAddr1, startX + 18, tableStartY + 9.5);
  doc.text(sellerAddr2, startX + 18, tableStartY + 13.5);
  doc.text(sellerAddr3, startX + 18, tableStartY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN: ${sellerGstin}`, startX + 18, tableStartY + 21.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`State Name : ${sellerState}, Code : ${sellerStateCode}`, startX + 18, tableStartY + 25);
  doc.text(`E-Mail : ${sellerEmail}`, startX + 18, tableStartY + 28.5);

  // Divider under Seller
  doc.line(startX, sellerBoxEndY, metaSplitX, sellerBoxEndY);

  // Left Section 2: Consignee (Ship to)
  doc.setFontSize(6.5);
  doc.text('Consignee (Ship to)', startX + 2, sellerBoxEndY + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(customerName, startX + 2, sellerBoxEndY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const splitConsigneeAddr = doc.splitTextToSize(consigneeAddress, 86);
  const consigneeLines = splitConsigneeAddr.slice(0, 3);
  doc.text(consigneeLines, startX + 2, sellerBoxEndY + 11);

  const consigneeGstinY = sellerBoxEndY + 11 + (consigneeLines.length * 3.2) + 1.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${customerGstin}`, startX + 2, Math.min(consigneeGstinY, consigneeBoxEndY - 7));
  doc.setFont('helvetica', 'normal');
  doc.text(`State Name : ${buyerState}, Code : ${buyerStateCode}`, startX + 2, Math.min(consigneeGstinY + 3.5, consigneeBoxEndY - 3.5));

  // Divider under Consignee
  doc.line(startX, consigneeBoxEndY, metaSplitX, consigneeBoxEndY);

  // Left Section 3: Buyer (Bill to)
  doc.setFontSize(6.5);
  doc.text('Buyer (Bill to)', startX + 2, consigneeBoxEndY + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(customerName, startX + 2, consigneeBoxEndY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const splitBuyerAddr = doc.splitTextToSize(buyerAddress, 86);
  const buyerLines = splitBuyerAddr.slice(0, 3);
  doc.text(buyerLines, startX + 2, consigneeBoxEndY + 11);

  const buyerGstinY = consigneeBoxEndY + 11 + (buyerLines.length * 3.2) + 1.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${customerGstin}`, startX + 2, Math.min(buyerGstinY, partiesEndY - 7));
  doc.setFont('helvetica', 'normal');
  doc.text(`State Name : ${buyerState}, Code : ${buyerStateCode}`, startX + 2, Math.min(buyerGstinY + 3.5, partiesEndY - 3.5));

  // Bottom divider under entire parties & metadata section
  doc.line(startX, partiesEndY, endX, partiesEndY);

  // ----------------------------------------------------
  // Right Section: Metadata Grid (6 balanced rows)
  // ----------------------------------------------------
  const rRow1Y = tableStartY + 15;  // 61mm
  const rRow2Y = tableStartY + 30;  // 76mm
  const rRow3Y = tableStartY + 45;  // 91mm
  const rRow4Y = tableStartY + 60;  // 106mm
  const rRow5Y = tableStartY + 76;  // 122mm
  const rRow6Y = partiesEndY;       // 138mm

  doc.line(metaSplitX, rRow1Y, endX, rRow1Y);
  doc.line(metaSplitX, rRow2Y, endX, rRow2Y);
  doc.line(metaSplitX, rRow3Y, endX, rRow3Y);
  doc.line(metaSplitX, rRow4Y, endX, rRow4Y);
  doc.line(metaSplitX, rRow5Y, endX, rRow5Y);

  // Metadata Row 1 (3 Columns: Invoice No | e-Way Bill No | Dated)
  const rCol1X = metaSplitX + 34; // 132mm
  const rCol2X = metaSplitX + 70; // 168mm
  doc.line(rCol1X, tableStartY, rCol1X, rRow1Y);
  doc.line(rCol2X, tableStartY, rCol2X, rRow1Y);

  // Col 1: Invoice No
  doc.setFontSize(6.5);
  doc.text('Invoice No.', metaSplitX + 2, tableStartY + 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceNo, metaSplitX + 2, tableStartY + 9.5);

  // Col 2: e-Way Bill No
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('e-Way Bill No.', rCol1X + 2, tableStartY + 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(ewbNo || 'N/A', rCol1X + 2, tableStartY + 9.5);

  // Col 3: Dated
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Dated', rCol2X + 2, tableStartY + 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceDate, rCol2X + 2, tableStartY + 9.5);

  // Middle vertical column divider for Rows 2 to 6
  const rColMidX = metaSplitX + 52; // 150mm
  doc.line(rColMidX, rRow1Y, rColMidX, rRow6Y);

  // Row 2: Delivery Note | Mode/Terms of Payment
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Delivery Note', metaSplitX + 2, rRow1Y + 4);
  doc.text('Mode/Terms of Payment', rColMidX + 2, rRow1Y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(inv.payment_terms || 'Credit / 30 Days', rColMidX + 2, rRow1Y + 9);

  // Row 3: Reference No. & Date | Other References
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Reference No. & Date.', metaSplitX + 2, rRow2Y + 4);
  doc.text('Other References', rColMidX + 2, rRow2Y + 4);

  // Row 4: Buyer's Order No. | Dated
  doc.text("Buyer's Order No.", metaSplitX + 2, rRow3Y + 4);
  if (orderNo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(orderNo, metaSplitX + 2, rRow3Y + 9);
    doc.setFont('helvetica', 'normal');
  }
  doc.setFontSize(6.5);
  doc.text('Dated', rColMidX + 2, rRow3Y + 4);
  if (orderDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(orderDate, rColMidX + 2, rRow3Y + 9);
    doc.setFont('helvetica', 'normal');
  }

  // Row 5: Dispatch Doc No. | Delivery Note Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Dispatch Doc No.', metaSplitX + 2, rRow4Y + 4);
  if (inv.trans_doc_no) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(inv.trans_doc_no, metaSplitX + 2, rRow4Y + 9);
    doc.setFont('helvetica', 'normal');
  }
  doc.setFontSize(6.5);
  doc.text('Delivery Note Date', rColMidX + 2, rRow4Y + 4);
  if (inv.trans_doc_date) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(formatInvoiceDate(inv.trans_doc_date), rColMidX + 2, rRow4Y + 9);
    doc.setFont('helvetica', 'normal');
  }

  // Row 6: Dispatched through | Destination
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Dispatched through', metaSplitX + 2, rRow5Y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(inv.transporter_name || 'Direct Road Transport', metaSplitX + 2, rRow5Y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Destination', rColMidX + 2, rRow5Y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(billingAddrObj.city || buyerState || 'Kerala', rColMidX + 2, rRow5Y + 9);

  // ----------------------------------------------------
  // Section 3: Goods / Items Table
  // ----------------------------------------------------
  const goodsTableTopY = partiesEndY; // 138
  const goodsHeaderHeight = 7;
  const goodsHeaderBottomY = goodsTableTopY + goodsHeaderHeight; // 145
  const goodsTotalRowTopY = goodsTableTopY + 70;                 // 208
  const goodsTableBottomY = goodsTotalRowTopY + 8;              // 216

  doc.line(startX, goodsHeaderBottomY, endX, goodsHeaderBottomY);
  doc.line(startX, goodsTotalRowTopY, endX, goodsTotalRowTopY);
  doc.line(startX, goodsTableBottomY, endX, goodsTableBottomY);

  // Column X coordinates (matching official invoice proportions)
  const colSlX = startX + 10;   // 18mm  (Sl No: 10mm width)
  const colDescX = startX + 90; // 98mm  (Description: 80mm width)
  const colHsnX = startX + 116; // 124mm (HSN/SAC: 26mm width)
  const colQtyX = startX + 146; // 154mm (Quantity: 30mm width)
  const colRateX = startX + 162;// 170mm (Rate: 16mm width)
  const colPerX = startX + 174; // 182mm (per: 12mm width)
  // Amount column is from colPerX (182) to endX (202) -> 20mm width

  // Draw vertical columns from goodsTableTopY to goodsTotalRowTopY
  doc.line(colSlX, goodsTableTopY, colSlX, goodsTotalRowTopY);
  doc.line(colDescX, goodsTableTopY, colDescX, goodsTotalRowTopY);
  doc.line(colHsnX, goodsTableTopY, colHsnX, goodsTotalRowTopY);
  doc.line(colRateX, goodsTableTopY, colRateX, goodsTotalRowTopY);

  // The Quantity and Amount column borders extend ALL THE WAY to the bottom of the Total row!
  doc.line(colQtyX, goodsTableTopY, colQtyX, goodsTableBottomY);
  doc.line(colPerX, goodsTableTopY, colPerX, goodsTableBottomY);

  // Table Headers
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sl', (startX + colSlX) / 2, goodsTableTopY + 3, { align: 'center' });
  doc.text('No.', (startX + colSlX) / 2, goodsTableTopY + 5.5, { align: 'center' });
  doc.text('Description of Goods', colSlX + 2, goodsTableTopY + 4.5);
  doc.text('HSN/SAC', (colDescX + colHsnX) / 2, goodsTableTopY + 4.5, { align: 'center' });
  doc.text('Quantity', colQtyX - 2, goodsTableTopY + 4.5, { align: 'right' });
  doc.text('Rate', colRateX - 2, goodsTableTopY + 4.5, { align: 'right' });
  doc.text('per', (colRateX + colPerX) / 2, goodsTableTopY + 4.5, { align: 'center' });
  doc.text('Amount', endX - 2, goodsTableTopY + 4.5, { align: 'right' });

  // Render Items
  let currentItemY = goodsHeaderBottomY + 4.5;
  processedItems.forEach((it, idx) => {
    // Sl No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(idx + 1), (startX + colSlX) / 2, currentItemY, { align: 'center' });

    // Description
    doc.text(it.name, colSlX + 2, currentItemY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    if (it.size) {
      doc.text(it.size, colSlX + 2, currentItemY + 3.5);
    }

    // HSN
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(it.hsn, (colDescX + colHsnX) / 2, currentItemY, { align: 'center' });

    // Qty
    doc.text(`${formatINR(it.qty)} KGS`, colQtyX - 2, currentItemY, { align: 'right' });

    // Rate
    doc.text(formatINR(it.rate), colRateX - 2, currentItemY, { align: 'right' });

    // per
    doc.text('KGS', (colRateX + colPerX) / 2, currentItemY, { align: 'center' });

    // Taxable Amount
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(it.taxable), endX - 2, currentItemY, { align: 'right' });

    // Tax breakdown lines under description (OUTWARD CGST/SGST or IGST)
    const taxSubY = currentItemY + 12;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    if (isInterState) {
      doc.text(`OUTWARD IGST ${it.gstP}%`, colDescX - 2, taxSubY, { align: 'right' });
      doc.text(formatINR(it.igstAmt), endX - 2, taxSubY, { align: 'right' });
    } else {
      const halfP = it.gstP / 2;
      doc.text(`OUTWARD CGST ${halfP}%`, colDescX - 2, taxSubY, { align: 'right' });
      doc.text(formatINR(it.cgstAmt), endX - 2, taxSubY, { align: 'right' });

      doc.text(`OUTWARD SGST ${halfP}%`, colDescX - 2, taxSubY + 4, { align: 'right' });
      doc.text(formatINR(it.sgstAmt), endX - 2, taxSubY + 4, { align: 'right' });
    }
  });

  // Total Line in Goods Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total', colHsnX - 2, goodsTotalRowTopY + 5.2, { align: 'right' });
  doc.text(`${formatINR(totalQty)} KGS`, colQtyX - 2, goodsTotalRowTopY + 5.2, { align: 'right' });

  // Crisp Vector Rupee Symbol + Amount in the Amount column
  drawRupeeSymbol(doc, colPerX + 2, goodsTotalRowTopY + 5.2, 8);
  doc.setFontSize(8.5);
  doc.text(formatINR(netInvoiceAmount), endX - 2, goodsTotalRowTopY + 5.2, { align: 'right' });

  // ----------------------------------------------------
  // Section 4: Amount Chargeable in Words
  // ----------------------------------------------------
  const wordsRowTopY = goodsTableBottomY; // 216
  const wordsRowBottomY = wordsRowTopY + 10; // 226

  doc.line(startX, wordsRowBottomY, endX, wordsRowBottomY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Amount Chargeable (in words)', startX + 2, wordsRowTopY + 3.5);
  doc.setFont('helvetica', 'italic');
  doc.text('E. & O.E', endX - 2, wordsRowTopY + 3.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(amountWords, startX + 2, wordsRowTopY + 7.5);

  // ----------------------------------------------------
  // Section 5: Tax Analysis Table (HSN Breakdown)
  // ----------------------------------------------------
  const taxTableTopY = wordsRowBottomY; // 226
  const taxHeaderBottomY = taxTableTopY + 6; // 232
  const taxDataRowBottomY = taxHeaderBottomY + 6; // 238
  const taxTotalRowBottomY = taxDataRowBottomY + 5; // 243
  const taxWordsBottomY = taxTotalRowBottomY + 7; // 250

  doc.line(startX, taxHeaderBottomY, endX, taxHeaderBottomY);
  doc.line(startX, taxDataRowBottomY, endX, taxDataRowBottomY);
  doc.line(startX, taxTotalRowBottomY, endX, taxTotalRowBottomY);
  doc.line(startX, taxWordsBottomY, endX, taxWordsBottomY);

  // Tax table columns (proportional and balanced)
  const tColHsnX = startX + 46;       // 54mm  (HSN/SAC: 46mm)
  const tColTaxableX = startX + 82;   // 90mm  (Taxable Value: 36mm)
  const tColCgstRateX = startX + 98;  // 106mm (CGST Rate: 16mm)
  const tColCgstAmtX = startX + 124;  // 132mm (CGST Amount: 26mm)
  const tColSgstRateX = startX + 140; // 148mm (SGST Rate: 16mm)
  const tColSgstAmtX = startX + 166;  // 174mm (SGST Amount: 26mm)
  // Total Tax Amount is from tColSgstAmtX (174) to endX (202) -> 28mm

  doc.line(tColHsnX, taxTableTopY, tColHsnX, taxTotalRowBottomY);
  doc.line(tColTaxableX, taxTableTopY, tColTaxableX, taxTotalRowBottomY);
  doc.line(tColCgstAmtX, taxTableTopY, tColCgstAmtX, taxTotalRowBottomY);
  doc.line(tColSgstAmtX, taxTableTopY, tColSgstAmtX, taxTotalRowBottomY);

  // Sub-column dividers for CGST & SGST (Rate / Amount)
  doc.line(tColCgstRateX, taxHeaderBottomY, tColCgstRateX, taxTotalRowBottomY);
  doc.line(tColSgstRateX, taxHeaderBottomY, tColSgstRateX, taxTotalRowBottomY);

  // Headers
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('HSN/SAC', (startX + tColHsnX) / 2, taxTableTopY + 4, { align: 'center' });
  doc.text('Taxable', (tColHsnX + tColTaxableX) / 2, taxTableTopY + 3, { align: 'center' });
  doc.text('Value', (tColHsnX + tColTaxableX) / 2, taxTableTopY + 5, { align: 'center' });

  if (isInterState) {
    doc.text('IGST', (tColTaxableX + tColSgstAmtX) / 2, taxTableTopY + 3, { align: 'center' });
    doc.text('Rate', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY - 1, { align: 'center' });
    doc.text('Amount', (tColCgstRateX + tColSgstAmtX) / 2, taxHeaderBottomY - 1, { align: 'center' });
  } else {
    doc.text('CGST', (tColTaxableX + tColCgstAmtX) / 2, taxTableTopY + 3, { align: 'center' });
    doc.text('Rate', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY - 1, { align: 'center' });
    doc.text('Amount', (tColCgstRateX + tColCgstAmtX) / 2, taxHeaderBottomY - 1, { align: 'center' });

    doc.text('SGST/UTGST', (tColCgstAmtX + tColSgstAmtX) / 2, taxTableTopY + 3, { align: 'center' });
    doc.text('Rate', (tColCgstAmtX + tColSgstRateX) / 2, taxHeaderBottomY - 1, { align: 'center' });
    doc.text('Amount', (tColSgstRateX + tColSgstAmtX) / 2, taxHeaderBottomY - 1, { align: 'center' });
  }

  doc.text('Total', (tColSgstAmtX + endX) / 2, taxTableTopY + 3, { align: 'center' });
  doc.text('Tax Amount', (tColSgstAmtX + endX) / 2, taxTableTopY + 5, { align: 'center' });

  // Tax Row 1 Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(processedItems[0]?.hsn || '39232100', startX + 2, taxHeaderBottomY + 4);
  doc.text(formatINR(totalTaxable), tColTaxableX - 2, taxHeaderBottomY + 4, { align: 'right' });

  if (isInterState) {
    doc.text('18%', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY + 4, { align: 'center' });
    doc.text(formatINR(totalIgst), tColSgstAmtX - 2, taxHeaderBottomY + 4, { align: 'right' });
  } else {
    doc.text('9%', (tColTaxableX + tColCgstRateX) / 2, taxHeaderBottomY + 4, { align: 'center' });
    doc.text(formatINR(totalCgst), tColCgstAmtX - 2, taxHeaderBottomY + 4, { align: 'right' });
    doc.text('9%', (tColCgstAmtX + tColSgstRateX) / 2, taxHeaderBottomY + 4, { align: 'center' });
    doc.text(formatINR(totalSgst), tColSgstAmtX - 2, taxHeaderBottomY + 4, { align: 'right' });
  }
  doc.text(formatINR(totalTaxAmount), endX - 2, taxHeaderBottomY + 4, { align: 'right' });

  // Tax Total Row
  doc.setFont('helvetica', 'bold');
  doc.text('Total', tColHsnX - 2, taxDataRowBottomY + 3.5, { align: 'right' });
  doc.text(formatINR(totalTaxable), tColTaxableX - 2, taxDataRowBottomY + 3.5, { align: 'right' });
  if (isInterState) {
    doc.text(formatINR(totalIgst), tColSgstAmtX - 2, taxDataRowBottomY + 3.5, { align: 'right' });
  } else {
    doc.text(formatINR(totalCgst), tColCgstAmtX - 2, taxDataRowBottomY + 3.5, { align: 'right' });
    doc.text(formatINR(totalSgst), tColSgstAmtX - 2, taxDataRowBottomY + 3.5, { align: 'right' });
  }
  doc.text(formatINR(totalTaxAmount), endX - 2, taxDataRowBottomY + 3.5, { align: 'right' });

  // Tax in Words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Tax Amount (in words) :  `, startX + 2, taxTotalRowBottomY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(taxWords, startX + 32, taxTotalRowBottomY + 4.5);

  // ----------------------------------------------------
  // Section 6: Declaration & Bank Details & Signatory
  // ----------------------------------------------------
  const footerSectionTopY = taxWordsBottomY; // 250
  const bankSplitX = startX + 90; // 98mm

  doc.line(bankSplitX, footerSectionTopY, bankSplitX, tableEndY);

  // Left side: Declaration
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Declaration', startX + 2, footerSectionTopY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const declText = 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
  const splitDecl = doc.splitTextToSize(declText, 86);
  doc.text(splitDecl, startX + 2, footerSectionTopY + 8);

  // Right side: Bank Details & Authorised Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text("Company's Bank Details", bankSplitX + 2, footerSectionTopY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Bank Name`, bankSplitX + 2, footerSectionTopY + 8);
  doc.text(`: ${bankName}`, bankSplitX + 26, footerSectionTopY + 8);

  doc.text(`A/c No.`, bankSplitX + 2, footerSectionTopY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${accountNo}`, bankSplitX + 26, footerSectionTopY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(`Branch & IFS Code`, bankSplitX + 2, footerSectionTopY + 16);
  doc.text(`: ${branchIfsc}`, bankSplitX + 26, footerSectionTopY + 16);

  // Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`for ${sellerName}`, endX - 2, footerSectionTopY + 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorised Signatory', endX - 2, tableEndY - 3, { align: 'right' });

  // 7. Bottom Line Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('This is a Computer Generated Invoice', 105, 291, { align: 'center' });
}

// ==========================================
// Draw Official e-Way Bill Document Page (Page 2)
// ==========================================
export async function renderEWayBillPage(
  doc: jsPDF,
  inv: any,
  activeTenant: string = 'MAXTRON',
  qrDataUrl: string
) {
  const isKeil = activeTenant.toUpperCase() === 'KEIL';

  const sellerName = isKeil ? 'KEIL INDUSTRIES LTD' : 'MAXTRON ASSOCIATES';
  const sellerGstin = isKeil ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const sellerState = 'Kerala';
  const sellerDispatchAddr = isKeil
    ? 'Plot No. 45, Keil Industrial Complex, Phase II, Industrial Area, Kochi, Kerala 682024'
    : '13-95, 13-96, PIRIVUSALA, CHANDRANAGAR, PALAKKAD, KERALA Kerala Kerala 678007';

  const customer = inv.customers || {};
  const customerName = customer.customer_name || 'THE NATIONAL AGENCIES';
  const customerGstin = customer.gst_no || '32BDXPP5589C1ZZ';
  
  const rawAddresses = customer.addresses || [];
  const billingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'billing' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[0] || {};
  const shippingAddrObj = rawAddresses.find((a: any) => a.address_type?.toLowerCase() === 'shipping' || a.address_type?.toLowerCase() === 'customer') || rawAddresses[1] || rawAddresses[0] || {};

  const customerShipAddr = [
    shippingAddrObj.street || 'Cellar, Ground and First Floors, 67/11896, 67/11897, 67/11898, CENTURY BUILDING',
    'Basin Road, St Thomas Church, NEAR, MARKET ROAD',
    shippingAddrObj.city || 'Kochi, Ernakulam',
    shippingAddrObj.state || 'Kerala',
    customer.mobile_no ? `Contact:${customer.mobile_no}` : '',
    shippingAddrObj.zip_code || '682018'
  ].filter(Boolean).join(', ');

  const buyerState = billingAddrObj.state || 'Kerala';
  const isInterState = buyerState.trim().toLowerCase() !== 'kerala';

  const invoiceNo = inv.invoice_number || 'MA154/26-27';
  const invoiceDate = formatInvoiceDate(inv.invoice_date);
  const ewbNo = inv.ewb_no || '592050677018';
  const ewbDate = inv.ewb_date ? formatDateTime(inv.ewb_date) : `${invoiceDate} 10:28 AM`;
  const ewbValidUpto = inv.ewb_valid_till ? formatDateTime(inv.ewb_valid_till) : `8-Aug-26 11:59 PM`;
  const distance = inv.trans_distance ? `${inv.trans_distance} KM` : '132 KM';
  const vehicleNo = inv.vehicle_no || 'KL09AV7027';
  const transporterId = inv.transporter_id || '';
  const transporterName = inv.transporter_name || '';
  const transModeStr = inv.trans_mode === '2' ? '2 - Rail' : inv.trans_mode === '3' ? '3 - Air' : inv.trans_mode === '4' ? '4 - Ship' : '1 - Road';

  const irn = inv.einvoice_irn || 'adc49db2ff35768faa247a838a7a23a6ed8fae3d99db8fb76736ee546d62b404';
  const ackNo = inv.einvoice_ack_no || '152626715521045';
  const ackDate = inv.einvoice_ack_date ? formatInvoiceDate(inv.einvoice_ack_date) : invoiceDate;

  // Calculate Goods Details
  const items = (inv.items && inv.items.length > 0) ? inv.items : [
    {
      product_name: 'GREEN BAG & GREEN BAG',
      hsn_code: '39232100',
      quantity: 1200,
      rate: 105,
      gst_percent: 18,
      amount: 148680
    }
  ];

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalQty = 0;

  const processedGoods: EwbGoodsDetail[] = items.map((it: any) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const taxable = qty * rate;
    const gstP = Number(it.gst_percent) || 18;
    const pName = it.finished_products?.product_name ? `${it.finished_products.product_name} & ${it.finished_products.product_name}` : (it.product_name || 'GREEN BAG & GREEN BAG');
    const hsn = it.finished_products?.hsn_code || it.hsn_code || '39232100';

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
  // Layout Coordinates on A4 Sheet
  // ----------------------------------------------------
  const startX = 8;
  const endX = 202;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('e-Way Bill', 105, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.text('e-Way Bill', endX - 10, 12, { align: 'right' });

  // Top Left Header Metadata
  doc.setFontSize(7.5);
  doc.text(`Doc No.:  ${invoiceNo}`, startX, 20);
  doc.text(`Date :     ${invoiceDate}`, startX, 24);

  doc.text(`IRN :  ${irn}`, startX, 30);
  doc.text(`Ack No. : ${ackNo}`, startX, 34);
  doc.text(`Ack Date: ${ackDate}`, startX, 38);

  // QR Code on top right
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', endX - 34, 15, 34, 34);
  }

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // ==========================================
  // Section 1: e-Way Bill Details
  // ==========================================
  let curY = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1. e-Way Bill Details', startX, curY);

  curY += 2;
  doc.line(startX, curY, endX, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('e-Way Bill No.:', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(ewbNo, startX + 22, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Mode', startX + 70, curY);
  doc.text(`: ${transModeStr}`, startX + 90, curY);

  doc.text('Generated Date :', startX + 130, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(ewbDate, startX + 154, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Generated By:', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(sellerGstin, startX + 22, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Approx Distance:', startX + 70, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(distance, startX + 93, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Valid Upto', startX + 130, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${ewbValidUpto}`, startX + 152, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Supply Type:', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text('Outward', startX + 22, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Transaction Type :', startX + 70, curY);
  doc.setFont('helvetica', 'bold');
  doc.text('Regular', startX + 95, curY);

  curY += 3;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 2: Address Details
  // ==========================================
  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. Address Details', startX, curY);

  curY += 2;
  doc.line(startX, curY, endX, curY);

  // 2 Columns (From / To)
  const addrMidX = startX + 96;

  curY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('From', startX, curY);
  doc.text('To', addrMidX, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(sellerName, startX, curY);
  doc.text(customerName, addrMidX, curY);

  curY += 4;
  doc.text(`GSTIN : ${sellerGstin}`, startX, curY);
  doc.text(`GSTIN : ${customerGstin}`, addrMidX, curY);

  curY += 4;
  doc.text(sellerState, startX, curY);
  doc.text(buyerState, addrMidX, curY);

  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Dispatch From', startX, curY);
  doc.text('Ship To', addrMidX, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const splitDisp = doc.splitTextToSize(sellerDispatchAddr, 90);
  const splitShip = doc.splitTextToSize(customerShipAddr, 90);
  doc.text(splitDisp, startX, curY);
  doc.text(splitShip, addrMidX, curY);

  curY += Math.max(splitDisp.length, splitShip.length) * 3.5 + 2;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 3: Goods Details Table
  // ==========================================
  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. Goods Details', startX, curY);

  curY += 2;
  doc.line(startX, curY, endX, curY);

  curY += 4;
  doc.setFontSize(7);
  doc.text('HSN', startX, curY);
  doc.text('Product Name & Desc', startX + 28, curY);
  doc.text('Quantity', startX + 124, curY, { align: 'right' });
  doc.text('Taxable Amt', startX + 162, curY, { align: 'right' });
  doc.text('Tax Rate', endX, curY, { align: 'right' });

  curY += 3;
  doc.text('Code', startX, curY);
  doc.text('(C+S)', endX, curY, { align: 'right' });

  curY += 2;
  doc.line(startX, curY, endX, curY);

  // Items rows
  processedGoods.forEach((g) => {
    curY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(g.hsn, startX, curY);
    doc.text(g.name, startX + 28, curY);
    doc.text(`${formatINR(g.qty)} KGS`, startX + 124, curY, { align: 'right' });
    doc.text(formatINR(g.taxable), startX + 162, curY, { align: 'right' });
    doc.text(g.gstRateStr, endX, curY, { align: 'right' });
  });

  curY += 6;
  doc.line(startX, curY, endX, curY);

  // Totals Breakdown
  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Tot.Taxable Amt :', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalTaxable), startX + 28, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('Other Amt :', startX + 70, curY);

  doc.text('Total Inv Amt :', startX + 130, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(netInvoiceAmount), startX + 154, curY);

  curY += 4.5;
  if (isInterState) {
    doc.setFont('helvetica', 'normal');
    doc.text('IGST Amt :', startX, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalIgst), startX + 28, curY);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('CGST Amt :', startX, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalCgst), startX + 28, curY);

    doc.setFont('helvetica', 'normal');
    doc.text('SGST Amt :', startX + 70, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(totalSgst), startX + 90, curY);
  }

  curY += 3;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 4: Transportation Details
  // ==========================================
  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('4. Transportation Details', startX, curY);

  curY += 2;
  doc.line(startX, curY, endX, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Transporter ID :', startX, curY);
  if (transporterId) {
    doc.setFont('helvetica', 'bold');
    doc.text(transporterId, startX + 24, curY);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Doc No. :', startX + 130, curY);

  curY += 4.5;
  doc.text('Name :', startX, curY);
  if (transporterName) {
    doc.setFont('helvetica', 'bold');
    doc.text(transporterName, startX + 24, curY);
    doc.setFont('helvetica', 'normal');
  }
  doc.text('Date :', startX + 130, curY);

  curY += 3;
  doc.line(startX, curY, endX, curY);

  // ==========================================
  // Section 5: Vehicle Details
  // ==========================================
  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('5. Vehicle Details', startX, curY);

  curY += 2;
  doc.line(startX, curY, endX, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Vehicle No.', startX, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`:  ${vehicleNo}`, startX + 18, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('From', startX + 70, curY);
  doc.setFont('helvetica', 'bold');
  doc.text(`:  ${sellerState}`, startX + 82, curY);

  doc.setFont('helvetica', 'normal');
  doc.text('CEWB No.:', startX + 130, curY);

  curY += 3;
  doc.line(startX, curY, endX, curY);
}

// =========================================================================
// Main Export Function: Generate Full 5-Page Document Bundle PDF
// =========================================================================
export async function generateAllInvoiceDocumentsPDF(
  inv: any,
  activeTenant: string = 'MAXTRON'
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Check if e-Way Bill was generated for this invoice
  const isEwbGenerated = inv.ewb_status === 'GENERATED' || Boolean(inv.ewb_no && inv.ewb_status !== 'CANCELLED' && inv.ewb_status !== 'FAILED');

  // Prepare QR Data URLs
  const invoiceNo = inv.invoice_number || 'MA154/26-27';
  const ewbNo = inv.ewb_no || '';
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const buyerGstin = inv.customers?.gst_no || '32BDXPP5589C1ZZ';
  const netAmount = inv.net_amount || '148680.00';
  const irn = inv.einvoice_irn || '';

  const einvoiceQrData = JSON.stringify({
    SellerGstin: gstin,
    BuyerGstin: buyerGstin,
    DocNo: invoiceNo,
    DocTyp: 'INV',
    DocDt: formatInvoiceDate(inv.invoice_date),
    TotInvVal: Number(netAmount),
    ItemCnt: inv.items?.length || 1,
    MainHsnCode: inv.items?.[0]?.finished_products?.hsn_code || '39232100',
    Irn: irn
  });

  const [einvoiceQrUrl, logoDataUrl] = await Promise.all([
    generateQRCodeDataUrl(einvoiceQrData),
    getMaxtronLogoDataUrl()
  ]);

  // Page 1: Tax Invoice (ORIGINAL FOR RECIPIENT)
  await renderTaxInvoicePage(doc, inv, activeTenant, '(ORIGINAL FOR RECIPIENT)', einvoiceQrUrl, logoDataUrl);

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
    doc.addPage();
    await renderEWayBillPage(doc, inv, activeTenant, ewbQrUrl);
  }

  // Tax Invoice Copies
  doc.addPage();
  await renderTaxInvoicePage(doc, inv, activeTenant, '(DUPLICATE FOR TRANSPORTER)', einvoiceQrUrl, logoDataUrl);

  doc.addPage();
  await renderTaxInvoicePage(doc, inv, activeTenant, '(TRIPLICATE FOR SUPPLIER)', einvoiceQrUrl, logoDataUrl);

  doc.addPage();
  await renderTaxInvoicePage(doc, inv, activeTenant, '(EXTRA COPY)', einvoiceQrUrl, logoDataUrl);

  return doc;
}

// Download Trigger Helper
export async function downloadAllInvoiceDocs(
  inv: any,
  activeTenant: string = 'MAXTRON',
  onSuccess?: () => void,
  onError?: (err: any) => void
) {
  try {
    const doc = await generateAllInvoiceDocumentsPDF(inv, activeTenant);
    const invoiceNumber = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${invoiceNumber}_All_Documents.pdf`;
    doc.save(filename);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error('Error generating all invoice documents PDF:', err);
    if (onError) onError(err);
  }
}

// Download Single Document (e.g. only Tax Invoice or only e-Way Bill)
export async function downloadSingleTaxInvoice(
  inv: any,
  activeTenant: string = 'MAXTRON',
  copyType: string = '(ORIGINAL FOR RECIPIENT)'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const qrData = JSON.stringify({
    SellerGstin: gstin,
    BuyerGstin: inv.customers?.gst_no || '32BDXPP5589C1ZZ',
    DocNo: inv.invoice_number || 'MA154/26-27',
    DocTyp: 'INV',
    TotInvVal: Number(inv.net_amount || 0),
    Irn: inv.einvoice_irn || 'adc49db2ff35768faa247a838a7a23a6ed8fae3d99db8fb76736ee546d62b404'
  });
  const [qrUrl, logoDataUrl] = await Promise.all([
    generateQRCodeDataUrl(qrData),
    getMaxtronLogoDataUrl()
  ]);
  await renderTaxInvoicePage(doc, inv, activeTenant, copyType, qrUrl, logoDataUrl);
  const cleanInvNo = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanType = copyType.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanInvNo}_Tax_Invoice_${cleanType}.pdf`);
}

export async function downloadSingleEWayBill(
  inv: any,
  activeTenant: string = 'MAXTRON'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const gstin = activeTenant === 'KEIL' ? '32AAACK1234F1Z5' : '32AUYPV8850B1Z2';
  const qrData = JSON.stringify({
    ewbNo: inv.ewb_no || '592050677018',
    docNo: inv.invoice_number || 'MA154/26-27',
    fromGstin: gstin,
    toGstin: inv.customers?.gst_no || '32BDXPP5589C1ZZ',
    totVal: Number(inv.net_amount || 0)
  });
  const qrUrl = await generateQRCodeDataUrl(qrData);
  await renderEWayBillPage(doc, inv, activeTenant, qrUrl);
  const cleanInvNo = (inv.invoice_number || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanInvNo}_eWayBill.pdf`);
}
