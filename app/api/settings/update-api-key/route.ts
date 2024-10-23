import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const usernameCookie = cookieStore.get('username');
  
  if (!usernameCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db('llm_evaluation_system');
  const users = db.collection('users');

  // Find user by username
  const user = await users.findOne({ username: usernameCookie.value });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { openai_api_key } = await request.json();

  if (!openai_api_key) {
    return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
  }

  await users.updateOne(
    { username: usernameCookie.value },
    { $set: { openai_api_key } }
  );

  return NextResponse.json({ message: 'API key updated successfully' }, { status: 200 });
}
