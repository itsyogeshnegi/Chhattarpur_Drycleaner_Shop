import dns from 'node:dns';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alharamdrycleaners2023_db_user:XPcjz9Z1Rnb0M3ia@cluster0.bqskbaa.mongodb.net/alharam_drycleaners?retryWrites=true&w=majority';
const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Node.js c-ares on Windows sometimes falls back to ['127.0.0.1'] when reading system DNS,
 * causing `mongodb+srv://` lookups to fail with `querySrv ECONNREFUSED`.
 */
function configurePublicDnsIfLoopback(): boolean {
  const servers = dns.getServers();
  const isLoopbackOnly =
    servers.length === 0 ||
    servers.every((addr) => addr.startsWith('127.') || addr === '::1');

  if (isLoopbackOnly) {
    dns.setServers(PUBLIC_DNS_SERVERS);
    return true;
  }
  return false;
}

function isSrvDnsFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { syscall?: string; code?: string; message?: string };
  return (
    record.syscall === 'querySrv' ||
    (typeof record.message === 'string' && record.message.includes('querySrv'))
  );
}

/**
 * Returns true if the error indicates a transient MongoDB/DNS connectivity failure
 * so API routes can return a safe 503 response without exposing internal cluster hostnames.
 */
export function isDatabaseConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { name?: string; code?: string; syscall?: string; message?: string };
  const msg = record.message || '';
  return (
    isSrvDnsFailure(err) ||
    record.name === 'MongooseServerSelectionError' ||
    record.name === 'MongoNetworkError' ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEOUT')
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      configurePublicDnsIfLoopback();
    }

    cached!.promise = mongoose.connect(MONGODB_URI, opts).catch(async (err) => {
      // Retry once with public DNS if the configured router/ISP DNS refused SRV queries
      if (MONGODB_URI.startsWith('mongodb+srv://') && isSrvDnsFailure(err)) {
        dns.setServers(PUBLIC_DNS_SERVERS);
        return mongoose.connect(MONGODB_URI, opts);
      }
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

