import { Router } from 'express';
import { LedgerService } from '../services/LedgerService';
import { PdfService } from '../services/PdfService';
import { startOfDay, startOfMonth, startOfQuarter, startOfYear, subMonths, isAfter, isSameDay } from 'date-fns';

const router = Router();

// Helper: Filter Transactions
const filterData = (data: any[], filter: string) => {
  const now = new Date();
  return data.filter(t => {
    const d = new Date(t.date);
    switch (filter) {
      case 'daily': return isSameDay(d, now);
      case 'monthly': return isAfter(d, startOfMonth(now));
      case 'quarterly': return isAfter(d, startOfQuarter(now));
      case 'semi-annually': return isAfter(d, subMonths(now, 6));
      case 'yearly': return isAfter(d, startOfYear(now));
      default: return true; // 'all'
    }
  });
};

// GET: JSON Data
router.get('/', async (req, res) => {
  try {
    const data = await LedgerService.getGeneralLedger();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

// GET: PDF Export
router.get('/pdf', async (req, res) => {
  try {
    const { filter } = req.query;
    const filterType = (filter as string) || 'all';
    
    // 1. Get Data
    const allData = await LedgerService.getGeneralLedger();
    
    // 2. Filter Data
    const filteredData = filterData(allData, filterType);

    // 3. Generate PDF
    const labelMap: any = { daily: 'Today', monthly: 'This Month', quarterly: 'This Quarter', 'semi-annually': 'Last 6 Months', yearly: 'This Year', all: 'All Time' };
    const pdfBuffer = await PdfService.generateLedgerPdf(filteredData, labelMap[filterType]);

    // 4. Send
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ledger-${filterType}.pdf`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error("Ledger PDF Error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;