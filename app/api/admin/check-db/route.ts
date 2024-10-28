import { NextResponse } from 'next/server';
import { isDatabaseConnected } from '@/lib/mongodb';

export async function GET() {
  try {
    const connected = await isDatabaseConnected();
    return NextResponse.json({ connected }, { status: 200 });
  } catch (error) {
    console.error('Error checking database connection:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
