import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes';
import { requireAuth } from './middleware/requireAuth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Always allow localhost for local development.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
const allowedOrigins = [...new Set([...ALLOWED_ORIGINS, ...DEV_ORIGINS])];

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server requests (no origin header) and all allowed origins.
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-AppCheck'],
  credentials: true
}));

// Request size cap (a re-run sends the saved investigation, which can be large).
app.use(express.json({ limit: '5mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'OSINT Backend Engine',
    timestamp: new Date().toISOString()
  });
});

// OSINT Search Routes: signed-in users only (Firebase ID token verified on every request)
app.use('/api', requireAuth, searchRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`OSINT Server active on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================`);
});

export default app;
