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
  contractTerms?: string;
  servicesOffered?: string;
  currency?: string;
  bankAccountId?: number;
}

export class QuotationService {
  
  // 1. GET ALL
  static async getAllQuotations() {
    return await prisma.quotation.findMany({ 
        include: { client: true }, 
        orderBy: { created_at: 'desc' } 
    });
  }

  // 2. GET SINGLE
  static async getQuotationById(id: number) {
    return await prisma.quotation.findUnique({
      where: { id },
      include: { client: true }
    });
  }

  // 3. CREATE
  static async createQuotation(data: CreateQuotationDTO) {
    return await prisma.$transaction(async (tx) => {
      const dateObj = new Date(data.issueDate);
      
      // Fetch Format Setting
      const setting = await tx.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
      const format = (setting?.json_value as any)?.quotation_format || "QTN/{FY}/{SEQ:3}";

      // Calculate Fiscal Year
      const month = dateObj.getMonth() + 1;
      const year = dateObj.getFullYear();
      const shortYear = year % 100;
      const fy = month >= 4 ? `${shortYear}-${shortYear + 1}` : `${shortYear - 1}-${shortYear}`;

      // Sequence Handling
      let sequence = await tx.quotationSequence.findUnique({ where: { fiscal_year: fy } });
      if (!sequence) {
        sequence = await tx.quotationSequence.create({ data: { fiscal_year: fy, last_count: 0 } });
      }
      const nextCount = sequence.last_count + 1;
      await tx.quotationSequence.update({ where: { id: sequence.id }, data: { last_count: nextCount } });

      // Format String Generation
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

      // Create Record
      return await tx.quotation.create({
        data: {
          quotation_number: numStr,
          client_id: data.clientId,
          issue_date: dateObj,
          expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
          status: 'DRAFT',
          line_items: data.items,
          contract_terms: data.contractTerms,
          services_offered: data.servicesOffered,
          remarks: data.remarks,
          subtotal: data.subtotal,
          grand_total: data.grandTotal,
          currency: data.currency || 'INR',
          bank_account_id: data.bankAccountId
        }
      });
    });
  }

  // 4. UPDATE
  static async updateQuotation(id: number, data: any) {
    return await prisma.quotation.update({
      where: { id },
      data: {
        client_id: data.clientId,
        issue_date: new Date(data.issueDate),
        expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
        line_items: data.items,
        contract_terms: data.contractTerms,
        services_offered: data.servicesOffered,
        remarks: data.remarks,
        subtotal: data.subtotal,
        grand_total: data.grandTotal,
        // Allow status update if needed, or handle separately
      }
    });
  }

  // 5. DELETE
  static async deleteQuotation(id: number) {
    return await prisma.quotation.delete({
      where: { id }
    });
  }
}