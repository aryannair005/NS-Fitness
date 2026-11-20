import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import { connectDatabase } from './config/db.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
let databaseConnected = false;
try {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  let problem;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) problem = 'Set a valid ADMIN_EMAIL in backend/.env.';
  else if (!password || [...password].length < 12) problem = 'ADMIN_PASSWORD must contain at least 12 characters.';
  else if (Buffer.byteLength(password) > 72) problem = 'ADMIN_PASSWORD exceeds 72 UTF-8 bytes.';
  else if (!process.env.MONGODB_URI) problem = 'Set MONGODB_URI in backend/.env.';
  if (problem) throw new TypeError(problem);
  await connectDatabase(process.env.MONGODB_URI);
  databaseConnected = true;
  await User.init();
  await User.create({ email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) });
  console.log('Admin account created.');
} catch (error) {
  if (error instanceof TypeError && /^(Set |ADMIN_PASSWORD)/.test(error.message)) console.error(error.message);
  else if (error.code === 11000) console.error('Email already exists.');
  else if (!databaseConnected) console.error('MongoDB connection failed. Check the URI, database credentials, and Atlas network access.');
  else console.error('Could not save the admin account. Check database write permissions and indexes.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
