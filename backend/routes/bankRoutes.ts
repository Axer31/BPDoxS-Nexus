import { Router } from 'express';
import { BankService } from '../services/BankService';

const router = Router();

// GET: List all banks
router.get('/', async (req, res) => {
  try {
    const accounts = await BankService.getAllAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

// POST: Create Bank
router.post('/', async (req, res) => {
  try {
    const account = await BankService.createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

// PATCH: Set Default
router.patch('/:id/default', async (req, res) => {
  try {
    await BankService.setAsDefault(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update default status" });
  }
});

// DELETE: Delete Bank
router.delete('/:id', async (req, res) => {
  try {
    await BankService.deleteAccount(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;