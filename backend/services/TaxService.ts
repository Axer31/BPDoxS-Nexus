import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface for type safety
interface CompanyProfile {
  company_name: string;
  address: string;
  state_code: number;
  gstin: string;
  phone: string;
}

interface TaxResult {
  taxType: 'IGST' | 'CGST_SGST' | 'NONE';
  gstRate: number;
  breakdown: {
    cgst: number;
    sgst: number;
    igst: number;
  };
}

export class TaxService {
  static async calculateTaxType(clientStateCode: number, clientCountry: string = 'India'): Promise<TaxResult> {
    
    // 1. Fetch Owner Settings to compare state
    const settings = await prisma.systemSetting.findUnique({
      where: { key: 'COMPANY_PROFILE' }
    });

    // Default to IGST if settings are missing (failsafe)
    if (!settings || !settings.json_value) {
      console.warn("COMPANY_PROFILE missing. Defaulting to IGST 18%.");
      return {
        taxType: 'IGST',
        gstRate: 18.0,
        breakdown: { cgst: 0, sgst: 0, igst: 18.0 }
      };
    }

    const ownerProfile = settings.json_value as unknown as CompanyProfile;
    const ownerStateCode = ownerProfile.state_code;

    // 2. Logic: Export (Foreign Client)
    // If country is NOT India, it is a Zero-Rated Export
    if (clientCountry && clientCountry.toLowerCase() !== 'india') {
      return {
        taxType: 'NONE',
        gstRate: 0,
        breakdown: { cgst: 0, sgst: 0, igst: 0 }
      };
    }

    // 3. Logic: Same State = CGST + SGST (Intra-state)
    if (ownerStateCode === clientStateCode) {
      return {
        taxType: 'CGST_SGST',
        gstRate: 18.0,
        breakdown: { cgst: 9.0, sgst: 9.0, igst: 0 }
      };
    }

    // 4. Logic: Different State = IGST (Inter-state)
    return {
      taxType: 'IGST',
      gstRate: 18.0,
      breakdown: { cgst: 0, sgst: 0, igst: 18.0 }
    };
  }
}