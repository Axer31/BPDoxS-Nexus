// backend/src/services/MailService.ts
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { PdfService } from './PdfService';

const prisma = new PrismaClient();

export class MailService {

  // 1. Get Transporter based on saved settings
  private static async getTransporter() {
    // @ts-ignore
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'SMTP_CONFIG' }
    });

    if (!setting || !setting.json_value) {
      throw new Error("SMTP Settings not configured.");
    }

    const config = setting.json_value as any;

    return nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: Number(config.port) === 465, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  // 2. Send Test Email
  static async sendTestEmail(toEmail: string) {
    const transporter = await this.getTransporter();
    // @ts-ignore
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    const fromEmail = (setting?.json_value as any)?.fromEmail || "noreply@invoicecore.com";

    await transporter.sendMail({
      from: `"InvoiceCore System" <${fromEmail}>`,
      to: toEmail,
      subject: "Test Email from InvoiceCore",
      text: "If you are reading this, your SMTP settings are correct!",
    });
  }

  // 3. Send Invoice PDF
  static async sendInvoice(invoiceId: number, toEmail: string) {
    // Generate PDF Buffer
    const pdfBuffer = await PdfService.generateInvoicePdf(invoiceId);
    
    // Fetch Invoice Details for Subject
    // @ts-ignore
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    const transporter = await this.getTransporter();
    // @ts-ignore
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    const fromEmail = (setting?.json_value as any)?.fromEmail || "noreply@invoicecore.com";

    await transporter.sendMail({
      from: `"Accounts Team" <${fromEmail}>`,
      to: toEmail,
      subject: `Invoice #${invoice.invoice_number} from Your Company`,
      text: `Dear Customer,\n\nPlease find attached Invoice #${invoice.invoice_number}.\n\nRegards,\nAccounts Team`,
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number.replace(/\//g, '-')}.pdf`,
          content: Buffer.from(pdfBuffer)
        }
      ]
    });
    
    // Update Status to SENT
    // @ts-ignore
    await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'SENT' }
    });
  }
}