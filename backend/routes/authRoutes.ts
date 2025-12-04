// backend/routes/authRoutes.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { ActivityService } from '../services/ActivityService';
import fs from 'fs'; 
import path from 'path'; 
import os from 'os'; 

const router = Router();
// Note: This global instance relies on .env being present on server start.
const prisma = new PrismaClient();

// --- HELPER: Dynamic Email Sender (Uses external SMTP config) ---
async function sendEmail(to: string, subject: string, text: string) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
  
  if (!setting?.json_value) {
    throw new Error("SMTP not configured. Please configure Email Settings in the dashboard.");
  }

  const config = setting.json_value as any;
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Number(config.port) === 465,
    auth: { 
      user: config.user, 
      pass: config.password 
    }
  });

  await transporter.sendMail({ 
    from: config.fromEmail || config.user,
    to, 
    subject, 
    text 
  });
}

/**
 * Helper: Detects OS and returns the likely path for the Chromium executable.
 * This adheres to the self-hosted architecture rule for PDF generation.
 */
const getPuppeteerPath = () => {
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'win32') {
    // Windows default path for Chrome
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  if (platform === 'linux' || arch === 'arm64') {
    // Standard path for headless chromium on Linux/ARM64 (Raspberry Pi)
    return '/usr/bin/chromium-browser'; 
  }
  if (platform === 'darwin') {
    // MacOS default path for Chrome
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; 
  }
  return '';
};


// ==============================
// 1. LOGIN & AUTHENTICATION
// ==============================

router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;

    // 1. Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // 2. Verify Password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 3. Security: 2FA Enforcement
    if (user.two_factor_enabled) {
        if (!totpToken) {
            return res.json({ require2fa: true }); 
        }
        if (!user.two_factor_secret) {
             return res.status(500).json({ error: "2FA enabled but secret missing." });
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
      { expiresIn: '12h' }
    );

    // 5. Log Activity
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(user.id, "LOGIN", "User logged in", "AUTH", undefined, ip as string);

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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 Hour

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expiry: expiry }
    });

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    await sendEmail(email, "Password Reset Request", `Click here to reset: ${resetLink}`);

    await ActivityService.log(user.id, "FORGOT_PASSWORD", "Requested password reset link");

    res.json({ success: true, message: "Reset link sent to email." });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Invalid request" });
    
    const user = await prisma.user.findFirst({
      where: { reset_token: token, reset_token_expiry: { gt: new Date() } }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashedPassword, reset_token: null, reset_token_expiry: null }
    });

    await ActivityService.log(user.id, "RESET_PASSWORD", "Password reset successfully");

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ==============================
// 3. SYSTEM INITIALIZATION & SETUP (NEW FIRST-TIME INSTALLER)
// ==============================

router.post('/setup', async (req: Request, res: Response) => {
  // 1. Initial Check: See if a user exists. If so, system is initialized.
  try {
    // This relies on the global prisma instance which might be configured from the previous run or a temporary check.
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        return res.status(403).json({ error: "System already initialized. Please login." });
    }
  } catch(e) {
    // Expected to fail if no .env or DB is running, which is fine for setup.
  }

  const { 
    dbHost, dbPort, dbUser, dbPassword, dbName,
    adminEmail, adminPassword 
  } = req.body;

  let tempPrisma: PrismaClient | null = null;
  // NOTE: We assume the .env file is in the current working directory of the backend process.
  const envPath = path.join(process.cwd(), '.env');

  try {
    // 2. Generate Secrets & Paths
    const newJwtSecret = crypto.randomBytes(32).toString('hex');
    const puppeteerPath = getPuppeteerPath();
    const dbUrl = `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

    // 3. Write .env File
    const envContent = `
PORT=5000
DATABASE_URL="${dbUrl}"
JWT_SECRET="${newJwtSecret}"
PUPPETEER_EXECUTABLE_PATH="${puppeteerPath}"
# --- END GENERATED CONFIG ---
`;
    fs.writeFileSync(envPath, envContent);

    // 4. Test Connection & Create Sudo Admin
    // Temporarily create a new client pointing to the user's DB configuration
    tempPrisma = new PrismaClient({
        datasources: { db: { url: dbUrl } }
    });
    
    await tempPrisma.$connect(); // Test connection with new credentials

    // Create Sudo Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const user = await tempPrisma.user.create({
        data: {
            email: adminEmail,
            password_hash: hashedPassword,
            role: 'SUDO_ADMIN' // Owner role
        }
    });

    // ADDED: Initialize the software name setting (Requirement for new feature)
    await tempPrisma.systemSetting.create({
        data: {
            key: 'SOFTWARE_NAME',
            value: 'InvoiceCore', // Default name
            is_locked: true
        }
    });

    // 5. Log Activity
    // Use the user.id from the newly created user for logging
    await ActivityService.log(user.id, "SYSTEM_INIT", "First-time system initialization and admin creation", "SYSTEM", "INIT", req.socket.remoteAddress as string);
    
    // 6. Success
    res.json({ 
        success: true, 
        message: "Initialization complete. Sudo Admin User created."
    });

  } catch (error: any) {
    console.error("System Setup Error:", error);
    // CRITICAL: Clean up partially created .env file on failure
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
    }
    res.status(500).json({ error: error.message || "Database setup failed. Check credentials and ensure MySQL is running." });
  } finally {
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
  }
});


export default router;