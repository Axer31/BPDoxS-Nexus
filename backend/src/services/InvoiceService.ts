// backend/src/services/InvoiceService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateInvoiceDTO {
  clientId: number;
  issueDate: string; // ISO Date string
  dueDate?: string;
  items: any[];
  taxSummary: any;
  subtotal: number;
  grandTotal: number;
}

export class InvoiceService {
  
  // Helper: Get Fiscal Year string (e.g., "24-25")
  private static getFiscalYear(date: Date): string {
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();
    const shortYear = year % 100;

    // In India, FY starts April 1st
    if (month >= 4) {
      return `${shortYear}-${shortYear + 1}`;
    } else {
      return `${shortYear - 1}-${shortYear}`;
    }
  }

  // Core: Generate Number & Save Invoice
  static async createInvoice(data: CreateInvoiceDTO) {
    
    return await prisma.$transaction(async (tx) => {
      // 1. Determine Fiscal Year
      const dateObj = new Date(data.issueDate);
      const fy = this.getFiscalYear(dateObj);

      // 2. Get Next Sequence Number
      // We look for a sequence for "24-25". If not found, create one starting at 0.
      let sequence = await tx.invoicesequence.findUnique({
        where: { fiscal_year: fy }
      });

      if (!sequence) {
        sequence = await tx.invoicesequence.create({
          data: { fiscal_year: fy, last_count: 0 }
        });
      }

      const nextCount = sequence.last_count + 1;
      
      // 3. Format the Invoice Number (e.g., "DDP/24-25/001")
      // Pad with zeros to 3 digits
      const paddedCount = nextCount.toString().padStart(3, '0'); 
      const invoiceNumber = `DDP/${fy}/${paddedCount}`;

      // 4. Update the Sequence
      await tx.invoicesequence.update({
        where: { id: sequence.id },
        data: { last_count: nextCount }
      });

      // 5. Create the Invoice Record
      const newInvoice = await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          client_id: data.clientId,
          issue_date: dateObj,
          due_date: data.dueDate ? new Date(data.dueDate) : null,
          status: 'DRAFT',
          line_items: data.items,       // Prisma automatically handles JSON
          tax_summary: data.taxSummary, // Prisma automatically handles JSON
          subtotal: data.subtotal,
          grand_total: data.grandTotal
        }
      });

      return newInvoice;
    });
  }
}