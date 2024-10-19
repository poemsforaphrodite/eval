import { MongoClient, Db } from 'mongodb';
import crypto from 'crypto';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // Use a global variable to preserve the client across module reloads during development
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production, create a new client for each connection
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

// Add this new function
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('llm_evaluation_system');
}

// Add this new function
export async function connectToDatabase(): Promise<Db> {
  return getDatabase();
}

// Update this function to generate API keys without database interaction
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
