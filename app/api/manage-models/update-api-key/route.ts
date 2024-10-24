import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { username, modelId, apiKey } = await request.json();

    if (!username || !modelId || !apiKey) {
      return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { username, 'models.model_id': modelId },
      { $set: { 'models.$.api_key': apiKey } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true, message: 'API key updated successfully.' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to update API key.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ success: false, message: 'An error occurred while updating the API key.' }, { status: 500 });
  }
}