import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { connectToDatabase } from '../../lib/mongodb';

// Add function to get user's OpenAI API key
async function getUserOpenAIKey(username: string) {
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ username });
  return user?.openai_api_key;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const username = formData.get('username') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Get user's OpenAI API key
    const openaiApiKey = await getUserOpenAIKey(username);
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found for user.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI with user's API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp_audio_${Date.now()}.wav`);

    // Write the file content to the temporary file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);

    // Transcribe the audio using OpenAI's Whisper model
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      response_format: 'text',
    });

    // Remove the temporary file
    fs.unlinkSync(tempFilePath);

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
