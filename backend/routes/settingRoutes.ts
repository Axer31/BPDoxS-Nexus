import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// ==============================
// 1. COMPANY PROFILE
// ==============================
router.get('/company', authorize(['SUDO_ADMIN', 'ADMIN']), async (req, res) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_PROFILE' } });
  res.json(setting?.json_value || {});
});

// ONLY SUDO CAN EDIT
router.put('/company', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { company_name, address, state_code, gstin, cin, phone, email, bank_details, logo, signature, stamp } = req.body;

    await prisma.systemSetting.upsert({
      where: { key: 'COMPANY_PROFILE' },
      update: {
        value: company_name,
        json_value: { company_name, address, state_code: Number(state_code), gstin, cin, phone, email, bank_details, logo, signature, stamp }
      },
      create: {
        key: 'COMPANY_PROFILE', value: company_name, is_locked: true,
        json_value: { company_name, address, state_code: Number(state_code), gstin, cin, phone, email, bank_details, logo, signature, stamp }
      }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_PROFILE", "Updated Company Profile", "SETTINGS", "COMPANY", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ==============================
// 2. DOCUMENT SETTINGS
// ==============================
router.get('/documents', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'DOCUMENT_SETTINGS' } });
  res.json(setting?.json_value || { invoice_format: "INV/{FY}/{SEQ:3}", quotation_format: "QTN/{FY}/{SEQ:3}", invoice_label: "INVOICE", quotation_label: "QUOTATION" });
});

// ONLY SUDO CAN EDIT
router.put('/documents', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { invoice_format, quotation_format, invoice_label, quotation_label } = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'DOCUMENT_SETTINGS' },
      update: { json_value: { invoice_format, quotation_format, invoice_label, quotation_label } },
      create: { key: 'DOCUMENT_SETTINGS', json_value: { invoice_format, quotation_format, invoice_label, quotation_label }, is_locked: false }
    });
    
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_DOC_SETTINGS", "Updated Document Formats", "SETTINGS", "DOCS", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ONLY SUDO CAN EDIT SEQUENCE
router.put('/sequence', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { type, next_number } = req.body;
    if (!next_number || isNaN(Number(next_number))) return res.status(400).json({ error: "Invalid number" });

    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const shortYear = year % 100;
    // UPDATED: Removed hyphen to match new FY format
    const fy = month >= 4 ? `${shortYear}${shortYear + 1}` : `${shortYear - 1}${shortYear}`;
    const newLastCount = Number(next_number) - 1; 

    if (type === 'INVOICE') {
        await prisma.invoiceSequence.upsert({
            where: { fiscal_year: fy },
            update: { last_count: newLastCount },
            create: { fiscal_year: fy, last_count: newLastCount }
        });
    } else {
        await prisma.quotationSequence.upsert({
            where: { fiscal_year: fy },
            update: { last_count: newLastCount },
            create: { fiscal_year: fy, last_count: newLastCount }
        });
    }

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_SEQUENCE", `Updated ${type} sequence to ${next_number}`, "SETTINGS", "SEQ", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update sequence" });
  }
});

// ==============================
// 3. TEMPLATES
// ==============================
// ONLY SUDO CAN SAVE
router.post('/template', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { html, type } = req.body; 
    const key = type === 'QUOTATION' ? 'QUOTATION_TEMPLATE' : 'INVOICE_TEMPLATE';
    const cleanHtml = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'style', 'h1', 'h2', 'h3', 'span', 'div', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'strong', 'b', 'i', 'u', 'br', 'p' ]),
      allowedAttributes: { '*': ['style', 'class', 'id', 'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing'], 'img': ['src', 'alt'] },
      allowedSchemes: ['http', 'https', 'data'], allowVulnerableTags: true 
    });

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: cleanHtml },
      create: { key, value: cleanHtml, is_locked: false }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_TEMPLATE", `Updated ${type} Template`, "SETTINGS", "TEMPLATE", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save template" });
  }
});

router.get('/template/:type', authorize(['SUDO_ADMIN', 'ADMIN']), async (req, res) => {
  const key = req.params.type === 'QUOTATION' ? 'QUOTATION_TEMPLATE' : 'INVOICE_TEMPLATE';
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  res.json({ html: setting?.value || '' });
});

// ==============================
// 4. SOFTWARE NAME
// ==============================
router.get('/software-name', async (req, res) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SOFTWARE_NAME' } });
  // Default to 'InvoiceCore' if not set
  res.json({ software_name: setting?.value || 'InvoiceCore' });
});

// ONLY SUDO CAN EDIT
router.put('/software-name', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { software_name } = req.body;

    await prisma.systemSetting.upsert({
      where: { key: 'SOFTWARE_NAME' },
      update: { value: software_name },
      create: { key: 'SOFTWARE_NAME', value: software_name, is_locked: true } // Treat this as a core setting
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_APP_NAME", `Set software name to: ${software_name}`, "SETTINGS", "CORE", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update software name" });
  }
});

export default router;
