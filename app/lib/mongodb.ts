import { MongoClient, Db, Document } from 'mongodb';
import crypto from 'crypto';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
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

// Update this function to include isAdmin in the user object
export async function createUser(username: string, hashedPassword: string, apiKey: string, isAdmin: boolean): Promise<void> {
  const db = await getDatabase();
  const users = db.collection('users');
  await users.insertOne({ username, password: hashedPassword, apiKey, isAdmin });
}


// Add this new function
export async function getUserApiKey(username: string): Promise<string | null> {
  const db = await getDatabase();
  const users = db.collection('users');
  const user = await users.findOne({ username }, { projection: { apiKey: 1 } });
  return user ? user.apiKey : null;
}

// Add this new function to check database connection
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    const client = await clientPromise;
    // Ping the database to check connection
    await client.db().command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
