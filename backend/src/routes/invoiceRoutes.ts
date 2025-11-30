// backend/src/routes/invoiceRoutes.ts
import { Router } from 'express';
import { TaxService } from '../services/TaxService';
import { InvoiceService } from '../services/InvoiceService';
import { PdfService } from '../services/PdfService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Endpoint: POST /api/invoices/calculate-tax
router.post('/calculate-tax', async (req, res) => {
  try {
    const { clientStateCode, clientCountry } = req.body;

    if (!clientStateCode) {
      return res.status(400).json({ error: "Client State Code is required" });
    }

    const taxLogic = await TaxService.calculateTaxType(Number(clientStateCode), clientCountry);
    res.json(taxLogic);

  } catch (error) {
    console.error("Tax Calculation Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create New Invoice
router.post('/', async (req, res) => {
  try {
    const invoice = await InvoiceService.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    console.error("Create Invoice Failed:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// GET All Invoices
router.get('/', async (req, res) => {
  try {
    // @ts-ignore (ignoring lowercase model issue)
    const invoices = await prisma.invoice.findMany({
      include: {
        // We include client details to show the Company Name in the list
        // @ts-ignore
        client: true 
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(invoices);
  } catch (error) {
    console.error("Fetch Invoices Failed:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET Invoice PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const pdfBuffer = await PdfService.generateInvoicePdf(invoiceId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Generation Failed:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;