import { Router } from 'express';
import { InvoiceService } from '../services/InvoiceService';
import { PdfService } from '../services/PdfService';
import { TaxService } from '../services/TaxService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// POST: Calculate Tax
router.post('/calculate-tax', async (req, res) => {
  try {
    const { clientStateCode, clientCountry } = req.body;
    if (!clientStateCode && clientStateCode !== 0) {
        return res.status(400).json({ error: "Client State Code is required" });
    }
    const taxLogic = await TaxService.calculateTaxType(Number(clientStateCode), clientCountry);
    res.json(taxLogic);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate tax" });
  }
});

// GET: Generate PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const pdfData = await PdfService.generateInvoicePdf(invoiceId);
    
    // FIX: Convert Uint8Array to Node Buffer explicitly
    const pdfBuffer = Buffer.from(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length); // Good practice
    res.setHeader('Content-Disposition', `inline; filename=invoice-${invoiceId}.pdf`);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Route Error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// GET: List all
router.get('/', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { client: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET: Single Invoice
router.get('/:id', async (req, res) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: Number(req.params.id) },
        include: { client: true, bank_account: true }
      });
      if (!invoice) return res.status(404).json({ error: "Not found" });
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Fetch failed" });
    }
});

// POST: Create
router.post('/', async (req, res) => {
  try {
    const invoice = await InvoiceService.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create invoice" });
  }
});

// PUT: Update
router.put('/:id', async (req, res) => {
  try {
    const updated = await InvoiceService.updateInvoice(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Update failed" });
  }
});

// PATCH: Status
router.patch('/:id/status', async (req, res) => {
  try {
    const updated = await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;