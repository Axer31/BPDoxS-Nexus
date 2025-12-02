import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { generateInvoiceHTML } from './templates/InvoiceTemplate';
import { generateQuotationHTML } from './templates/QuotationTemplate';

const prisma = new PrismaClient();

export class PdfService {
  
  static async generateInvoicePdf(invoiceId: number) {
    // 1. Validate Env
    if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
        throw new Error("Configuration Error: PUPPETEER_EXECUTABLE_PATH is missing in .env");
    }

    // 2. Fetch Data
    // @ts-ignore
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, bank_account: true }
    });

    if (!invoice) throw new Error("Invoice not found");

    // @ts-ignore
    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    // 3. Generate HTML
    console.log(`[PdfService] Generating HTML for Invoice #${invoiceId}`);
    const htmlContent = generateInvoiceHTML(invoice, ownerSettings);

    if (!htmlContent) {
        throw new Error("Template Error: Generated HTML is empty or undefined.");
    }

    // 4. Generate PDF
    return await this.createPdf(htmlContent);
  }

  static async generateQuotationPdf(quotationId: number) {
    // @ts-ignore
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { client: true, bank_account: true }
    });

    if (!quotation) throw new Error("Quotation not found");

    // @ts-ignore
    const ownerSettings = await prisma.systemSetting.findUnique({ 
      where: { key: 'COMPANY_PROFILE' } 
    });

    const htmlContent = generateQuotationHTML(quotation, ownerSettings);
    return await this.createPdf(htmlContent);
  }

  private static async createPdf(html: string) {
    let browser;
    try {
        console.log("[PdfService] Launching Puppeteer...");
        
        browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, 
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical for Docker/Low memory envs like Pi
            '--disable-gpu'
          ],
          headless: true
        });

        const page = await browser.newPage();
        
        // Wait for network idle to ensure images load
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
        });

        console.log("[PdfService] PDF Buffer created successfully.");
        return pdfBuffer;

    } catch (error) {
        console.error("[PdfService] Generation Failed:", error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
  }
}