import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    // Logging incoming request
    console.log('Received Get Models Request for Username:', username);

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const models = user.models || [];
    //console.log('Models:', models);
    return NextResponse.json(
      { success: true, models },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while fetching models.' },
      { status: 500 }
    );
  }
}
