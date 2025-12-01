// backend/src/routes/mailRoutes.ts
import { Router } from 'express';
import { MailService } from '../services/MailService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST: Save SMTP Settings
router.post('/config', async (req, res) => {
  try {
    const { host, port, user, password, fromEmail } = req.body;
    
    await prisma.systemSetting.upsert({
      where: { key: 'SMTP_CONFIG' },
      update: {
        json_value: { host, port, user, password, fromEmail }
      },
      create: {
        key: 'SMTP_CONFIG',
        json_value: { host, port, user, password, fromEmail },
        is_locked: true
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save SMTP config" });
  }
});

// GET: Fetch SMTP Config (Exclude Password)
router.get('/config', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    const config = setting?.json_value as any || {};
    // Don't send password back to UI
    res.json({ ...config, password: '' });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// POST: Send Test Email
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;
    await MailService.sendTestEmail(email);
    res.json({ success: true, message: "Test email sent!" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to send test email" });
  }
});

// POST: Send Invoice
router.post('/invoice/:id', async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const { email } = req.body; // Allow overriding the client email if needed
    
    if (!email) return res.status(400).json({ error: "Recipient email is required" });

    await MailService.sendInvoice(invoiceId, email);
    res.json({ success: true, message: "Invoice sent successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to send invoice" });
  }
});

export default router;