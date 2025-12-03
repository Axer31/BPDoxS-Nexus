import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

const router = Router();
const prisma = new PrismaClient();

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

// POST: Initial Admin Setup
// Run this ONCE via Postman/cURL to create the first user
router.post('/register-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
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