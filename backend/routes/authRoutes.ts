import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// --- HELPER: Dynamic Email Sender ---
// Fetches SMTP config from the DB settings table so users can configure it in the UI.
async function sendEmail(to: string, subject: string, text: string) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
  
  if (!setting?.json_value) {
    throw new Error("SMTP not configured. Please configure Email Settings in the dashboard.");
  }

  const config = setting.json_value as any;
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Number(config.port) === 465, // True for 465, false for other ports
    auth: { 
      user: config.user, 
      pass: config.password 
    }
  });

  await transporter.sendMail({ 
    from: config.fromEmail || config.user, // Fallback to user if fromEmail is missing
    to, 
    subject, 
    text 
  });
}

// ==============================
// 1. LOGIN & AUTHENTICATION
// ==============================

// POST: Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;

    // 1. Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // 2. Verify Password (Bcrypt)
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 3. Security: 2FA Enforcement
    if (user.two_factor_enabled) {
        // If client hasn't sent a token yet, inform them it's required
        if (!totpToken) {
            return res.json({ require2fa: true }); 
        }

        // Verify the provided TOTP token
        if (!user.two_factor_secret) {
             return res.status(500).json({ error: "2FA enabled but secret missing. Contact admin." });
        }

        const validTotp = authenticator.check(totpToken, user.two_factor_secret);
        if (!validTotp) {
            return res.status(400).json({ error: "Invalid 2FA Code" });
        }
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' } // 12-hour session
    );

    // Return token and user info (excluding secrets)
    res.json({ 
      token, 
      user: { 
        id: user.id,
        email: user.email, 
        role: user.role,
        two_factor_enabled: user.two_factor_enabled 
      } 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ==============================
// 2. PASSWORD RECOVERY
// ==============================

// POST: Forgot Password (Request Link)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Don't reveal if user exists or not, but return 404 for internal clarity if needed.
      // Standard practice is to always say "If email exists, link sent."
      return res.status(404).json({ error: "User not found" });
    }

    // Generate Secure Token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 Hour from now

    // Save Token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        reset_token: token, 
        reset_token_expiry: expiry 
      }
    });

    // Send Email
    // Note: Assuming frontend runs on port 3000. In prod, use an ENV variable for domain.
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    
    await sendEmail(
      email, 
      "Password Reset Request - InvoiceCore", 
      `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.`
    );

    res.json({ success: true, message: "Reset link sent to email." });

  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});

// POST: Reset Password (Verify Token & Update)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password required" });
    }
    
    // Find user with matching token AND expiry in the future
    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: { gt: new Date() } // gt = greater than now
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update User & Clear Token
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password_hash: hashedPassword,
        reset_token: null,       // Clear token so it can't be reused
        reset_token_expiry: null 
      }
    });

    res.json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ==============================
// 3. SETUP & UTILS
// ==============================

// POST: Initial Admin Setup
// Run this ONCE via Postman/cURL to create the first user if DB is empty
router.post('/register-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    // Check if any user exists to prevent abuse
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        return res.status(403).json({ error: "Admin already exists. Use the dashboard to add users." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: 'ADMIN'
      }
    });

    res.json({ message: "Admin created successfully", userId: user.id });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Could not create admin user" });
  }
});

export default router;