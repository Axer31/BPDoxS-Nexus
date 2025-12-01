// backend/src/routes/expenseRoutes.ts
import { Router } from 'express';
import { ExpenseService } from '../services/ExpenseService';

const router = Router();

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await ExpenseService.getAllExpenses();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { category, amount, date } = req.body;
    if (!category || !amount || !date) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    
    const expense = await ExpenseService.createExpense(req.body);
    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await ExpenseService.deleteExpense(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;