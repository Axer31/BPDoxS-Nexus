import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { PdfService } from '../services/PdfService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// ==============================
// 1. CONFIGURATION (SMTP)
// Restricted to Admins
// ==============================
router.get('/config', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    res.json(setting?.json_value || { host: '', port: 587, user: '', password: '', fromEmail: '' });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch SMTP config" });
  }
});

router.post('/config', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const config = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'SMTP_CONFIG' },
      update: { json_value: config },
      create: { key: 'SMTP_CONFIG', json_value: config }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "UPDATE_SMTP", 
        "Updated SMTP Configuration", 
        "SETTINGS", 
        "SMTP", 
        ip as string
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save SMTP config" });
  }
});

// ==============================
// 2. TEMPLATES
// Restricted to Admins
// ==============================
router.get('/templates', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'EMAIL_TEMPLATES' } });
    res.json(setting?.json_value || { invoice: { subject: '', body: '' }, quotation: { subject: '', body: '' } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post('/templates', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const templates = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'EMAIL_TEMPLATES' },
      update: { json_value: templates },
      create: { key: 'EMAIL_TEMPLATES', json_value: templates }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "UPDATE_EMAIL_TMPL", 
        "Updated Email Templates", 
        "SETTINGS", 
        "EMAIL", 
        ip as string
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save templates" });
  }
});

// ==============================
// 3. SENDING LOGIC
// Available to All Users (who can view invoices)
// ==============================

// Send Invoice PDF
router.post('/invoice/:id', async (req: Request, res: Response) => {
  try {
    const invoiceId = Number(req.params.id);
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Recipient email required" });

    // 1. Fetch Invoice Data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // 2. Generate PDF Buffer
    const pdfBuffer = await PdfService.generateInvoicePdf(invoiceId);

    // 3. Get SMTP Settings
    const smtpSetting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    if (!smtpSetting?.json_value) return res.status(400).json({ error: "SMTP not configured" });
    const smtp = smtpSetting.json_value as any;

    // 4. Get Templates & Parse Variables
    const tmplSetting = await prisma.systemSetting.findUnique({ where: { key: 'EMAIL_TEMPLATES' } });
    const templates = tmplSetting?.json_value as any || {};
    const invTmpl = templates.invoice || { subject: "Invoice from InvoiceCore", body: "Please find attached." };

    const subject = (invTmpl.subject || "Invoice").replace('{{invoice_number}}', invoice.invoice_number);
    const text = (invTmpl.body || "")
      .replace('{{invoice_number}}', invoice.invoice_number)
      .replace('{{client_name}}', invoice.client.company_name)
      .replace('{{amount}}', invoice.grand_total.toString());

    // 5. Send Email
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.password }
    });

    await transporter.sendMail({
      from: smtp.fromEmail || smtp.user,
      to: email,
      subject: subject,
      text: text,
      attachments: [{
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        content: Buffer.from(pdfBuffer)
      }]
    });

    // 6. Log Activity
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "SEND_INVOICE", 
        `Sent Invoice #${invoice.invoice_number} to ${email}`, 
        "INVOICE", 
        invoiceId.toString(), 
        ip as string
    );

    res.json({ success: true });

  } catch (error: any) {
    console.error("Send Invoice Error:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// Test Connection
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    if (!setting?.json_value) return res.status(400).json({ error: "SMTP not configured" });

    const config = setting.json_value as any;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: Number(config.port) === 465,
      auth: { user: config.user, pass: config.password }
    });

    await transporter.sendMail({
      from: config.fromEmail,
      to: email,
      subject: "InvoiceCore Test Email",
      text: "SMTP connection is working successfully. You can now send invoices."
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "TEST_EMAIL", 
        `Sent test email to ${email}`, 
        "MAIL", 
        "TEST", 
        ip as string
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;