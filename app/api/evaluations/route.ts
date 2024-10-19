import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Handle GET requests to fetch evaluations for a specific user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const modelName = searchParams.get('model_name'); // Keep as 'model_name' for query parameter
  const timeRange = searchParams.get('timeRange') || 'day';

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required.' },
      { status: 400 }
    );
  }

  if (!modelName) { // Check for combined model_name
    return NextResponse.json(
      { error: 'Model name is required.' },
      { status: 400 }
    );
  }

  try {
    const db = await connectToDatabase();
    
    // Calculate the start date based on the time range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to last day
    }

    const evaluations = await db
      .collection('evaluation_results')
      .find({
        username,
        modelName: modelName,
        evaluatedAt: { $gte: startDate }
      })
      .sort({ evaluatedAt: -1 }) // Optional: Sort by most recent
      .toArray();

    return NextResponse.json({ evaluations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations.' },
      { status: 500 }
    );
  }
}
