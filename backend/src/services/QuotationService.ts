// backend/src/services/QuotationService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateQuotationDTO {
  clientId: number;
  issueDate: string; // ISO Date string
  expiryDate?: string;
  items: any[]; // The BOQ / Services Offered
  subtotal: number;
  grandTotal: number;
  remarks?: string;
  contractTerms?: string;
  currency?: string;
}

export class QuotationService {
  
  // Helper: Get Fiscal Year string (e.g., "24-25")
  private static getFiscalYear(date: Date): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const shortYear = year % 100;

    // In India, FY starts April 1st
    if (month >= 4) {
      return `${shortYear}-${shortYear + 1}`;
    } else {
      return `${shortYear - 1}-${shortYear}`;
    }
  }

  // Core: Generate Number & Save Quotation
  static async createQuotation(data: CreateQuotationDTO) {
    
    return await prisma.$transaction(async (tx) => {
      // 1. Determine Fiscal Year
      const dateObj = new Date(data.issueDate);
      const fy = this.getFiscalYear(dateObj);

      // 2. Get Next Sequence Number for QUOTATIONS
      // We check the "QuotationSequence" table, distinct from Invoices
      // @ts-ignore
      let sequence = await tx.quotationSequence.findUnique({
        where: { fiscal_year: fy }
      });

      if (!sequence) {
        // @ts-ignore
        sequence = await tx.quotationSequence.create({
          data: { fiscal_year: fy, last_count: 0 }
        });
      }

      const nextCount = sequence.last_count + 1;
      
      // 3. Format the Quotation Number (e.g., "QTN/24-25/001")
      const paddedCount = nextCount.toString().padStart(3, '0'); 
      const quotationNumber = `QTN/${fy}/${paddedCount}`;

      // 4. Update the Sequence
      // @ts-ignore
      await tx.quotationSequence.update({
        where: { id: sequence.id },
        data: { last_count: nextCount }
      });

      // 5. Create the Quotation Record
      // @ts-ignore
      const newQuotation = await tx.quotation.create({
        data: {
          quotation_number: quotationNumber,
          client_id: data.clientId,
          issue_date: dateObj,
          expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
          status: 'DRAFT',
          line_items: data.items,
          contract_terms: data.contractTerms,
          remarks: data.remarks,
          subtotal: data.subtotal,
          grand_total: data.grandTotal,
          currency: data.currency || 'INR'
        }
      });

      return newQuotation;
    });
  }
}