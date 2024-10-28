import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing evaluation ID' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('evaluation_results').deleteOne({
      _id: new ObjectId(id)  // Convert string ID to ObjectId
    });
    
    console.log('Delete result:', result);

    if (result.deletedCount === 1) {
      return NextResponse.json({ 
        success: true, 
        message: 'Evaluation deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Evaluation not found' 
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error deleting evaluation:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
