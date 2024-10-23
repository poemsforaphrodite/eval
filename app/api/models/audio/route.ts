// ... existing imports ...
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Readable } from 'stream';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Add function to get user's OpenAI API key
async function getUserOpenAIKey(username: string) {
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ username });
  return user?.openai_api_key;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function transcribeAudio(audioBuffer: Buffer, openaiApiKey: string): Promise<string> {
  const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
  
  try {
    // Write buffer to temporary file
    await fs.promises.writeFile(tempFilePath, audioBuffer);

    // Create a read stream from the temporary file
    const fileStream = fs.createReadStream(tempFilePath);

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
    });

    return transcription.text;
  } finally {
    // Clean up: delete the temporary file
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (error) {
      console.error('Error deleting temporary file:', error);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const username = formData.get('username') as string;
    const modelName = formData.get('modelName') as string;
    
    // Get user's OpenAI API key
    const openaiApiKey = await getUserOpenAIKey(username);
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found for user.' },
        { status: 400 }
      );
    }

    const promptType = formData.get('promptType') as string;
    const contextType = formData.get('contextType') as string;
    const responseType = formData.get('responseType') as string;

    const promptAudio = formData.get('promptAudio') as File | null;
    const contextAudio = formData.get('contextAudio') as File | null;
    const responseAudio = formData.get('responseAudio') as File | null;

    const promptText = formData.get('promptText') as string | null;
    const contextText = formData.get('contextText') as string | null;
    const responseText = formData.get('responseText') as string | null;

    if (!username || !modelName) {
      return NextResponse.json(
        { error: 'Missing required fields: username or modelName.' },
        { status: 400 }
      );
    }

    let prompt, context, response;

    // Handle prompt
    if (promptType === 'audio' && promptAudio) {
      const promptBuffer = Buffer.from(await promptAudio.arrayBuffer());
      prompt = await transcribeAudio(promptBuffer, openaiApiKey);
    } else if (promptType === 'text' && promptText) {
      prompt = promptText;
    } else {
      return NextResponse.json(
        { error: 'Invalid prompt data.' },
        { status: 400 }
      );
    }

    // Handle context
    if (contextType === 'audio' && contextAudio) {
      const contextBuffer = Buffer.from(await contextAudio.arrayBuffer());
      context = await transcribeAudio(contextBuffer, openaiApiKey);
    } else if (contextType === 'text' && contextText) {
      context = contextText;
    } else {
      return NextResponse.json(
        { error: 'Invalid context data.' },
        { status: 400 }
      );
    }

    // Handle response
    if (responseType === 'audio' && responseAudio) {
      const responseBuffer = Buffer.from(await responseAudio.arrayBuffer());
      response = await transcribeAudio(responseBuffer, openaiApiKey);
    } else if (responseType === 'text' && responseText) {
      response = responseText;
    } else {
      return NextResponse.json(
        { error: 'Invalid response data.' },
        { status: 400 }
      );
    }

    // Prepare the transcribed data to send to the simple model's evaluation endpoint
    const evaluationData = {
      username,
      modelName,
      testData: [{ prompt, context, response }]
    };

    // Send transcribed data to the simple route for evaluation
    const evaluationResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/models/simple`, evaluationData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(evaluationResponse.data, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST function:', error);
    return NextResponse.json(
      { error: 'Failed to process the audio evaluation request.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
