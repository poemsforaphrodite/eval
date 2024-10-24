import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Define the expected structure of userinfo.data
interface UserInfo {
  email: string;
}

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
    const userinfo = await client.request<UserInfo>({
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

    // Set cookies and redirect to dashboard
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; // Ensure this is set in your environment variables
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.set('username', email, { path: '/' });
    return response;

  } catch (error) {
    console.error("Error in Google callback:", error);
    return NextResponse.json(
      { error: 'Google login failed' },
      { status: 500 }
    );
  }
}
