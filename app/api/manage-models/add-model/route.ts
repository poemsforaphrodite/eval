import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { username, modelName, modelType, hfEndpoint, hfToken } = await request.json();

    // Logging incoming data
    console.log('Received Model Addition Request:', {
      username,
      modelName,
      modelType,
      hfEndpoint,
      hfToken,
    });

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated.' },
        { status: 401 }
      );
    }

    if (!modelName || !modelType) {
      return NextResponse.json(
        { success: false, message: 'Model name and type are required.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const modelId = `${username}_model_${Date.now()}`;

    const modelData: any = {
      model_id: modelId,
      model_name: modelName,
      model_type: modelType, // This will now be 'simple', 'custom', or 'huggingface'
      file_path: null,
      model_link: modelType === 'huggingface' ? hfEndpoint : null,
      uploaded_at: new Date(),
    };

    if (modelType === 'huggingface') {
      if (!hfToken) {
        return NextResponse.json(
          { success: false, message: 'Hugging Face API Token is required.' },
          { status: 400 }
        );
      }
      modelData['model_api_token'] = hfToken;
    }

    const result = await usersCollection.updateOne(
      { username: username },
      { $push: { models: modelData } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({
        success: true,
        message: `Model '${modelName}' added successfully as ${modelId}!`,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to add model. User not found or database error.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding model:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while adding the model.' },
      { status: 500 }
    );
  }
}