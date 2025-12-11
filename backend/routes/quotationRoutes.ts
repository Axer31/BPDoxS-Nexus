import { Router, Request, Response } from 'express';
import { QuotationService } from '../services/QuotationService';
import { PdfService } from '../services/PdfService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();

// --- NEW: MISSING ROUTE ADDED HERE ---
router.get('/:id', async (req, res) => {
  try {
    const quote = await QuotationService.getQuotationById(Number(req.params.id));
    if (!quote) return res.status(404).json({ error: "Quotation not found" });
    res.json(quote);
  } catch (e) { 
    console.error(e);
    res.status(500).json({ error: "Failed to fetch quotation" }); 
  }
});
// -------------------------------------

router.get('/:id/pdf', async (req, res) => {
  try {
    const pdf = await PdfService.generateQuotationPdf(Number(req.params.id));
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdf));
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.get('/', async (req, res) => {
  const quotes = await QuotationService.getAllQuotations();
  res.json(quotes);
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const quote = await QuotationService.createQuotation(req.body);
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "CREATE_QUOTE", `Quote #${quote.quotation_number}`, "QUOTATION", quote.id.toString(), ip as string);
    res.status(201).json(quote);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const quote = await QuotationService.updateQuotation(Number(req.params.id), req.body);
    // Log activity if needed
    res.json(quote);
  } catch (e) { res.status(500).json({ error: "Failed to update" }); }
});

router.delete('/:id', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    await QuotationService.deleteQuotation(Number(req.params.id));
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "DELETE_QUOTE", `Deleted Quote #${req.params.id}`, "QUOTATION", req.params.id, ip as string);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

export default router;