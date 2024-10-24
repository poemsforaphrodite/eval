import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db("llm_evaluation_system");
    
    // Here you would normally get the email from Google OAuth
    // For now, we'll create a user with a random email for testing
    const email = `user_${Date.now()}@example.com`;
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({ 
      username: email 
    });
    
    if (!existingUser) {
      // Create new user if doesn't exist
      const apiKey = crypto.randomBytes(32).toString('hex');
      await db.collection('users').insertOne({
        username: email,
        apiKey,
        isAdmin: false
      });
    }

    return NextResponse.json({ 
      email,
      success: true 
    });
  } catch (error) {
    console.error("Error in Google auth:", error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
