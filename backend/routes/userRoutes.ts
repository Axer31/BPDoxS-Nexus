// backend/routes/userRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

// GET: List all users (excluding passwords)
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, two_factor_enabled: true, created_at: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST: Create new user
router.post('/', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password) return res.status(400).json({ error: "Email and Password required" });

    // Check existing
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: role || 'USER'
      }
    });

    res.status(201).json({ id: newUser.id, email: newUser.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// DELETE: Remove user
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Prevent deleting the last admin or yourself (optional safety logic can be added here)
    
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;