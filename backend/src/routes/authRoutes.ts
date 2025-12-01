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
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // 2. Check Password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 3. Security: Check 2FA
    if (user.two_factor_enabled) {
        // If client didn't send a token yet, tell them it's required
        // The frontend should see this flag and prompt for the code
        if (!totpToken) {
            return res.json({ require2fa: true }); 
        }

        // Verify the token provided by the user
        const validTotp = authenticator.check(totpToken, user.two_factor_secret as string);
        if (!validTotp) {
            return res.status(400).json({ error: "Invalid 2FA Code" });
        }
    }

    // 4. Create Token (Only happens if password AND 2FA are valid)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' } // Token lasts 12 hours
    );

    res.json({ token, user: { email: user.email, role: user.role } });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST: Register First Admin (Run this once via Postman/Curl, then delete or protect)
router.post('/register-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // @ts-ignore
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: 'ADMIN'
      }
    });

    res.json({ message: "Admin created", userId: user.id });
  } catch (error) {
    res.status(500).json({ error: "Could not create user" });
  }
});

export default router;