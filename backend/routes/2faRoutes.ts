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

    // Generate Secret
    const secret = authenticator.generateSecret();
    
    // Create otpauth URL for Authenticator Apps
    const otpauth = authenticator.keyuri(user.email, 'InvoiceCore', secret);
    
    // Generate QR Code Data URL
    const imageUrl = await QRCode.toDataURL(otpauth);

    // Save secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_secret: secret }
    });

    res.json({ 
      secret, 
      qrCode: imageUrl,
      message: "Scan this QR code. Then call /enable with the token to activate." 
    });

  } catch (error) {
    console.error("2FA Generate Error:", error);
    res.status(500).json({ error: "Failed to generate 2FA" });
  }
});

// POST: Verify Token & Enable 2FA
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.two_factor_secret) {
        return res.status(400).json({ error: "2FA setup not initiated" });
    }

    const isValid = authenticator.check(token, user.two_factor_secret);

    if (!isValid) {
        return res.status(400).json({ error: "Invalid Token. Try again." });
    }

    // Activate 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true }
    });

    res.json({ success: true, message: "2FA Enabled Successfully" });

  } catch (error) {
    console.error("2FA Enable Error:", error);
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

export default router;