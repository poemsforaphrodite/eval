import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  let client;
  try {
    client = await clientPromise;
    const db = client.db('llm_evaluation_system');
    const users = await db.collection('users')
      .find({})
      .project({ password: 0 })
      .toArray();

    // Add cache control headers to prevent caching
    return new NextResponse(
      JSON.stringify(users), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
