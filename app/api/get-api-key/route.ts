import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('llm_evaluation_system');
    const users = db.collection('users');

    const user = await users.findOne({ username });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, apiKey: user.apiKey });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch API key' }, { status: 500 });
  }
}
