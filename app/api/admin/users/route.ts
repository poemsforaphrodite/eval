import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const users = await db.collection('users')
      .find({})
      .project({ username: 1, isAdmin: 1 })
      .toArray();

    // Convert _id to string for serialization
    const usersWithId = users.map((user: any) => ({
      ...user,
      _id: user._id.toString(),
    }));

    return NextResponse.json({ users: usersWithId }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
