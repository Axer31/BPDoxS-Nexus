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
    
    // ---------------------------------------------------------
    // 1. PRIORITY CHECK: Export / International Client
    // ---------------------------------------------------------
    // This must run BEFORE checking Company Profile. 
    // If the client is not from India, it is a Zero-Rated Export (0% Tax).
    // This fixes the bug where missing owner settings forced IGST on foreigners.
    if (clientCountry && clientCountry.trim().toLowerCase() !== 'india') {
      return {
        taxType: 'NONE',
        gstRate: 0,
        breakdown: { cgst: 0, sgst: 0, igst: 0 }
      };
    }

    // ---------------------------------------------------------
    // 2. Fetch Owner Settings (Required only for Domestic Tax)
    // ---------------------------------------------------------
    const settings = await prisma.systemSetting.findUnique({
      where: { key: 'COMPANY_PROFILE' }
    });

    // Failsafe: If Company Profile is missing/incomplete, default to IGST 18%
    // This ensures we don't under-tax domestic clients if config is broken.
    if (!settings || !settings.json_value) {
      console.warn("TaxService: COMPANY_PROFILE missing. Defaulting to IGST 18%.");
      return {
        taxType: 'IGST',
        gstRate: 18.0,
        breakdown: { cgst: 0, sgst: 0, igst: 18.0 }
      };
    }

    const ownerProfile = settings.json_value as unknown as CompanyProfile;
    const ownerStateCode = Number(ownerProfile.state_code);

    // ---------------------------------------------------------
    // 3. Domestic Logic (India)
    // ---------------------------------------------------------
    
    // Case A: Same State = CGST + SGST (Intra-state)
    if (ownerStateCode === clientStateCode) {
      return {
        taxType: 'CGST_SGST',
        gstRate: 18.0,
        breakdown: { cgst: 9.0, sgst: 9.0, igst: 0 }
      };
    }

    // Case B: Different State = IGST (Inter-state)
    return {
      taxType: 'IGST',
      gstRate: 18.0,
      breakdown: { cgst: 0, sgst: 0, igst: 18.0 }
    };
  }
}
