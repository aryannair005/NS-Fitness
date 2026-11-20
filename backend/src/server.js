import 'dotenv/config';
import app from '../app.js';
import { connectDatabase } from './config/db.js';

try {
  if ((process.env.JWT_SECRET || '').length < 32) {
    console.error('Set JWT_SECRET to at least 32 random characters in backend/.env');
    process.exit(1);
  }
  await connectDatabase(process.env.MONGODB_URI);
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log('NS FITNESS API listening on port', port));
} catch {
  console.error('Database startup failed. Check MONGODB_URI, database credentials, and network access.');
  process.exitCode = 1;
}
