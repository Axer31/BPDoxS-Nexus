import { Router } from 'express';
import { BackupService } from '../services/BackupService';
import multer from 'multer';

const router = Router();
// Memory storage is used because we don't need to save the backup file permanently on disk before processing
const upload = multer({ storage: multer.memoryStorage() }); 

// GET: Download .iec Backup
router.get('/export', async (req, res) => {
  try {
    const data = await BackupService.exportData();
    const filename = `invoicecore-backup-${new Date().toISOString().split('T')[0]}.iec`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Backup export failed" });
  }
});

// POST: Restore from .iec file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
        return res.status(400).json({ error: "No backup file provided" });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    await BackupService.importData(fileContent);

    res.json({ success: true, message: "System restored successfully!" });
  } catch (error: any) {
    console.error("Restore Error:", error);
    res.status(500).json({ error: error.message || "Import failed" });
  }
});

export default router;