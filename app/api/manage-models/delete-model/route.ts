import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function DELETE(request: Request) {
  try {
    const { username, modelId } = await request.json();

    if (!username || !modelId) {
      return NextResponse.json({ success: false, message: 'Username and model ID are required.' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { username },
      { $pull: { models: { model_id: modelId } } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true, message: 'Model deleted successfully.' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to delete model.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json({ success: false, message: 'An error occurred while deleting the model.' }, { status: 500 });
  }
}