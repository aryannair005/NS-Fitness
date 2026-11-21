import express from 'express';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './src/routes/authRoutes.js';
import membershipRoutes from './src/routes/membershipRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import memberRoutes from './src/routes/memberRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use('/api/settings', express.json({limit:'750kb'}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
});

app.use('/api', authRoutes);
app.use('/api', paymentRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
if (process.env.NODE_ENV === 'production') {
  const dist = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile('index.html', { root: dist }));
}
app.use((error, req, res, next) => {
  if (error.code === 11000) {
    const keys = error.keyPattern ?? error.errorResponse?.keyPattern ?? {};
    const index = /\bindex: (\S+) dup key/.exec(error.message)?.[1];
    let message = 'A record with the same unique value already exists.';
    if (keys.mobile || index === 'mobile_1') message = 'That phone number is already in use.';
    else if (keys.email || index === 'email_1') message = 'An old email index is blocking phone-only accounts. Complete the phone migration before adding members.';
    else if (keys.entryKey || keys.transactionReference || keys.requestId || ['entryKey_1','requestId_1','method_1_transactionReference_1'].includes(index)) {
      message = 'This payment entry or transaction reference already exists.';
    }
    return res.status(409).json({ message });
  }
  if (error.name === 'ValidationError') return res.status(400).json({ message: 'Check the following fields: ' + Object.keys(error.errors).join(', ') });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid member ID.' });
  if (error.expose && error.status && !error.type) return res.status(error.status).json({ message: error.message });
  res.status(error.status || 500).json({ message: error.status === 400 ? 'Invalid request.' : 'Request could not be completed.' });
});

export default app;
