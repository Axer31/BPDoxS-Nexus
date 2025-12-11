import { Router, Request, Response } from 'express';
import { BankService } from '../services/BankService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();

// --- FIX: ADDED TRY/CATCH ---
router.get('/', async (req, res) => {
  try {
    const accounts = await BankService.getAllAccounts();
    res.json(accounts);
  } catch (e) {
    console.error("Failed to fetch banks:", e);
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});
// -----------------------------

router.post('/', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const account = await BankService.createAccount(req.body);
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "CREATE_BANK", `Created Bank: ${account.label}`, "BANK", account.id.toString(), ip as string);
    res.status(201).json(account);
  } catch (e) { res.status(500).json({ error: "Failed to create bank" }); }
});

router.put('/:id', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const account = await BankService.updateAccount(Number(req.params.id), req.body);
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "UPDATE_BANK", `Updated Bank: ${account.label}`, "BANK", req.params.id, ip as string);
    res.json(account);
  } catch (e) { res.status(500).json({ error: "Failed to update bank" }); }
});

router.patch('/:id/default', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    await BankService.setAsDefault(Number(req.params.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.delete('/:id', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    await BankService.deleteAccount(Number(req.params.id));
    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "DELETE_BANK", `Deleted Bank #${req.params.id}`, "BANK", req.params.id, ip as string);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

export default router;