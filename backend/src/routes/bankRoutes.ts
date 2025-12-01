// backend/src/routes/bankRoutes.ts
import { Router } from 'express';
import { BankService } from '../services/BankService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const accounts = await BankService.getAllAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

router.post('/', async (req, res) => {
  try {
    const account = await BankService.createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

// --- NEW: PUT Endpoint for Updates ---
router.put('/:id', async (req, res) => {
  try {
    const updated = await BankService.updateAccount(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update bank account" });
  }
});

router.patch('/:id/default', async (req, res) => {
  try {
    await BankService.setAsDefault(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update default status" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await BankService.deleteAccount(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;