import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateInvoiceDTO {
  clientId: number;
  issueDate: string;
  dueDate?: string;
  items: any[];
  taxSummary: any;
  subtotal: number;
  grandTotal: number;
  isManual: boolean;
  manualNumber?: string;
  remarks?: string;
  bankAccountId?: number;
}

export class InvoiceService {
  
  // Helper: Get Fiscal Year string (e.g., "24-25")
  private static getFiscalYear(date: Date): string {
    const month = date.getMonth() + 1; // 0-indexed
    const year = date.getFullYear();
    const shortYear = year % 100;

    // Indian Fiscal Year starts April 1st
    if (month >= 4) {
      return `${shortYear}-${shortYear + 1}`;
    } else {
      return `${shortYear - 1}-${shortYear}`;
    }
  }

  // 1. CREATE INVOICE
  static async createInvoice(data: CreateInvoiceDTO) {
    return await prisma.$transaction(async (tx) => {
      const dateObj = new Date(data.issueDate);
      let invoiceNumber = data.manualNumber;

      // A. Auto-Generation Logic
      if (!data.isManual || !invoiceNumber) {
        // @ts-ignore
        const setting = await tx.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
        const format = (setting?.json_value as any)?.invoice_format || "INV/{FY}/{SEQ:3}";
        const fy = this.getFiscalYear(dateObj);

        // Find or Create Sequence for this FY
        // @ts-ignore
        let sequence = await tx.invoiceSequence.findUnique({ where: { fiscal_year: fy } });
        if (!sequence) {
          // @ts-ignore
          sequence = await tx.invoiceSequence.create({ data: { fiscal_year: fy, last_count: 0 } });
        }
        
        const nextCount = sequence.last_count + 1;
        // @ts-ignore
        await tx.invoiceSequence.update({ where: { id: sequence.id }, data: { last_count: nextCount } });

        // Generate Number String
        let numStr = format
            .replace('{FY}', fy)
            .replace('{YYYY}', dateObj.getFullYear().toString())
            .replace('{MM}', (dateObj.getMonth() + 1).toString().padStart(2, '0'))
            .replace('{DD}', dateObj.getDate().toString().padStart(2, '0'));

        const seqMatch = numStr.match(/{SEQ(?::(\d+))?}/);
        if (seqMatch) {
            const padding = seqMatch[1] ? parseInt(seqMatch[1]) : 3;
            numStr = numStr.replace(seqMatch[0], nextCount.toString().padStart(padding, '0'));
        } else {
            numStr = `${numStr}-${nextCount}`;
        }
        invoiceNumber = numStr;
      } else {
        // B. Manual Override Check
        // @ts-ignore
        const existing = await tx.invoice.findUnique({ where: { invoice_number: invoiceNumber } });
        if (existing) {
          throw new Error(`Invoice number ${invoiceNumber} already exists.`);
        }
      }

      // C. Create Record
      // @ts-ignore
      return await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber!,
          client_id: data.clientId,
          issue_date: dateObj,
          due_date: data.dueDate ? new Date(data.dueDate) : null,
          status: 'DRAFT',
          line_items: data.items,
          tax_summary: data.taxSummary,
          subtotal: data.subtotal,
          grand_total: data.grandTotal,
          is_manual_entry: data.isManual,
          remarks: data.remarks,
          bank_account_id: data.bankAccountId
        }
      });
    });
  }

  // 3. DELETE INVOICE
  static async deleteInvoice(id: number) {
    return await prisma.invoice.delete({
      where: { id }
    });
  }

  // 2. UPDATE INVOICE
  static async updateInvoice(id: number, data: any) {
    return await prisma.$transaction(async (tx) => {
        // Check if invoice exists
        // @ts-ignore
        const existing = await tx.invoice.findUnique({ where: { id } });
        if (!existing) throw new Error("Invoice not found");

        // Block edits if Paid (Accounting safety)
        if (existing.status === 'PAID') {
            throw new Error("Cannot edit a PAID invoice. Mark as DRAFT first.");
        }

        // Update Data
        // @ts-ignore
        return await tx.invoice.update({
            where: { id },
            data: {
                client_id: data.clientId,
                bank_account_id: data.bankAccountId,
                issue_date: new Date(data.issueDate),
                due_date: data.dueDate ? new Date(data.dueDate) : null,
                line_items: data.items,
                tax_summary: data.taxSummary,
                subtotal: data.subtotal,
                grand_total: data.grandTotal,
                remarks: data.remarks,
                // Note: We do NOT allow updating invoice_number to preserve audit trail
            }
        });
    });
  }
}