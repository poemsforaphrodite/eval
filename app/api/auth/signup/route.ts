import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import { generateApiKey } from '@/lib/mongodb';

export async function POST(request: Request) {
  const { username, password, isAdmin, openai_api_key } = await request.json();

  if (!username || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
  }

  if (!openai_api_key) {
    return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('llm_evaluation_system');
  const users = db.collection('users');

  // Check if user already exists
  const existingUser = await users.findOne({ username });
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  // Generate API key
  const apiKey = generateApiKey();

  // Hash password and create new user with API key, isAdmin flag, and OpenAI API key
  const hashedPassword = await bcrypt.hash(password, 10);
  await users.insertOne({ 
    username, 
    password: hashedPassword, 
    apiKey, 
    isAdmin: !!isAdmin,
    openai_api_key 
  });

  return NextResponse.json({ message: 'User created successfully', apiKey }, { status: 201 });
}
