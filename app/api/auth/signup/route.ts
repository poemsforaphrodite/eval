import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('llm_evaluation_system');
  const users = db.collection('users');

  // Check if user already exists
  const existingUser = await users.findOne({ username });
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  // Hash password and create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  await users.insertOne({ username, password: hashedPassword });

  return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
}