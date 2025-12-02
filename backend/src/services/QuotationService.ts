import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateQuotationDTO {
  clientId: number;
  issueDate: string;
  expiryDate?: string;
  items: any[];
  subtotal: number;
  grandTotal: number;
  remarks?: string;
  contractTerms?: string; // Maps to "Contract Tenure"
  servicesOffered?: string; // Maps to "Services Offered"
  currency?: string;
  bankAccountId?: number;
}

export class QuotationService {
  
  static async getAllQuotations() {
    // @ts-ignore
    return await prisma.quotation.findMany({ include: { client: true }, orderBy: { created_at: 'desc' } });
  }

  private static getFiscalYear(date: Date): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const shortYear = year % 100;
    return month >= 4 ? `${shortYear}-${shortYear + 1}` : `${shortYear - 1}-${shortYear}`;
  }

  static async createQuotation(data: CreateQuotationDTO) {
    return await prisma.$transaction(async (tx) => {
      const dateObj = new Date(data.issueDate);
      
      // A. Fetch Settings
      // @ts-ignore
      const setting = await tx.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
      const format = (setting?.json_value as any)?.quotation_format || "QTN/{FY}/{SEQ:3}";

      // B. Sequence Logic
      const fy = this.getFiscalYear(dateObj);
      // @ts-ignore
      let sequence = await tx.quotationSequence.findUnique({ where: { fiscal_year: fy } });
      if (!sequence) {
        // @ts-ignore
        sequence = await tx.quotationSequence.create({ data: { fiscal_year: fy, last_count: 0 } });
      }
      const nextCount = sequence.last_count + 1;
      // @ts-ignore
      await tx.quotationSequence.update({ where: { id: sequence.id }, data: { last_count: nextCount } });

      // C. Parse Format
      let numStr = format
          .replace('{FY}', fy)
          .replace('{YYYY}', dateObj.getFullYear().toString())
          .replace('{MM}', (dateObj.getMonth() + 1).toString().padStart(2, '0'));

      const seqMatch = numStr.match(/{SEQ(?::(\d+))?}/);
      if (seqMatch) {
          const padding = seqMatch[1] ? parseInt(seqMatch[1]) : 3;
          numStr = numStr.replace(seqMatch[0], nextCount.toString().padStart(padding, '0'));
      } else {
          numStr = `${numStr}-${nextCount}`;
      }

      

      // @ts-ignore
      return await tx.quotation.create({
        data: {
          quotation_number: numStr,
          client_id: data.clientId,
          issue_date: dateObj,
          expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
          status: 'DRAFT',
          line_items: data.items,
          
          // MAPPED FIELDS
          contract_terms: data.contractTerms, // "Contract Tenure"
          services_offered: data.servicesOffered, // "Services Offered"
          remarks: data.remarks,
          
          subtotal: data.subtotal,
          grand_total: data.grandTotal,
          currency: data.currency || 'INR',
          bank_account_id: data.bankAccountId
        }
      });
    });
  }

  // NEW: Delete Quotation
  static async deleteQuotation(id: number) {
    // @ts-ignore
    return await prisma.quotation.delete({
      where: { id }
    });
  }
}