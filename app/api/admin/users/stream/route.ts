import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ChangeStream } from 'mongodb';

export async function GET() {
  const encoder = new TextEncoder();
  let changeStream: ChangeStream | undefined;

  try {
    const client = await clientPromise;
    const db = client.db('llm_evaluation_system');
    const users = db.collection('users');

    // Create a transform stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Initial fetch of all users
    const initialUsers = await users.find({}, { projection: { password: 0 } }).toArray();
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'initial', users: initialUsers })}\n\n`));

    // Set up change stream
    changeStream = users.watch([], { fullDocument: 'updateLookup' });
    
    // Handle change events
    changeStream.on('change', async (change) => {
      // Fetch fresh user list after any change
      const updatedUsers = await users.find({}, { projection: { password: 0 } }).toArray();
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'update', users: updatedUsers })}\n\n`));
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
