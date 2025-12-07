import { Router, Request, Response } from 'express';
import { InvoiceService } from '../services/InvoiceService';
import { PdfService } from '../services/PdfService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==================================================================
// 1. SPECIFIC ROUTES (MUST COME FIRST)
// ==================================================================

// Fetch Shared Invoices
router.get('/shared', async (req, res) => {
  try {
    const invoices = await InvoiceService.getSharedInvoices();
    res.json(invoices);
  } catch (e) {
    console.error("Error fetching shared invoices:", e);
    res.status(500).json({ error: "Failed to fetch shared invoices" });
  }
});

// Tax Calculation
router.post('/calculate-tax', async (req, res) => {
  try {
    const { clientStateCode, clientCountry } = req.body;
    const taxResult = await InvoiceService.calculateTax(clientStateCode, clientCountry);
    res.json(taxResult);
  } catch (e) {
    res.status(500).json({ error: "Tax calculation failed" });
  }
});

// Get All Invoices
router.get('/', async (req, res) => {
  const invoices = await InvoiceService.getAllInvoices();
  res.json(invoices);
});

// Create Invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const invoice = await InvoiceService.createInvoice(req.body);
    const authReq = req as AuthRequest;
    if (authReq.user) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await ActivityService.log(authReq.user.id, "CREATE_INVOICE", `Created Invoice #${invoice.invoice_number}`, "INVOICE", invoice.id.toString(), ip as string);
    }
    res.status(201).json(invoice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// ==================================================================
// 2. GENERIC ID ROUTES (MUST COME LAST)
// ==================================================================

// Generate PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const pdfBuffer = await PdfService.generateInvoicePdf(Number(req.params.id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "PDF Generation Failed" });
  }
});


// UPDATE STATUS ROUTE
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, paymentDate } = req.body; // <--- EXTRACT PAYMENT DATE

    // Force uppercase (PAID, SENT, DRAFT)
    const normalizedStatus = status ? status.toUpperCase() : status;

    // LOGIC: Set payment_date if PAID. Use provided date or default to now.
    let finalPaymentDate = null;
    if (normalizedStatus === 'PAID') {
        finalPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    }

    const updated = await prisma.invoice.update({
        where: { id },
        data: { 
          status: normalizedStatus,
          payment_date: finalPaymentDate 
        }
    });

    // Log Activity
    const authReq = req as AuthRequest;
    if (authReq.user) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await ActivityService.log(authReq.user.id, "UPDATE_STATUS", `Invoice #${updated.invoice_number} marked as ${normalizedStatus}`, "INVOICE", updated.id.toString(), ip as string);
    }

    res.json(updated);
  } catch (e) {
    console.error("Status Update Failed:", e);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// MARK AS PAID (Payment Route)
router.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { amount_received, received_amount_inr, payment_date, notes } = req.body;

    // 1. Update Invoice
    const updated = await prisma.invoice.update({
        where: { id },
        data: { 
          status: 'PAID',
          payment_date: new Date(payment_date),
          received_amount: received_amount_inr ? Number(received_amount_inr) : null // Store the Manual INR value
        }
    });

    // 2. Log Activity
    const authReq = req as AuthRequest;
    if (authReq.user) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const msg = received_amount_inr 
            ? `Invoice #${updated.invoice_number} Paid. (INR ${received_amount_inr})`
            : `Invoice #${updated.invoice_number} Paid.`;
            
        await ActivityService.log(
            authReq.user.id, 
            "PAYMENT_RECEIVED", 
            msg, 
            "INVOICE", 
            updated.id.toString(), 
            ip as string
        );
    }

    res.json(updated);
  } catch (e) {
    console.error("Payment Record Failed:", e);
    res.status(500).json({ error: "Failed to record payment" });
  }
})

// Get Single Invoice
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const invoice = await InvoiceService.getInvoiceById(id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// Update Invoice Details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await InvoiceService.updateInvoice(Number(req.params.id), req.body);
    res.json(invoice);
  } catch (e) {
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Delete Invoice
router.delete('/:id', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    await InvoiceService.deleteInvoice(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

export default router;