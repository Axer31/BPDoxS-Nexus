import { PrismaClient, Prisma } from '@prisma/client';
import { TaxService } from './TaxService';

const prisma = new PrismaClient();

// ---------------------------------------------------------
// 1. Strict Interfaces for Data Integrity
// ---------------------------------------------------------

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  hsn?: string;
  tax_rate?: number;
  amount: number;
}

interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
}

interface InvoiceTaxSummary {
  taxableAmount: number;
  taxAmount: number;
  breakdown: TaxBreakdown;
  currency: string;
}

interface CreateInvoiceDTO {
  clientId: number;
  issueDate: string; // ISO Date String
  dueDate?: string;  // ISO Date String
  items: InvoiceItem[];
  taxSummary: InvoiceTaxSummary;
  subtotal: number;
  grandTotal: number;
  isManual: boolean;
  manualNumber?: string;
  remarks?: string;
  bankAccountId?: number;
  currency?: string; 
}

interface UpdateInvoiceDTO {
  clientId: number;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  taxSummary: InvoiceTaxSummary;
  subtotal: number;
  grandTotal: number;
  remarks?: string;
  bankAccountId?: number;
  currency?: string;
}

// ---------------------------------------------------------
// 2. Service Logic
// ---------------------------------------------------------

export class InvoiceService {
  
