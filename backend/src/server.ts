import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'OSINT Backend Engine',
    timestamp: new Date().toISOString()
  });
});

// OSINT Search Routes
app.use('/api', searchRoutes);

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`OSINT Server active on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================`);
});
