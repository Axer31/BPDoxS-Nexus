import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// POST: Generate 2FA Secret & QR Code
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'InvoiceCore', secret);
    const imageUrl = await QRCode.toDataURL(otpauth);

    // Save secret temporarily (pending verification)
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_secret: secret }
    });

    res.json({ secret, qrCode: imageUrl });

  } catch (error) {
    console.error("2FA Generate Error:", error);
    res.status(500).json({ error: "Failed to generate 2FA" });
  }
});

// POST: Verify & Enable
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.two_factor_secret) return res.status(400).json({ error: "Setup not initiated" });

    const isValid = authenticator.check(token, user.two_factor_secret);
    if (!isValid) return res.status(400).json({ error: "Invalid 2FA Code" });

    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true }
    });

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

// POST: Disable 2FA (NEW)
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    await prisma.user.update({
      where: { id: authReq.user.id },
      data: { two_factor_enabled: false, two_factor_secret: null }
    });
    res.json({ success: true, message: "2FA Disabled" });
  } catch (error) {
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

export default router;