import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET: List Users (Admins can view)
router.get('/', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, two_factor_enabled: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST: Create User (SUDO ONLY)
router.post('/', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    
    if (role === 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Cannot assign Sudo Admin role directly." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const newUser = await prisma.user.create({ data: { email, password_hash: hash, role: role || 'USER' } });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await ActivityService.log(authReq.user.id, "CREATE_USER", `Created user: ${email} as ${role}`, "USER", newUser.id.toString(), ip as string);

    res.status(201).json({ id: newUser.id, email: newUser.email });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT: Update User Role (NEW - SUDO ONLY)
router.put('/:id/role', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const authReq = req as AuthRequest;
    
    // Safety check: Cannot assign Sudo Admin role unless you are Sudo Admin
    if (role === 'SUDO_ADMIN' && authReq.user.role !== 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Insufficient permissions to assign SUDO role." });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true }
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "UPDATE_ROLE", 
        `Updated user ${updatedUser.email} role to ${role}`, 
        "USER", 
        userId.toString(), 
        ip as string
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
});


// DELETE: Remove User (SUDO ONLY)
router.delete('/:id', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });

    if (target?.role === 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Cannot delete the Owner" });
    }
    
    await prisma.user.delete({ where: { id } });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "DELETE_USER", `Deleted user: ${target?.email}`, "USER", id.toString(), ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;