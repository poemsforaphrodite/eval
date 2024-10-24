import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI  // Updated to use environment variable
);

export async function POST(req: Request) {
  try {
    // Generate OAuth URL
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Error in Google login:", error);
    return NextResponse.json(
      { error: 'Google login failed' },
      { status: 500 }
    );
  }
}
