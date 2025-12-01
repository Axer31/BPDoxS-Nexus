// backend/src/routes/2faRoutes.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// 1. Generate Secret & QR Code (User must be logged in)
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest; // Cast to access user from middleware
    const userId = authReq.user.id;

    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate a temporary secret
    const secret = authenticator.generateSecret();
    
    // Create the otpauth URL (Standard format for Google Authenticator/Authy)
    const otpauth = authenticator.keyuri(user.email, 'InvoiceCore', secret);
    
    // Generate QR Code Image Data URL
    const imageUrl = await QRCode.toDataURL(otpauth);

    // Save the secret to DB (But don't enable 2FA yet!)
    // @ts-ignore
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_secret: secret }
    });

    res.json({ 
      secret, 
      qrCode: imageUrl,
      message: "Scan this QR code with your Authenticator App" 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Generation failed" });
  }
});

// 2. Verify & Enable 2FA
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const { token } = req.body; // The 6-digit code
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.two_factor_secret) {
        return res.status(400).json({ error: "2FA setup not started" });
    }

    // Verify the token against the stored secret
    const isValid = authenticator.check(token, user.two_factor_secret);

    if (!isValid) {
        return res.status(400).json({ error: "Invalid Token. Please try again." });
    }

    // If valid, officially enable 2FA
    // @ts-ignore
    await prisma.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true }
    });

    res.json({ success: true, message: "2FA Enabled Successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;