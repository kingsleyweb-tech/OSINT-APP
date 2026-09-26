import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes';
import { requireAuth } from './middleware/requireAuth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Firebase-AppCheck']
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
