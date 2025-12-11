// backend/services/QuotationService.ts

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
  // NEW FIELDS
  isManual?: boolean;
  manualNumber?: string;
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
      let quotationNumber = data.manualNumber;

      // --- LOGIC FOR AUTO-GENERATION VS MANUAL ---
      if (!data.isManual || !quotationNumber) {
          
          // A. Fetch Client for Country Code Logic
          const client = await tx.client.findUnique({ where: { id: data.clientId } });
          const country = client?.country || "India";

          const countryMap: Record<string, string> = {
              "India": "IN", "United States": "US", "USA": "US",
              "United Arab Emirates": "UAE", "Saudi Arabia": "SA",
              "United Kingdom": "UK", "Canada": "CA", "Australia": "AU", "Singapore": "SG"
          };

          let cc = countryMap[country];
          if (!cc) {
              cc = country.length <= 3 ? country.toUpperCase() : country.substring(0, 2).toUpperCase();
          }

          // B. Fetch Format Setting
          const setting = await tx.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
          const format = (setting?.json_value as any)?.quotation_format || "Q/{CC}{FY}/{SEQ:3}";

          // C. Calculate Fiscal Year (For formatting only)
          const month = dateObj.getMonth() + 1;
          const year = dateObj.getFullYear();
          const shortYear = year % 100;
          const fy = month >= 4 ? `${shortYear}${shortYear + 1}` : `${shortYear - 1}${shortYear}`;

          // D. Sequence Handling (MODIFIED: No Auto-Reset)
          // We use a FIXED key "GLOBAL_SEQ" instead of 'fy' to ensure the counter never resets automatically.
          const SEQUENCE_KEY = "GLOBAL_SEQ"; 
          
          let sequence = await tx.quotationSequence.findUnique({ where: { fiscal_year: SEQUENCE_KEY } });
          if (!sequence) {
            sequence = await tx.quotationSequence.create({ data: { fiscal_year: SEQUENCE_KEY, last_count: 0 } });
          }
          const nextCount = sequence.last_count + 1;
          await tx.quotationSequence.update({ where: { id: sequence.id }, data: { last_count: nextCount } });

          // E. Format String Generation
          let numStr = format
              .replace('{CC}', cc)
              .replace('{FY}', fy) // We still replace {FY} in the text if the user wants "Q/2425/1005"
              .replace('{YYYY}', dateObj.getFullYear().toString())
              .replace('{MM}', (dateObj.getMonth() + 1).toString().padStart(2, '0'));

          const seqMatch = numStr.match(/{SEQ(?::(\d+))?}/);
          if (seqMatch) {
              const padding = seqMatch[1] ? parseInt(seqMatch[1]) : 3;
              numStr = numStr.replace(seqMatch[0], nextCount.toString().padStart(padding, '0'));
          } else {
              numStr = `${numStr}-${nextCount}`;
          }
          quotationNumber = numStr;

      } else {
          // --- MANUAL OVERRIDE CHECK ---
          const existing = await tx.quotation.findUnique({ where: { quotation_number: quotationNumber } });
          if (existing) {
              throw new Error(`Quotation number ${quotationNumber} already exists.`);
          }
      }

      // Create Record
      return await tx.quotation.create({
        data: {
          quotation_number: quotationNumber!, // Safe assertion
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
          bank_account_id: data.bankAccountId,
          is_manual_entry: !!data.isManual // Save flag
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
        currency: data.currency,
        bank_account_id: data.bankAccountId
        // Note: We do not allow editing quotation_number or is_manual_entry after creation
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