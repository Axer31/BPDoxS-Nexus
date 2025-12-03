import { Router } from 'express';
import { QuotationService } from '../services/QuotationService';
import { PdfService } from '../services/PdfService'; // <--- Uncomment this

const router = Router();

// GET PDF (NEW)
router.get('/:id/pdf', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pdfBuffer = await PdfService.generateQuotationPdf(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// GET: List all
router.get('/', async (req, res) => {
  try {
    const quotes = await QuotationService.getAllQuotations();
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

// GET: Single
router.get('/:id', async (req, res) => {
  try {
    const quote = await QuotationService.getQuotationById(Number(req.params.id));
    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// POST: Create
router.post('/', async (req, res) => {
  try {
    const quote = await QuotationService.createQuotation(req.body);
    res.status(201).json(quote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create quotation" });
  }
});

// PUT: Update
router.put('/:id', async (req, res) => {
  try {
    const updated = await QuotationService.updateQuotation(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update quotation" });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await QuotationService.deleteQuotation(Number(req.params.id));
    res.json({ success: true, message: "Quotation deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

export default router;