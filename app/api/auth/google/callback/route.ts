import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI  // Updated to use environment variable
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No code provided');
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info
    const userinfo = await client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const email = userinfo.data.email;

    // Store in MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db("llm_evaluation_system");
    
    // Check if user exists
    let user = await db.collection('users').findOne({ username: email });
    
    if (!user) {
      // Create new user
      const apiKey = crypto.randomBytes(32).toString('hex');
      await db.collection('users').insertOne({
        username: email,
        apiKey,
        isAdmin: false
      });
    }

    // Set cookie and redirect directly to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', req.url));
    response.cookies.set('username', email, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;

  } catch (error) {
    console.error("Error in Google callback:", error);
    return NextResponse.redirect(new URL('/login?error=GoogleAuthFailed', req.url));
  }
}
