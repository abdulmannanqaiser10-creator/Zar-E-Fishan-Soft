import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const memory = multer.memoryStorage();

export const uploadDisk = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image|video/.test(file.mimetype);
    cb(ok ? null : new Error('Only images and videos allowed'), ok);
  },
});

export const uploadMemory = multer({
  storage: memory,
  limits: { fileSize: 8 * 1024 * 1024 },
});

/** Convert uploaded file to data URL for serverless-friendly storage */
export const fileToDataUrl = (file) => {
  if (!file) return '';
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
};
