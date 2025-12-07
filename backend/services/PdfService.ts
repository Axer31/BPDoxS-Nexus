import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { generateInvoiceHTML } from './templates/InvoiceTemplate';
import { generateQuotationHTML } from './templates/QuotationTemplate';
import { generateLedgerHTML } from './templates/LedgerTemplate';

const prisma = new PrismaClient();

export class PdfService {
  
  static async generateInvoicePdf(invoiceId: number) {
    // 1. Validation
    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
        throw new Error("Configuration Error: PUPPETEER_EXECUTABLE_PATH is missing in .env");
    }

    // 2. Fetch Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, bank_account: true }
    });

    if (!invoice) throw new Error("Invoice not found");

    // 3. Fetch Company Profile
    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    // 4. PREPARE DATA
    // Create a mutable copy of the profile data
    let profileData: any = ownerSettings?.json_value 
        ? JSON.parse(JSON.stringify(ownerSettings.json_value)) 
        : {};

    // 5. RESOLVE STATE NAME
    // If we have a state code (e.g. 27), fetch the name (Maharashtra) from DB
    if (profileData.state_code) {
        try {
            const stateRecord = await prisma.state.findUnique({
                where: { code: Number(profileData.state_code) }
            });
            
            if (stateRecord) {
                // Overwrite the 'state' field with the real name
                profileData.state = stateRecord.name;
                
                // Optional: Ensure country is correct if missing
                if (!profileData.country) {
                    profileData.country = stateRecord.country;
                }
            }
        } catch (e) {
            console.warn("[PdfService] Failed to resolve state name:", e);
        }
    }

    console.log(`[PdfService] Generating HTML for Invoice #${invoice.invoice_number}`);
    
    // 6. WRAP DATA FOR TEMPLATE (THE FIX)
    // The template expects `arg.json_value`, so we wrap our modified data
    const templateArg = { json_value: profileData };

    const htmlContent = generateInvoiceHTML(invoice, templateArg);

    return await this.createPdf(htmlContent);
  }

  static async generateQuotationPdf(quotationId: number) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { client: true, bank_account: true }
    });

    if (!quotation) throw new Error("Quotation not found");

    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    // Prepare Profile Data (Same logic as Invoice)
    let profileData: any = ownerSettings?.json_value 
        ? JSON.parse(JSON.stringify(ownerSettings.json_value)) 
        : {};

    // Resolve State
    if (profileData.state_code) {
        try {
            const stateRecord = await prisma.state.findUnique({
                where: { code: Number(profileData.state_code) }
            });
            if (stateRecord) profileData.state = stateRecord.name;
        } catch (e) {}
    }

    console.log(`[PdfService] Generating HTML for Quotation #${quotation.quotation_number}`);
    
    // Wrap for template
    const templateArg = { json_value: profileData };
    
    const htmlContent = generateQuotationHTML(quotation, templateArg);
    
    return await this.createPdf(htmlContent);
  }

  static async generateLedgerPdf(transactions: any[], filterLabel: string) {
    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
        throw new Error("PUPPETEER_EXECUTABLE_PATH is missing");
    }

    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    // Ledger template logic might vary, but consistently passing the wrapped object is safest
    const templateArg = ownerSettings || { json_value: {} };

    console.log(`[PdfService] Generating Ledger PDF (${filterLabel})`);
    const htmlContent = generateLedgerHTML(transactions, filterLabel, templateArg);

    return await this.createPdf(htmlContent);
  }

  private static async createPdf(html: string) {
    let browser;
    try {
        browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, 
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none'
          ],
          headless: true
        });

        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'domcontentloaded' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        console.log("[PdfService] PDF Generated Successfully.");
        return pdfBuffer;

    } catch (error) {
        console.error("[PdfService] Generation Failed:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
  }
}