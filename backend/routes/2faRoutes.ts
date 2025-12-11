import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// POST: Generate Secret
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'InvoiceCore', secret);
    const imageUrl = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_secret: secret }
    });

    res.json({ secret, qrCode: imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate 2FA" });
  }
});

// POST: Enable
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.two_factor_secret) return res.status(400).json({ error: "Setup not initiated" });

    const isValid = authenticator.check(token, user.two_factor_secret);
    if (!isValid) return res.status(400).json({ error: "Invalid Code" });

    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true }
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(userId, "ENABLE_2FA", "Enabled Two-Factor Authentication", "SECURITY", "2FA", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

// POST: Disable
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    await prisma.user.update({
      where: { id: authReq.user.id },
      data: { two_factor_enabled: false, two_factor_secret: null }
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "DISABLE_2FA", "Disabled Two-Factor Authentication", "SECURITY", "2FA", ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

export default router;