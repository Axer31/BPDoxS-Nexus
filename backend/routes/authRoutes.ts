import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit'; // IMPORT RATE LIMITER
import { ActivityService } from '../services/ActivityService';
import fs from 'fs'; 
import path from 'path'; 
import os from 'os'; 
import { exec } from 'child_process';

const router = Router();
const prisma = new PrismaClient();

// --- SECURITY: Login Rate Limiter ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    limit: 5, // Limit each IP to 5 requests per window
    message: { error: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true, // Optional: Don't count successful logins against the limit
});

// --- HELPER: Dynamic Email Sender ---
async function sendEmail(to: string, subject: string, text: string) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
  
  if (!setting?.json_value) {
    console.warn("SMTP not configured. Skipping email.");
    return;
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

const getPuppeteerPath = () => {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (platform === 'linux' || arch === 'arm64') return '/usr/bin/chromium-browser'; 
  if (platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; 
  return '';
};

// ==============================
// 0. STATUS CHECK
// ==============================
router.get('/status', async (req, res) => {
  const envPath = path.join(process.cwd(), '.env');
  
  // If no .env, definitely not installed
  if (!fs.existsSync(envPath)) {
      return res.json({ initialized: false });
  }

  try {
      // Check if DB is reachable and has users
      const checkClient = new PrismaClient();
      const count = await checkClient.user.count();
      await checkClient.$disconnect();
      res.json({ initialized: count > 0 });
  } catch (e) {
      // If connection fails, assume not installed
      res.json({ initialized: false });
  }
});

// ==============================
// 1. LOGIN & AUTHENTICATION
// ==============================

// Applied loginLimiter middleware here
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    if (user.two_factor_enabled) {
        if (!totpToken) return res.json({ require2fa: true }); 
        if (!user.two_factor_secret) return res.status(500).json({ error: "2FA enabled but secret missing." });
        
        const validTotp = authenticator.check(totpToken, user.two_factor_secret);
        if (!validTotp) return res.status(400).json({ error: "Invalid 2FA Code" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' }
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(user.id, "LOGIN", "User logged in", "AUTH", undefined, ip as string);

    res.json({ 
      token, 
      user: { id: user.id, email: user.email, role: user.role, two_factor_enabled: user.two_factor_enabled } 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed. System might need setup." });
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
    const expiry = new Date(Date.now() + 3600000); 

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expiry: expiry }
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;
    
    await sendEmail(email, "Password Reset Request", `Click here to reset: ${resetLink}`);
    await ActivityService.log(user.id, "FORGOT_PASSWORD", "Requested password reset link");

    res.json({ success: true, message: "Reset link sent to email." });
  } catch (error: any) {
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
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ==============================
// 3. SYSTEM INITIALIZATION & SETUP
// ==============================

router.post('/setup', async (req: Request, res: Response) => {
  const envPath = path.join(process.cwd(), '.env');

  // 1. Initial Check
  try {
    if (fs.existsSync(envPath)) {
        require('dotenv').config(); 
        if (process.env.DATABASE_URL) {
            const checkClient = new PrismaClient();
            const userCount = await checkClient.user.count().catch(() => 0);
            await checkClient.$disconnect();
            if (userCount > 0) return res.status(403).json({ error: "System already initialized. Please login." });
        }
    }
  } catch(e) { /* Ignore errors on fresh install */ }

  const { 
    dbHost, dbPort, dbUser, dbPassword, dbName,
    adminEmail, adminPassword 
  } = req.body;

  let tempPrisma: PrismaClient | null = null;

  try {
    // 2. URL Encode credentials
    const encodedUser = encodeURIComponent(dbUser);
    const encodedPass = encodeURIComponent(dbPassword);
    
    const newJwtSecret = crypto.randomBytes(32).toString('hex');
    const puppeteerPath = getPuppeteerPath();
    const dbUrl = `mysql://${encodedUser}:${encodedPass}@${dbHost}:${dbPort}/${dbName}`;

    // 3. Write .env File
    const envContent = `
PORT=5000
DATABASE_URL="${dbUrl}"
JWT_SECRET="${newJwtSecret}"
PUPPETEER_EXECUTABLE_PATH="${puppeteerPath}"
`;
    fs.writeFileSync(envPath, envContent.trim());

    // 4. Locate Schema
    const possiblePaths = [
        path.join(process.cwd(), 'prisma', 'schema.prisma'),
        path.join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
        path.join(process.cwd(), 'backend', 'prisma', 'schema.prisma'),
    ];
    const schemaPath = possiblePaths.find(p => fs.existsSync(p));

    if (!schemaPath) {
        throw new Error(`Schema not found. Searched: ${possiblePaths.join(', ')}`);
    }

    // 5. Run Database Schema Push
    console.log(`Running database setup using schema at: ${schemaPath}`);
    
    await new Promise<void>((resolve, reject) => {
        exec(`npx prisma@5.22.0 db push --accept-data-loss --schema="${schemaPath}"`, { 
            cwd: process.cwd(),
            env: { ...process.env, DATABASE_URL: dbUrl } 
        }, (error, stdout, stderr) => {
            if (error) {
                console.error(`DB Setup Failed: ${stderr}`);
                reject(new Error(`Database connection failed: ${stderr}`));
            } else {
                console.log(`DB Setup Success: ${stdout}`);
                resolve();
            }
        });
    });

    // 6. Connect & Create Admin User
    tempPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const user = await tempPrisma.user.create({
        data: {
            email: adminEmail,
            password_hash: hashedPassword,
            role: 'SUDO_ADMIN'
        }
    });

    // 7. Initialize Settings
    await tempPrisma.systemSetting.createMany({
        data: [
            { key: 'SOFTWARE_NAME', value: 'InvoiceCore', is_locked: true },
            { key: 'SMTP_CONFIG', json_value: {} }
        ]
    });
    
    // 8. Success Response
    res.json({ success: true, message: "Setup complete. Restarting system..." });

    // 9. Force Restart
    console.log("Setup successful. Exiting process to trigger PM2 restart.");
    setTimeout(() => { process.exit(0); }, 1000);

  } catch (error: any) {
    console.error("System Setup Error:", error);
    if (fs.existsSync(envPath)) { try { fs.unlinkSync(envPath); } catch(e) {} }
    res.status(500).json({ error: error.message || "Setup failed. Check database credentials." });
  } finally {
    if (tempPrisma) await tempPrisma.$disconnect();
  }
});

export default router;