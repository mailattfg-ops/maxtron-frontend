/**
 * Utility to generate professional Microsoft Word (.doc / .docx) documents for Quotations.
 * Compatible with Microsoft Word, LibreOffice Writer, Google Docs, and WPS Office.
 */

export interface QuotationItem {
    product_id?: string;
    product_name?: string;
    quantity?: number | string;
    unit?: string; // Pcs / Kg / Roll / Meter / Set / Box
    amount?: number | string; // Unit rate
    gst_percent?: number | string;
}

export function exportQuotationToWord(record: any, companyInfo?: any) {
    const customer = record.customers || {};
    const items: QuotationItem[] = Array.isArray(record.quotation_items) ? record.quotation_items : [];

    const companyName = companyInfo?.company_name || 'MAXTRON ENTERPRISE';
    const companyAddress = companyInfo?.addresses?.[0] ? 
        `${companyInfo.addresses[0].street || ''}, ${companyInfo.addresses[0].city || ''}, ${companyInfo.addresses[0].state || ''} - ${companyInfo.addresses[0].zip_code || ''}`
        : 'Industrial Development Area, Kerala, India';
    const companyGst = companyInfo?.gst_no || '32AUYPV8850B1Z2';
    const companyPhone = companyInfo?.phone || '+91 98765 43210';
    const companyEmail = companyInfo?.email || 'sales@maxtron.in';

    const customerName = record.customer_name || customer.customer_name || 'Valued Customer';
    const contactPerson = customer.contact_person || record.contact_person || 'Concerned Person';
    const customerMobile = customer.mobile_no || record.contact_mobile || 'N/A';
    const customerEmail = customer.email_id || 'N/A';
    const customerGst = customer.gst_no || 'N/A';
    const customerLocation = record.location || (customer.addresses?.[0] ? `${customer.addresses[0].city || ''}, ${customer.addresses[0].state || ''}` : 'Kerala');

    const quotationDate = record.visit_date ? new Date(record.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
    const quoteRefNo = `QT-${new Date(record.visit_date || Date.now()).getFullYear()}-${String(record.id || Math.floor(1000 + Math.random() * 9000)).substring(0, 6).toUpperCase()}`;
    const executiveName = record.users?.name || record.employee_name || 'Sales Executive';
    const deliveryDate = record.quotation_delivery_date ? new Date(record.quotation_delivery_date).toLocaleDateString('en-IN') : 'As agreed';

    let grandSubtotal = 0;
    let grandGst = 0;

    const tableRowsHtml = items.map((item, index) => {
        const qty = Number(item.quantity) || 0;
        const unit = item.unit || 'Kg';
        const rate = Number(item.amount) || 0;
        const gstP = Number(item.gst_percent) || 0;
        const taxable = qty * rate;
        const gstAmt = (taxable * gstP) / 100;
        const lineTotal = taxable + gstAmt;

        grandSubtotal += taxable;
        grandGst += gstAmt;

        return `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: #1e293b;">${item.product_name || `Product #${index + 1}`}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-family: monospace;">${qty}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; color: #0284c7;">${unit}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-family: monospace;">₹ ${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${gstP}%</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold; font-family: monospace; color: #0f172a;">₹ ${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
        `;
    }).join('');

    const grandTotal = grandSubtotal + grandGst;

    const htmlDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Quotation - ${quoteRefNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #334155; line-height: 1.5; margin: 0; padding: 20px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 3px solid #0284c7; }
            .company-name { font-size: 22pt; font-weight: 900; color: #0369a1; letter-spacing: 1px; }
            .subtitle { font-size: 10pt; color: #64748b; margin-top: 2px; }
            .title-banner { background-color: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 10px 15px; font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .details-table td { padding: 6px 10px; vertical-align: top; }
            .label { font-weight: bold; color: #475569; width: 140px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .items-table th { background-color: #0284c7; color: #ffffff; font-weight: bold; text-transform: uppercase; font-size: 9pt; padding: 10px 8px; border: 1px solid #0284c7; }
            .totals-table { width: 40%; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
            .totals-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
            .grand-total { background-color: #f0f9ff; font-weight: bold; font-size: 12pt; color: #0369a1; }
            .terms-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 30px; border-radius: 4px; }
            .terms-title { font-weight: bold; font-size: 10pt; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; }
            .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            .signature-table td { text-align: center; vertical-align: bottom; height: 80px; }
        </style>
    </head>
    <body>
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td>
                    <div class="company-name">${companyName}</div>
                    <div class="subtitle">${companyAddress} | Phone: ${companyPhone} | Email: ${companyEmail}</div>
                    <div class="subtitle" style="font-weight: bold; color: #0284c7; margin-top: 4px;">GSTIN: ${companyGst}</div>
                </td>
                <td style="text-align: right; vertical-align: bottom; padding-bottom: 10px;">
                    <div style="font-size: 14pt; font-weight: bold; color: #0f172a;">COMMERCIAL QUOTATION</div>
                    <div style="font-size: 10pt; color: #64748b;">Ref: ${quoteRefNo}</div>
                    <div style="font-size: 10pt; color: #64748b;">Date: ${quotationDate}</div>
                </td>
            </tr>
        </table>

        <!-- Quotation Banner -->
        <div class="title-banner">OFFICIAL PRICE QUOTATION</div>

        <!-- Details Section -->
        <table class="details-table">
            <tr>
                <td style="width: 50%;">
                    <div style="font-weight: bold; font-size: 11pt; color: #0284c7; margin-bottom: 5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">QUOTATION TO:</div>
                    <table>
                        <tr><td class="label">Customer Name:</td><td style="font-weight: bold; color: #0f172a;">${customerName}</td></tr>
                        <tr><td class="label">Contact Person:</td><td>${contactPerson}</td></tr>
                        <tr><td class="label">Location / City:</td><td>${customerLocation}</td></tr>
                        <tr><td class="label">Mobile / Phone:</td><td>${customerMobile}</td></tr>
                        <tr><td class="label">GSTIN:</td><td>${customerGst}</td></tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <div style="font-weight: bold; font-size: 11pt; color: #0284c7; margin-bottom: 5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">QUOTATION DETAILS:</div>
                    <table>
                        <tr><td class="label">Quotation No:</td><td style="font-weight: bold;">${quoteRefNo}</td></tr>
                        <tr><td class="label">Quotation Date:</td><td>${quotationDate}</td></tr>
                        <tr><td class="label">Expected Delivery:</td><td>${deliveryDate}</td></tr>
                        <tr><td class="label">Prepared By:</td><td>${executiveName}</td></tr>
                        <tr><td class="label">Status:</td><td style="font-weight: bold; color: #059669;">${record.quotation_status || 'Pending'}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Products Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">S.No</th>
                    <th style="width: 35%;">Item Description</th>
                    <th style="width: 12%;">Qty</th>
                    <th style="width: 12%;">Unit (Pcs/Kg)</th>
                    <th style="width: 13%;">Unit Rate (₹)</th>
                    <th style="width: 8%;">GST</th>
                    <th style="width: 15%;">Total Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 15px;">No products specified</td></tr>'}
            </tbody>
        </table>

        <!-- Totals Summary -->
        <table class="totals-table">
            <tr>
                <td style="font-weight: bold;">Subtotal (Taxable):</td>
                <td style="text-align: right; font-family: monospace;">₹ ${grandSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">GST Amount:</td>
                <td style="text-align: right; font-family: monospace;">₹ ${grandGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right; font-family: monospace;">₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
        </table>

        <!-- Terms & Conditions -->
        <div class="terms-box">
            <div class="terms-title">Standard Terms & Conditions:</div>
            <ol style="margin: 0; padding-left: 20px; font-size: 9.5pt; color: #475569;">
                <li><strong>Price Validity:</strong> This quotation is valid for 30 days from the date of issue.</li>
                <li><strong>Payment Terms:</strong> Advance payment / standard credit terms as mutually agreed.</li>
                <li><strong>Delivery Timeline:</strong> Scheduled delivery date: ${deliveryDate}. Subject to stock availability.</li>
                <li><strong>Taxes:</strong> GST is charged extra as per statutory government rates specified above.</li>
            </ol>
        </div>

        <!-- Signatures -->
        <table class="signature-table">
            <tr>
                <td style="width: 50%;">
                    <div style="border-top: 1px solid #94a3b8; width: 200px; margin: 0 auto; padding-top: 5px; font-size: 10pt; font-weight: bold; color: #475569;">
                        Customer Acceptance & Seal
                    </div>
                </td>
                <td style="width: 50%;">
                    <div style="border-top: 1px solid #0284c7; width: 200px; margin: 0 auto; padding-top: 5px; font-size: 10pt; font-weight: bold; color: #0369a1;">
                        For ${companyName}
                        <div style="font-size: 8pt; font-weight: normal; color: #64748b;">(Authorised Signatory)</div>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // Download document as .doc (Native Word format)
    const blob = new Blob(['\ufeff', htmlDocument], {
        type: 'application/msword'
    });

    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Quotation_${quoteRefNo}_${safeCustomerName}.doc`;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

/**
 * Downloads a clean Word Template file (.doc) for reference or offline editing.
 */
export function downloadQuotationTemplate() {
    const sampleRecord = {
        id: 'SAMPLE',
        visit_date: new Date().toISOString(),
        customer_name: 'Sample Client Enterprise Ltd',
        contact_person: 'John Doe (Purchase Manager)',
        location: 'Kochi, Kerala',
        quotation_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        quotation_status: 'Approved',
        users: { name: 'Marketing Officer' },
        customers: {
            customer_name: 'Sample Client Enterprise Ltd',
            contact_person: 'John Doe',
            mobile_no: '+91 98765 00000',
            email_id: 'purchase@sampleclient.com',
            gst_no: '32ABCDE1234F1Z5',
            addresses: [{ city: 'Kochi', state: 'Kerala' }]
        },
        quotation_items: [
            { product_name: 'Polybag High Density (50 Micron)', quantity: 500, unit: 'Kg', amount: 180, gst_percent: 18 },
            { product_name: 'Extruded Packaging Film Roll', quantity: 200, unit: 'Pcs', amount: 450, gst_percent: 18 }
        ]
    };
    exportQuotationToWord(sampleRecord);
}
