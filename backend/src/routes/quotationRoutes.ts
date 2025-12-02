// backend/src/routes/quotationRoutes.ts
import { Router } from 'express';
import { QuotationService } from '../services/QuotationService';

const router = Router();

// GET: List all
router.get('/', async (req, res) => {
  try {
    const quotes = await QuotationService.getAllQuotations();
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quotations" });
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

router.delete('/:id', async (req, res) => {
  try {
    await QuotationService.deleteQuotation(Number(req.params.id));
    res.json({ success: true, message: "Quotation deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

export default router;