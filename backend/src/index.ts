import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes';
import clientRoutes from './routes/clientRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import settingRoutes from './routes/settingRoutes';
import authRoutes from './routes/authRoutes';
import { authenticateToken } from './middleware/authMiddleware';
import backupRoutes from './routes/backupRoutes';
import utilRoutes from './routes/utilRoutes';
import twoFactorRoutes from './routes/2faRoutes';
import bankRoutes from './routes/bankRoutes';
import userRoutes from './routes/userRoutes';
import expenseRoutes from './routes/expenseRoutes';
import quotationRoutes from './routes/quotationRoutes';
import mailRoutes from './routes/mailRoutes';
import uploadRoutes from './routes/uploadRoutes';
import importRoutes from './routes/importRoutes';

// 1. Initialize Configuration
dotenv.config();

// 2. Create the App
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 1. PUBLIC ROUTES (No Token Required)
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', system: 'InvoiceCore' });
});

// 2. MIDDLEWARE (Locks everything below this line)
app.use(authenticateToken);

// 3. PROTECTED ROUTES (Token Required)
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/import', importRoutes);

// 4. Start Server
app.listen(PORT, () => {
  console.log(`[InvoiceCore] Server running on port ${PORT}`);
  console.log(`[System] GST Logic Module: READY`); 
});