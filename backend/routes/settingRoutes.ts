import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

const router = Router();
const prisma = new PrismaClient();

// ==============================
// 1. COMPANY PROFILE
// ==============================

// GET: Fetch Company Profile
router.get('/company', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'COMPANY_PROFILE' }
    });
    res.json(setting?.json_value || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT: Update Company Profile (Critical for Tax Engine)
router.put('/company', async (req, res) => {
  try {
    const { 
      company_name, address, state_code, gstin, phone, email, 
      bank_details, logo, signature, stamp 
    } = req.body;

    await prisma.systemSetting.upsert({
      where: { key: 'COMPANY_PROFILE' },
      update: {
        value: company_name,
        json_value: {
          company_name, address, state_code: Number(state_code), gstin, phone, email,
          bank_details, logo, signature, stamp
        }
      },
      create: {
        key: 'COMPANY_PROFILE',
        value: company_name,
        is_locked: true,
        json_value: {
          company_name, address, state_code: Number(state_code), gstin, phone, email,
          bank_details, logo, signature, stamp
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ==============================
// 2. DOCUMENT SETTINGS (Formats)
// ==============================

router.get('/documents', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'DOCUMENT_SETTINGS' }
    });
    
    // Default Formats
    const defaults = {
      invoice_format: "INV/{FY}/{SEQ:3}",
      quotation_format: "QTN/{FY}/{SEQ:3}",
      invoice_label: "INVOICE",
      quotation_label: "QUOTATION"
    };

    res.json(setting?.json_value || defaults);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch document settings" });
  }
});

router.put('/documents', async (req, res) => {
  try {
    const { invoice_format, quotation_format, invoice_label, quotation_label } = req.body;

    await prisma.systemSetting.upsert({
      where: { key: 'DOCUMENT_SETTINGS' },
      update: {
        json_value: { invoice_format, quotation_format, invoice_label, quotation_label }
      },
      create: {
        key: 'DOCUMENT_SETTINGS',
        json_value: { invoice_format, quotation_format, invoice_label, quotation_label },
        is_locked: false
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ==============================
// 3. SEQUENCE MANAGEMENT
// ==============================

router.put('/sequence', async (req, res) => {
  try {
    const { type, next_number } = req.body; // type: 'INVOICE' | 'QUOTATION'
    
    if (!next_number || isNaN(Number(next_number))) {
        return res.status(400).json({ error: "Invalid number" });
    }

    // Determine current Fiscal Year
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const shortYear = year % 100;
    const fy = month >= 4 ? `${shortYear}-${shortYear + 1}` : `${shortYear - 1}-${shortYear}`;

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

    res.json({ success: true, message: `${type} sequence updated for FY ${fy}` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update sequence" });
  }
});

// ==============================
// 4. TEMPLATES (Sanitized HTML)
// ==============================

router.post('/template', async (req, res) => {
  try {
    const { html, type } = req.body; 
    const key = type === 'QUOTATION' ? 'QUOTATION_TEMPLATE' : 'INVOICE_TEMPLATE';

    const cleanHtml = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'style', 'h1', 'h2', 'h3', 'span', 'div', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'strong', 'b', 'i', 'u', 'br', 'p' ]),
      allowedAttributes: {
        '*': ['style', 'class', 'id', 'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing'],
        'img': ['src', 'alt']
      },
      allowedSchemes: ['http', 'https', 'data'], 
      allowVulnerableTags: true 
    });

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: cleanHtml },
      create: { key, value: cleanHtml, is_locked: false }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save template" });
  }
});

router.get('/template/:type', async (req, res) => {
  try {
    const key = req.params.type === 'QUOTATION' ? 'QUOTATION_TEMPLATE' : 'INVOICE_TEMPLATE';
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    res.json({ html: setting?.value || '' });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

export default router;