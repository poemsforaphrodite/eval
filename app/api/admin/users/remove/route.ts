import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId from mongodb

export async function DELETE(request: Request) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    client = await clientPromise;
    const db = client.db('llm_evaluation_system');
    const users = db.collection('users');

    const result = await users.deleteOne({ _id: new ObjectId(userId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add cache control headers to prevent caching
    return new NextResponse(
      JSON.stringify({ message: 'User removed successfully' }), 
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
    console.error('Error removing user:', error);
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
