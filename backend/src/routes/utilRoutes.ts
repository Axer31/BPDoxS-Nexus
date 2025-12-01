import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get States (India)
router.get('/states', async (req, res) => {
  try {
    // @ts-ignore
    const states = await prisma.state.findMany({ orderBy: { code: 'asc' } });
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// Get Countries (Global)
router.get('/countries', async (req, res) => {
  try {
    // @ts-ignore
    const countries = await prisma.country.findMany({ orderBy: { name: 'asc' } });
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

export default router;