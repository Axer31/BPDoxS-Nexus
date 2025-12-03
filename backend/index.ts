import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

// Route Imports (Siblings now)
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import quotationRoutes from './routes/quotationRoutes';
import expenseRoutes from './routes/expenseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import settingRoutes from './routes/settingRoutes';
import bankRoutes from './routes/bankRoutes';
import mailRoutes from './routes/mailRoutes';
import uploadRoutes from './routes/uploadRoutes';
import utilRoutes from './routes/utilRoutes';
import twoFactorRoutes from './routes/2faRoutes';
import backupRoutes from './routes/backupRoutes';
import importRoutes from './routes/importRoutes';

import { authenticateToken } from './middleware/authMiddleware';

// 1. Initialize Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middlewares
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 
app.use(morgan('dev'));  

// 3. Public Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', system: 'InvoiceCore v1.0', mode: 'flat-structure' });
});

// 4. Protected Routes
app.use(authenticateToken); 

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/import', importRoutes);

// 5. Start Server
app.listen(PORT, () => {
  console.log(`[InvoiceCore] Server running on port ${PORT}`);
});