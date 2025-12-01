import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure directory exists
const uploadDir = path.join(__dirname, '../../../frontend/public/uploads');
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
    
    // Return the path relative to the frontend 'public' folder
    // e.g., "/uploads/logo-12345.png"
    const publicPath = `/uploads/${req.file.filename}`;
    res.json({ filePath: publicPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;