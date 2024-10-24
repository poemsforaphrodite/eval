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

  const user = await users.findOne({ username });
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (passwordMatch) {
    return NextResponse.json({ message: 'Login successful', username: user.username }, { status: 200 });
  }
  // TODO: Generate and return a JWT token for authentication

  return NextResponse.json({ message: 'Login successful' }, { status: 200 });
}