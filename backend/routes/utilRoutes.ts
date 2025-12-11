import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET: Fetch States (Dynamic Filter)
router.get('/states', async (req: Request, res: Response) => {
  try {
    const { country } = req.query;
    
    // Default to India if no country provided to keep payload small
    const filterCountry = country ? String(country) : 'India';

    const states = await prisma.state.findMany({
      where: { country: filterCountry },
      orderBy: { name: 'asc' }
    });
    
    res.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// GET: Fetch All Countries
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

export default router;
