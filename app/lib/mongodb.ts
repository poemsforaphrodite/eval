import { MongoClient, Db, Document } from 'mongodb';
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

// Update this function to include isAdmin in the user object
export async function createUser(username: string, hashedPassword: string, apiKey: string, isAdmin: boolean): Promise<void> {
  const db = await getDatabase();
  const users = db.collection('users');
  await users.insertOne({ username, password: hashedPassword, apiKey, isAdmin });
}

// Add this new function to get users from MongoDB
export async function getUsers(): Promise<Document[]> {
  const db = await getDatabase();
  const users = db.collection('users');
  
  // Fetch all users, excluding the password field
  return users.find({}, { projection: { password: 0 } }).toArray();
}

// Add this new function
export async function getUserApiKey(username: string): Promise<string | null> {
  const db = await getDatabase();
  const users = db.collection('users');
  const user = await users.findOne({ username }, { projection: { apiKey: 1 } });
  return user ? user.apiKey : null;
}
