// backend/src/services/InvoiceService.ts
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
  // New Fields
  remarks?: string;
  bankAccountId?: number;
}

export class InvoiceService {
  
  private static getFiscalYear(date: Date): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const shortYear = year % 100;
    if (month >= 4) {
      return `${shortYear}-${shortYear + 1}`;
    } else {
      return `${shortYear - 1}-${shortYear}`;
    }
  }

  static async createInvoice(data: CreateInvoiceDTO) {
    return await prisma.$transaction(async (tx) => {
      const dateObj = new Date(data.issueDate);
      let invoiceNumber = data.manualNumber;

      // 1. Auto-Generation Logic
      if (!data.isManual || !invoiceNumber) {
        const fy = this.getFiscalYear(dateObj);
        // @ts-ignore
        let sequence = await tx.invoiceSequence.findUnique({ where: { fiscal_year: fy } });

        if (!sequence) {
          // @ts-ignore
          sequence = await tx.invoiceSequence.create({ data: { fiscal_year: fy, last_count: 0 } });
        }

        const nextCount = sequence.last_count + 1;
        invoiceNumber = `DDP/${fy}/${nextCount.toString().padStart(3, '0')}`;

        // @ts-ignore
        await tx.invoiceSequence.update({ where: { id: sequence.id }, data: { last_count: nextCount } });
      } else {
        // Manual Check
        // @ts-ignore
        const existing = await tx.invoice.findUnique({ where: { invoice_number: invoiceNumber } });
        if (existing) throw new Error(`Invoice number ${invoiceNumber} already exists.`);
      }

      // 2. Create Record
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
          remarks: data.remarks,           // <--- New
          bank_account_id: data.bankAccountId // <--- New
        }
      });
    });
  }
}