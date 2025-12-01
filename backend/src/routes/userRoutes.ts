// backend/src/routes/userRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

// GET: List Users (exclude passwords)
router.get('/', async (req, res) => {
  try {
    // @ts-ignore
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        role: true, 
        two_factor_enabled: true, 
        created_at: true 
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST: Create New User
router.post('/', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and Password are required" });
    }

    // Check if user exists
    // @ts-ignore
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).json({ error: "User already exists" });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    // @ts-ignore
    const newUser = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: role || 'ADMIN'
      }
    });

    res.status(201).json({ message: "User created", id: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// DELETE: Remove User
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    // @ts-ignore
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;