  /**
   * Helper: Extracts pure IST components (Day, Month, Year)
   * Used for generating Invoice Strings (e.g. INV/24-25/001)
   */
  private static getISTComponents(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });

    const parts = formatter.formatToParts(date);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');

    // Calculate FY based on Indian Logic (April 1st Start)
    const shortYear = year % 100;
    let fyString = "";

    if (month < 4) {
      fyString = `${(shortYear - 1).toString().padStart(2, '0')}${shortYear.toString().padStart(2, '0')}`;
    } else {
      fyString = `${shortYear.toString().padStart(2, '0')}${(shortYear + 1).toString().padStart(2, '0')}`;
    }

    return {
      day: day.toString().padStart(2, '0'),
      month: month.toString().padStart(2, '0'),
      year: year.toString(),
      fy: fyString
    };
  }

  /**
   * CRITICAL FIX: Normalizes a Date object to "IST Midnight" stored as UTC.
   * * Problem: Input "2025-12-01" becomes "2025-11-30 18:30:00 UTC".
   * Solution: Extract "2025", "12", "01" using IST logic, then force create
   * "2025-12-01T00:00:00Z". This ensures DB stores the correct calendar date.
   */
  private static getISTDateForStorage(date: Date): Date {
    const ist = this.getISTComponents(date);
    // Force construct UTC Midnight for the intended IST Day
    return new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000Z`);
  }

  static async getSharedInvoices() {
    return await prisma.invoice.findMany({
      where: {
        status: { notIn: ['DRAFT', 'PAID', 'CANCELLED'] }
      },
      include: { 
        client: true,
        bank_account: true 
      },
      orderBy: { 
        issue_date: 'desc' 
      }
    });
  }

  static async calculateTax(clientStateCode: number, clientCountry: string) {
    return await TaxService.calculateTaxType(clientStateCode, clientCountry);
  }

  static async getAllInvoices() {
    return await prisma.invoice.findMany({
      include: { client: true, bank_account: true },
      orderBy: { created_at: 'desc' }
    });
  }

  static async getInvoiceById(id: number) {
    return await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, bank_account: true }
    });
  }

  // ---------------------------------------------------------
  // CREATE INVOICE (Transactional)
  // ---------------------------------------------------------
  static async createInvoice(data: CreateInvoiceDTO) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rawDate = new Date(data.issueDate);
      
      // 1. Fix the Storage Date (Force IST Calendar Day)
      const storageDate = this.getISTDateForStorage(rawDate);
      
      // 2. Get Components for Naming (using the fixed date is safer)
      const ist = this.getISTComponents(rawDate);
      
      let invoiceNumber = data.manualNumber;

      // A. AUTO-GENERATION LOGIC
      if (!data.isManual || !invoiceNumber) {
        // Fetch Settings
        const setting = await tx.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
        const settingsJson = setting?.json_value as Record<string, any> | null;
        
        // Default Format
        const format = settingsJson?.invoice_format || "INV/{FY}/{SEQ:3}";
        const fy = ist.fy;

        // Find or Create Sequence for this IST Fiscal Year
        let sequence = await tx.invoiceSequence.findUnique({ where: { fiscal_year: fy } });
        if (!sequence) {
          sequence = await tx.invoiceSequence.create({ data: { fiscal_year: fy, last_count: 0 } });
        }
        
        let nextCount = sequence.last_count;
        let isUnique = false;

        // Collision Detection Loop
        while (!isUnique) {
            nextCount++;

            // Replace Placeholders using IST values
            let numStr = format
                .replace('{FY}', ist.fy)
                .replace('{YYYY}', ist.year)
                .replace('{MM}', ist.month)
                .replace('{DD}', ist.day);

            // Handle Sequence Padding {SEQ:3} -> 001
            const seqMatch = numStr.match(/{SEQ(?::(\d+))?}/);
            if (seqMatch) {
                const padding = seqMatch[1] ? parseInt(seqMatch[1]) : 3;
                numStr = numStr.replace(seqMatch[0], nextCount.toString().padStart(padding, '0'));
            } else {
                numStr = `${numStr}-${nextCount}`;
            }

            const existing = await tx.invoice.findUnique({ where: { invoice_number: numStr } });
            
            if (!existing) {
                invoiceNumber = numStr;
                isUnique = true;
            }
        }
        
        // Update Sequence Header
        await tx.invoiceSequence.update({ 
            where: { id: sequence.id }, 
            data: { last_count: nextCount } 
        });

      } else {
        // B. MANUAL OVERRIDE CHECK
        if (!invoiceNumber) throw new Error("Manual entry requires an Invoice Number.");
        
        const existing = await tx.invoice.findUnique({ where: { invoice_number: invoiceNumber } });
        if (existing) {
          throw new Error(`Invoice number ${invoiceNumber} already exists.`);
        }
      }

      // Handle Due Date Correction
      let storageDueDate: Date | null = null;
      if (data.dueDate) {
          storageDueDate = this.getISTDateForStorage(new Date(data.dueDate));
      }

      // C. DATABASE INSERTION
      return await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber!,
          client_id: data.clientId,
          // Use the Normalized Date (00:00 UTC of the IST Day)
          issue_date: storageDate, 
          due_date: storageDueDate,
          status: 'DRAFT',
          // Strictly typed JSON casting
          line_items: data.items as unknown as Prisma.InputJsonValue,
          tax_summary: data.taxSummary as unknown as Prisma.InputJsonValue,
          subtotal: new Prisma.Decimal(data.subtotal),
          grand_total: new Prisma.Decimal(data.grandTotal),
          is_manual_entry: data.isManual,
          remarks: data.remarks,
          bank_account_id: data.bankAccountId,
          currency: data.currency || 'INR',
        }
      });
    });
  }

  // ---------------------------------------------------------
  // UPDATE INVOICE
  // ---------------------------------------------------------
  static async updateInvoice(id: number, data: UpdateInvoiceDTO) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const existing = await tx.invoice.findUnique({ where: { id } });
        if (!existing) throw new Error("Invoice not found");

        if (existing.status === 'PAID') {
            throw new Error("Cannot edit a PAID invoice. Mark as DRAFT first.");
        }

        // Apply Date Fixes for Update as well
        const storageDate = this.getISTDateForStorage(new Date(data.issueDate));
        
        let storageDueDate: Date | null = null;
        if (data.dueDate) {
            storageDueDate = this.getISTDateForStorage(new Date(data.dueDate));
        }

        return await tx.invoice.update({
            where: { id },
            data: {
                client_id: data.clientId,
                bank_account_id: data.bankAccountId,
                issue_date: storageDate, // Fixed
                due_date: storageDueDate, // Fixed
                line_items: data.items as unknown as Prisma.InputJsonValue,
                tax_summary: data.taxSummary as unknown as Prisma.InputJsonValue,
                subtotal: new Prisma.Decimal(data.subtotal),
                grand_total: new Prisma.Decimal(data.grandTotal),
                remarks: data.remarks,
                currency: data.currency,
            }
        });
    });
  }

  static async deleteInvoice(id: number) {
    return await prisma.invoice.delete({
      where: { id }
    });
  }
}