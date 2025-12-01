import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { generateInvoiceHTML } from './templates/InvoiceTemplate';

const prisma = new PrismaClient();

export class PdfService {
  
  static async generateInvoicePdf(invoiceId: number) {
    // 1. Fetch Data
    // @ts-ignore
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        // @ts-ignore
        client: true,
        // @ts-ignore 
        bank_account: true // <--- NEW: Fetch linked bank account
      }
    });

    if (!invoice) throw new Error("Invoice not found");

    // 2. Fetch Owner Profile for the Header (Fallback & Company Info)
    // @ts-ignore
    const ownerSettings = await prisma.systemSetting.findUnique({
      where: { key: 'COMPANY_PROFILE' }
    });

    // 3. Generate HTML
    const htmlContent = generateInvoiceHTML(invoice, ownerSettings);

    // 4. Launch System Chrome (Lightweight)
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 5. Print to PDF Buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
  }
}