import { Router, Request, Response } from 'express';
import { LedgerService } from '../services/LedgerService';
import { PdfService } from '../services/PdfService';

const router = Router();

// GET /api/ledger
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    // FIX: Changed from getGeneralLedger() to getLedger()
    const ledgerData = await LedgerService.getLedger(from as string, to as string);
    
    res.json(ledgerData);
  } catch (error) {
    console.error("Ledger Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch ledger data" });
  }
});

// GET /api/ledger/pdf
router.get('/pdf', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    // FIX: Changed from getGeneralLedger() to getLedger()
    const transactions = await LedgerService.getLedger(from as string, to as string);

    const filterLabel = (from && to) 
      ? `${from} to ${to}` 
      : "All Time";

    const pdfBuffer = await PdfService.generateLedgerPdf(transactions, filterLabel);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="ledger.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Ledger PDF Error:", error);
    res.status(500).json({ error: "Failed to generate ledger PDF" });
  }
});

export default router;