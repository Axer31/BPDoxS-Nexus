import { Router } from 'express';
import multer from 'multer';
import { ImportService } from '../services/ImportService';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' }); // Temporary storage

// POST /api/import/clients
router.post('/clients', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // FIX: Cast result to 'any' to fix the spread syntax error
    const result = await ImportService.importClients(req.file.path) as any;
    
    res.json({ success: true, ...result });

  } catch (error: any) {
    console.error("Import Error:", error);
    res.status(500).json({ error: "Import failed: " + (error.message || "Unknown error") });
  }
});

export default router;