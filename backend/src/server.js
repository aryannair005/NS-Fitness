import 'dotenv/config';
import app from '../app.js';
import { connectDatabase } from './config/db.js';
import mongoose from 'mongoose';
import { ensurePhoneIndexes } from './config/phoneIndexes.js';

try {
  if ((process.env.JWT_SECRET || '').length < 32) {
    console.error('Set JWT_SECRET to at least 32 random characters in backend/.env');
    process.exit(1);
  }
  await connectDatabase(process.env.MONGODB_URI);
  await ensurePhoneIndexes(mongoose.connection.db);
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log('NS FITNESS API listening on port', port));
} catch (error) {
  if (error.code === 11000) console.error('Phone index setup failed: existing records have duplicate or missing numbers. Run node backend/src/migratePhones.js from the project root for a read-only check.');
  else if (error.code === 13) console.error('Database startup failed: the database account needs permission to manage indexes on users and members.');
  else console.error('Database startup failed. Check MONGODB_URI, database credentials, and network access.');
  await mongoose.disconnect();
  process.exitCode = 1;
}
