import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { generateInvoiceHTML } from './templates/InvoiceTemplate';
import { generateQuotationHTML } from './templates/QuotationTemplate';

const prisma = new PrismaClient();

export class PdfService {
  
  static async generateInvoicePdf(invoiceId: number) {
    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
        throw new Error("Configuration Error: PUPPETEER_EXECUTABLE_PATH is missing in .env");
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, bank_account: true }
    });

    if (!invoice) throw new Error("Invoice not found");

    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    console.log(`[PdfService] Generating HTML for Invoice #${invoice.invoice_number}`);
    const htmlContent = generateInvoiceHTML(invoice, ownerSettings);

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

    console.log(`[PdfService] Generating HTML for Quotation #${quotation.quotation_number}`);
    const htmlContent = generateQuotationHTML(quotation, ownerSettings);
    
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
            '--disable-dev-shm-usage', // Critical for Docker/Low memory
            '--disable-gpu',
            '--font-render-hinting=none' // Improves text rendering
          ],
          headless: true
        });

        const page = await browser.newPage();
        
        // OPTIMIZATION: Set content and wait only for DOM, not Network Idle
        // This is much faster and less prone to timeouts with local assets
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