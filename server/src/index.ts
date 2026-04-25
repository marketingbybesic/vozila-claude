import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { syncInventoryFromCsv } from './services/InventorySyncService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*' }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'vozila-server'
  });
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const handleCsvImport = async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const userId = (req.body.userId as string) || '00000000-0000-0000-0000-000000000000';
    const categoryId = (req.body.categoryId as string) || '';

    const result = await syncInventoryFromCsv(req.file.buffer, userId, categoryId);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('❌ Inventory sync error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

app.post('/api/inventory/sync', upload.single('csv'), handleCsvImport);
app.post('/api/import-csv', upload.single('csv'), handleCsvImport);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
