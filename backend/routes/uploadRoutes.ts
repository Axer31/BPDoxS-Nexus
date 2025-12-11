import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// --- FIXED PATH RESOLUTION ---
// Detect if we are running from the 'backend' folder or the 'project root'
// If current directory ends in 'backend', go up one level (..).
// Otherwise (running from root), stay here (.).
const rootPath = process.cwd().endsWith('backend') ? '..' : '.';

// Construct the absolute path to frontend/public/uploads
const uploadDir = path.join(process.cwd(), rootPath, 'frontend/public/uploads');
// -----------------------------

console.log(`[Uploads] Saving files to: ${uploadDir}`); // Helpful for debugging

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Clean filename: timestamp + original extension
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// POST: /api/upload
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    // Return path relative to frontend public folder
    const publicPath = `/uploads/${req.file.filename}`;
    res.json({ filePath: publicPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;