import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.CLIENT_URL || '')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      allowed.push(
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175'
      );
      if (
        !origin ||
        allowed.includes(origin) ||
        allowed.includes('*') ||
        /\.vercel\.app$/.test(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

let dbReady = null;
const ensureDB = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) return next();
    if (!process.env.MONGODB_URI) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured. Set MONGODB_URI in environment variables.',
      });
    }
    if (!dbReady) {
      dbReady = connectDB().catch((err) => {
        dbReady = null;
        throw err;
      });
    }
    await dbReady;
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  }
};

app.get('/api/health', async (req, res) => {
  let database = 'disconnected';
  try {
    if (process.env.MONGODB_URI) {
      if (mongoose.connection.readyState !== 1) {
        await connectDB();
      }
      database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    }
  } catch {
    database = 'disconnected';
  }
  res.json({
    success: true,
    message: 'Zar-E-Fishan API is running',
    timestamp: new Date().toISOString(),
    database,
  });
});

app.use('/api/auth', ensureDB, authRoutes);
app.use('/api/clients', ensureDB, clientRoutes);
app.use('/api/projects', ensureDB, projectRoutes);
app.use('/api/finance', ensureDB, financeRoutes);
app.use('/api/inventory', ensureDB, inventoryRoutes);
app.use('/api/vendors', ensureDB, vendorRoutes);
app.use('/api/procurement', ensureDB, procurementRoutes);
app.use('/api/dashboard', ensureDB, dashboardRoutes);
app.use('/api/reports', ensureDB, reportRoutes);
app.use('/api/settings', ensureDB, settingsRoutes);

app.use(errorHandler);

export default app;
