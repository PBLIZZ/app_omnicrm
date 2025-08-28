import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { notes } from '@/server/db/schema';
import { getServerUserId } from '@/server/auth/user';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId();
    
    const { id: contactId } = await params;
    const body = await request.json();
    const { content } = body;
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    const newNote = await db.insert(notes).values({
      contactId,
      userId,
      content: content.trim()
    }).returning();

    return NextResponse.json(newNote[0]);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' }, 
      { status: 500 }
    );
  }
}