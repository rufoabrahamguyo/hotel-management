import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads', 'guest-docs');

fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_ROOT),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || guessExt(file.mimetype);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

function guessExt(mime) {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  return '.jpg';
}

export const guestDocumentUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, WebP, or PDF files are allowed.'));
  },
});

export function unlinkGuestDocument(storedName) {
  if (!storedName) return;
  const full = path.join(UPLOADS_ROOT, path.basename(storedName));
  fs.promises.unlink(full).catch(() => {});
}
