import { Router, Request, Response } from 'express';
import { BackupService } from '../services/BackupService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() }); 

// GET: Export (Sudo Only)
router.get('/export', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const data = await BackupService.exportData();
    const filename = `invoicecore-backup-${new Date().toISOString().split('T')[0]}.iec`;

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "EXPORT_BACKUP", "Downloaded system backup", "SYSTEM", "BACKUP", ip as string);

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: "Backup export failed" });
  }
});

// POST: Import (Sudo Only)
router.post('/import', authorize(['SUDO_ADMIN']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const fileContent = req.file.buffer.toString('utf-8');
    await BackupService.importData(fileContent);

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "RESTORE_BACKUP", "Restored System Data", "SYSTEM", "BACKUP", ip as string);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;