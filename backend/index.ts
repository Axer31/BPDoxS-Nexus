import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

// Route Imports
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
import userRoutes from './routes/userRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import profileRoutes from './routes/profileRoutes';
import notificationRoutes from './routes/notificationRoutes';
import activityRoutes from './routes/activityRoutes';
import { ActivityService } from './services/ActivityService';

import { authenticateToken } from './middleware/authMiddleware';

// 1. Initialize Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --- ARCHITECTURE FIX: TRUST PROXY ---
// Required because we run behind Apache/Nginx. 
// Ensures req.ip returns the real client IP, not 127.0.0.1
app.set('trust proxy', 1); 
// -------------------------------------

// 2. Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } 
})); 
app.use(cors());   
app.use(express.json()); 
app.use(morgan('dev'));  

// --- STATIC FILE SERVING ---
const rootPath = process.cwd().endsWith('backend') ? '..' : '.';
const uploadDir = path.join(process.cwd(), rootPath, 'frontend/public/uploads');
app.use('/uploads', express.static(uploadDir));

// 3. Public Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', system: 'InvoiceCore v1.0', mode: 'production-ready' });
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
app.use('/api/users', userRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);

// 5. Start Server
app.listen(PORT, () => {
  console.log(`[InvoiceCore] Server running on port ${PORT}`);

  if (process.env.DATABASE_URL) {
      ActivityService.pruneLogs(7);
      setInterval(() => {
        console.log("[Cron] Running daily log rotation...");
        ActivityService.pruneLogs(7);
      }, 86400000);
  } else {
      console.log("[InvoiceCore] System awaiting setup. Go to /setup to initialize.");
  }
});