import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/income - Create new income record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, category, amount, description } = req.body;

    const newIncome = await prisma.otherIncome.create({
      data: {
        date: new Date(date),
        category,
        amount: parseFloat(amount),
        description
      }
    });

    res.json(newIncome);
  } catch (error) {
    console.error("Error creating income:", error);
    res.status(500).json({ error: "Failed to record income" });
  }
});

// DELETE /api/income/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.otherIncome.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting income:", error);
    res.status(500).json({ error: "Failed to delete income record" });
  }
});

export default router;